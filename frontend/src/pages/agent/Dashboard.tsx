import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api";
import toast from "react-hot-toast";
import { Briefcase, CheckCircle, Clock, WifiOff, ShieldCheck, ArrowRight, RefreshCw, Upload, XCircle } from "lucide-react";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ASSIGNED: "bg-blue-100 text-blue-800",
  ON_THEWAY: "bg-purple-100 text-purple-800",
  IN_PROGRESS: "bg-orange-100 text-orange-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function AgentDashboard() {
  const navigate = useNavigate();
  const [pendingJobs, setPendingJobs] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [uploadingDoc, setUploadingDoc] = useState<number | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = () => {
    setCooldownLeft(30);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldownLeft((p) => { if (p <= 1) { clearInterval(cooldownRef.current!); cooldownRef.current = null; return 0; } return p - 1; });
    }, 1000);
  };
  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    Promise.all([
      api.get("/agents/jobs/pending"),
      api.get("/agents/jobs?status=ON_THEWAY"),
      api.get("/agents/jobs?status=IN_PROGRESS"),
      api.get("/agents/profile"),
      api.get("/agents/categories"),
      api.get("/agents/notifications"),
    ]).then(([p, ot, ip, pr, cats, notifs]) => {
      setPendingJobs(p.data.jobs);
      setActiveJobs([...ot.data.jobs, ...ip.data.jobs]);
      setProfile(pr.data.agent);
      setCategories(cats.data.categories || []);
      setDocuments(cats.data.documents || []);
      setNotifications((notifs.data.notifications || []).slice(0, 4));
    }).catch(() => {}).finally(() => { setRefreshing(false); startCooldown(); });
  };

  const load = () => {
    Promise.all([
      api.get("/agents/jobs/pending"),
      api.get("/agents/jobs?status=ON_THEWAY"),
      api.get("/agents/jobs?status=IN_PROGRESS"),
      api.get("/agents/profile"),
      api.get("/agents/categories"),
      api.get("/agents/notifications"),
    ]).then(([p, ot, ip, pr, cats, notifs]) => {
      const agentProfile = pr.data.agent;
      const agentCategories = cats.data.categories || [];
      const agentDocuments = cats.data.documents || [];

      // Check for incomplete onboarding: no categories selected
      if (!agentCategories || agentCategories.length === 0) {
        toast("Let's finish setting up your profile!", { icon: "📋" });
        navigate("/register", { state: { resumeStep: 1 } });
        return;
      }

      // Check for incomplete onboarding: missing required documents
      const requiredReqIds = new Set<number>();
      for (const ac of agentCategories) {
        const reqs = ac.category?.documentRequirements ?? [];
        for (const req of reqs) {
          if (req.isRequired) requiredReqIds.add(req.id);
        }
      }
      const uploadedReqIds = new Set<number>(
        agentDocuments.filter((d: any) => d.status !== "REJECTED").map((d: any) => d.requirementId)
      );
      const missingDocs = [...requiredReqIds].some((id) => !uploadedReqIds.has(id));
      if (missingDocs) {
        toast("Please upload required documents to continue", { icon: "📋" });
        navigate("/register", { state: { resumeStep: 2 } });
        return;
      }

      setPendingJobs(p.data.jobs);
      setActiveJobs([...ot.data.jobs, ...ip.data.jobs]);
      setProfile(agentProfile);
      setCategories(agentCategories);
      setDocuments(agentDocuments);
      setNotifications((notifs.data.notifications || []).slice(0, 4));
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!profile?.isAvailable || !profile?.isVerified) return;
    const interval = setInterval(() => {
      Promise.all([
        api.get("/agents/jobs/pending"),
        api.get("/agents/jobs?status=ON_THEWAY"),
        api.get("/agents/jobs?status=IN_PROGRESS"),
      ]).then(([p, ot, ip]) => {
        setPendingJobs(p.data.jobs);
        setActiveJobs([...ot.data.jobs, ...ip.data.jobs]);
      }).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [profile?.isAvailable, profile?.isVerified]);

  const toggleAvailability = async () => {
    setToggling(true);
    try {
      const r = await api.patch("/agents/availability");
      toast.success(r.data.isAvailable ? "You're online now!" : "You're offline now");
      load();
    } catch (err: any) { toast.error(err.response?.data?.error || "Failed to toggle"); }
    finally { setToggling(false); }
  };

  const acceptJob = async (orderId: number) => {
    try {
      await api.patch(`/agents/jobs/${orderId}/accept`);
      toast.success("Job accepted!");
      load();
    } catch (err: any) { toast.error(err.response?.data?.error || "Failed"); }
  };

  const declineJob = async (orderId: number) => {
    try {
      await api.patch(`/agents/jobs/${orderId}/decline`);
      toast.success("Job declined");
      load();
    } catch (err: any) { toast.error(err.response?.data?.error || "Failed"); }
  };

  const handleDocUpload = async (requirementId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPEG, PNG and WebP images allowed"); return;
    }
    setUploadingDoc(requirementId);
    try {
      const fd = new FormData();
      fd.append("document", file);
      await api.post(`/agents/documents/${requirementId}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Document uploaded!");
      load();
    } catch (err: any) { toast.error(err.response?.data?.error || "Upload failed"); }
    finally { setUploadingDoc(null); }
  };

  if (loading) return <div className="flex items-center justify-center h-[70vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" /></div>;

  // ─── NOT VERIFIED ─────────────────────────────────
  if (!profile?.isVerified) {
    const verifiedCats = categories.filter((c: any) => c.isVerified);

    // Collect all doc requirements with status from the documents
    const allDocs = documents.map((d: any) => ({
      ...d,
      categoryName: d.requirement?.category?.name,
    }));

    return (
      <div className="px-4 lg:px-6 py-4 pb-20 md:pb-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <ShieldCheck size={40} className="mx-auto text-amber-500 mb-3" />
            <h1 className="text-xl font-bold text-gray-900 mb-1">Verification Status</h1>
            <p className="text-gray-500 text-sm">
              {verifiedCats.length === 0 ? "Your account is under review." : `${verifiedCats.length} of ${categories.length} categories verified.`}
            </p>
          </div>

          {/* Category Status */}
          {categories.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Your Categories</h3>
              <div className="space-y-2">
                {categories.map((ac: any) => (
                  <div key={ac.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-900 capitalize">{ac.category?.name}</span>
                    {ac.isVerified ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold flex items-center gap-1">
                        <CheckCircle size={10} /> Verified
                      </span>
                    ) : ac.rejectionNote ? (
                      <div className="text-right">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold flex items-center gap-1">
                          <XCircle size={10} /> Rejected
                        </span>
                        <p className="text-[9px] text-red-500 mt-0.5">{ac.rejectionNote}</p>
                      </div>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-semibold flex items-center gap-1">
                        <Clock size={10} /> Pending
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents with retry for rejected */}
          {allDocs.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Your Documents</h3>
              <div className="space-y-2">
                {allDocs.map((doc: any) => (
                  <div key={doc.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-700">{doc.requirement?.name || "Document"}</p>
                        <p className="text-[10px] text-gray-400">{doc.categoryName}</p>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        doc.status === "APPROVED" ? "bg-green-100 text-green-700" :
                        doc.status === "REJECTED" ? "bg-red-100 text-red-600" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>{doc.status}</span>
                    </div>
                    {doc.url && <img src={doc.url} alt="" className="mt-2 w-full h-16 object-cover rounded" />}
                    {doc.rejectionNote && <p className="text-[10px] text-red-500 mt-1">{doc.rejectionNote}</p>}
                    {doc.status === "REJECTED" && (
                      <label className="mt-2 flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-900 text-white rounded-full text-[10px] font-semibold cursor-pointer hover:bg-gray-800 transition-all">
                        {uploadingDoc === doc.requirementId ? "Uploading..." : <><Upload size={10} /> Re-upload</>}
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                          onChange={(e) => handleDocUpload(doc.requirementId, e)} disabled={uploadingDoc === doc.requirementId} />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {notifications.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Latest Notifications</h3>
              <div className="space-y-2">
                {notifications.map((n: any) => (
                  <div key={n.id} className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-xs font-medium text-gray-800">{n.message}</p>
                    {n.description && <p className="text-[11px] text-gray-500 mt-0.5">{n.description}</p>}
                  </div>
                ))}
              </div>
              <Link to="/agent/notifications" className="inline-block mt-2 text-xs text-gray-900 font-semibold hover:underline">
                View all notifications
              </Link>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <Clock size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-900 text-sm">While you wait</p>
                <p className="text-xs text-amber-700 mt-0.5">Make sure your profile and bank details are complete.</p>
              </div>
            </div>
          </div>
          <Link to="/agent/profile"
            className="w-full inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-gray-900 text-white rounded-full text-sm font-semibold hover:bg-gray-800 active:scale-[0.97] transition-all shadow-sm">
            Complete Profile <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  // ─── OFFLINE STATE ────────────────────────────────
  if (!profile?.isAvailable) {
    return (
      <div className="px-4 lg:px-6 py-4 pb-20 md:pb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
            <p className="text-xs text-gray-500 capitalize">
              {categories.filter((c: any) => c.isVerified).map((c: any) => c.category?.name).join(", ") || profile?.type}
              {profile?.rating > 0 ? ` · ★ ${profile.rating}/5` : ""}
            </p>
          </div>
          <button onClick={toggleAvailability} disabled={toggling}
            className="relative w-25 h-10 rounded-full bg-gray-200 transition-colors duration-300 cursor-pointer">
            <div className="absolute top-1 left-1 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center transition-all duration-300">
              <WifiOff size={14} className="text-gray-400" />
            </div>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 uppercase">Off</span>
          </button>
        </div>

        <div className="flex flex-col items-center justify-center py-16">
          <WifiOff size={48} className="text-gray-300 mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">You're Offline</h2>
          <p className="text-gray-500 text-sm text-center max-w-xs mb-6">
            You won't receive new jobs while offline. Go online to start accepting.
          </p>
          <button onClick={toggleAvailability} disabled={toggling}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-full font-semibold text-sm hover:bg-emerald-700 active:scale-[0.97] transition-all shadow-sm flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Go Online
          </button>
        </div>
      </div>
    );
  }

  // ─── ONLINE / NORMAL DASHBOARD ────────────────────
  return (
    <div className="px-4 lg:px-6 py-4 pb-20 md:pb-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
            <p className="text-xs text-gray-500 capitalize">
              {categories.filter((c: any) => c.isVerified).map((c: any) => c.category?.name).join(", ") || profile?.type}
              {profile?.rating > 0 ? ` · ★ ${profile.rating}/5` : ""}
            </p>
          </div>
          <button onClick={toggleAvailability} disabled={toggling}
            className="relative w-25 h-10 rounded-full bg-emerald-500 transition-colors duration-300 cursor-pointer">
            <div className="absolute top-1 right-1 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center transition-all duration-300">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white uppercase">On</span>
          </button>
        </div>
        <button onClick={handleRefresh} disabled={refreshing || cooldownLeft > 0}
          className={`p-1.5 rounded-md transition flex items-center gap-1 ${refreshing ? "text-gray-500" : cooldownLeft > 0 ? "text-gray-300 cursor-not-allowed" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"}`} title={refreshing ? "Refreshing…" : cooldownLeft > 0 ? `Wait ${cooldownLeft}s` : "Refresh"}>
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          {cooldownLeft > 0 && !refreshing && <span className="text-[10px] font-medium text-gray-400">{cooldownLeft}s</span>}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-gray-500 uppercase">Pending</span>
            <Clock size={13} className="text-yellow-500" />
          </div>
          <p className="text-xl font-bold text-gray-900">{pendingJobs.length}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-gray-500 uppercase">Active</span>
            <Briefcase size={13} className="text-blue-500" />
          </div>
          <p className="text-xl font-bold text-gray-900">{activeJobs.length}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-gray-500 uppercase">Rating</span>
            <CheckCircle size={13} className="text-green-500" />
          </div>
          <p className="text-xl font-bold text-gray-900">{profile?.rating > 0 ? `${profile.rating}` : "—"}</p>
        </div>
      </div>

      {/* Pending Jobs */}
      <h2 className="text-sm font-semibold text-gray-900 mb-2">Pending Jobs</h2>
      {pendingJobs.length === 0 ? (
        <div className="text-center py-6 bg-white rounded-lg border border-gray-200 mb-4">
          <p className="text-gray-400 text-sm">No pending jobs right now</p>
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {pendingJobs.map((job) => (
            <div key={job.id} className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex justify-between items-start mb-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-gray-900">{job.name || "Service Order"}</p>
                  <p className="text-xs text-gray-500 truncate">{job.addressUser?.address}, {job.addressUser?.city}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{job.user?.email}</p>
                </div>
                <p className="font-bold text-sm text-amber-600 shrink-0 ml-2">₹{job.totalPrice}</p>
              </div>
              <div className="text-xs text-gray-500 mb-2 bg-gray-50 rounded px-2 py-1.5">
                {(() => {
                  const grouped = (job.orders || []).reduce((acc: any[], o: any) => {
                    const existing = acc.find((g: any) => g.name === o.subservice?.name);
                    const qty = o.subservice?.price ? Math.round((o.serviceCharge || o.subservice.price) / o.subservice.price) : 1;
                    if (existing) existing.qty += qty;
                    else acc.push({ name: o.subservice?.name, qty });
                    return acc;
                  }, []);
                  return grouped.map((g: any) => g.qty > 1 ? `${g.name} × ${g.qty}` : g.name).join(" · ");
                })()}
              </div>
              <div className="flex gap-2">
                <button onClick={() => acceptJob(job.id)} className="flex-1 bg-emerald-600 text-white py-2 rounded-full text-xs font-semibold hover:bg-emerald-700 active:scale-[0.97] transition-all shadow-sm">
                  Accept
                </button>
                <button onClick={() => declineJob(job.id)} className="flex-1 bg-red-50 text-red-600 py-2 rounded-full text-xs font-semibold hover:bg-red-100 border border-red-200 active:scale-[0.97] transition-all">
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Jobs */}
      <h2 className="text-sm font-semibold text-gray-900 mb-2">Active Jobs</h2>
      {activeJobs.length === 0 ? (
        <div className="text-center py-6 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-400 text-sm">No active jobs</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeJobs.map((job) => (
            <Link key={job.id} to={`/agent/jobs/${job.id}`}
              className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition group">
              <div className="min-w-0">
                <p className="font-medium text-sm text-gray-900">{job.name || "Service Order"}</p>
                <p className="text-xs text-gray-500 truncate">{job.addressUser?.address}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${statusColors[job.status]}`}>
                  {job.status.replace("_", " ")}
                </span>
                <span className="font-semibold text-sm text-amber-600">₹{job.totalPrice}</span>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-500 transition" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
