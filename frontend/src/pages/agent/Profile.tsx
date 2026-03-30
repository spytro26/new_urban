import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import toast from "react-hot-toast";
import {
  User,
  MapPin,
  Star,
  ShieldCheck,
  ShieldX,
  Landmark,
  Edit3,
  Save,
  Upload,
  Eye,
  X,
} from "lucide-react";

export default function AgentProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [bankForm, setBankForm] = useState({
    accountNumber: "",
    holderName: "",
    ifscCode: "",
    bankName: "",
  });
  const [loading, setLoading] = useState(true);
  const [editingBank, setEditingBank] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingReq, setUploadingReq] = useState<number | null>(null);
  const [docFilter, setDocFilter] = useState<"needs-action" | "all">("needs-action");
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const MAX_RESUBMITS = 5;

  const load = () => {
    setLoading(true);
    Promise.all([api.get("/agents/profile"), api.get("/agents/categories")])
      .then(([p, c]) => {
        const agent = p.data.agent;
        setProfile(agent);
        setCategories(c.data.categories || []);
        setDocuments(c.data.documents || []);

        if (agent.bankDetails) {
          setBankForm({
            accountNumber: agent.bankDetails.accountNumber,
            holderName: agent.bankDetails.holderName,
            ifscCode: agent.bankDetails.ifscCode,
            bankName: agent.bankDetails.bankName,
          });
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const saveBankDetails = async () => {
    setSaving(true);
    try {
      await api.put("/agents/bank-details", bankForm);
      toast.success("Bank details saved!");
      setEditingBank(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleReupload = async (
    requirementId: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPEG, PNG and WebP images are allowed");
      return;
    }

    setUploadingReq(requirementId);
    try {
      const fd = new FormData();
      fd.append("document", file);
      await api.post(`/agents/documents/${requirementId}`, fd);
      toast.success("Document re-submitted successfully");
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Upload failed");
    } finally {
      setUploadingReq(null);
    }
  };

  const getInitials = (name: string) => {
    if (name)
      return name
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    return "AG";
  };

  const categorySummary = useMemo(() => {
    const approved = categories.filter((c) => c.isVerified).length;
    const rejected = categories.filter((c) => !c.isVerified && !!c.rejectionNote).length;
    const pending = categories.filter((c) => !c.isVerified && !c.rejectionNote).length;
    return { approved, rejected, pending };
  }, [categories]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
      </div>
    );

  return (
    <div className="px-4 lg:px-6 py-4 pb-20 md:pb-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0">
            {getInitials(profile?.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-gray-900 truncate">
              {profile?.name || "Agent"}
            </h1>
            <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Approved: {categorySummary.approved} · Rejected: {categorySummary.rejected} · Pending: {categorySummary.pending}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] bg-gray-100 px-2 py-0.5 rounded font-medium capitalize">
              {profile?.type?.toLowerCase()}
            </span>
            {profile?.isVerified ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-green-700 font-medium">
                <ShieldCheck size={11} /> Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-red-600 font-medium">
                <ShieldX size={11} /> Unverified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Category Status */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-3">
        <div className="px-4 py-2.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Category Verification</h2>
        </div>
        <div className="p-4 space-y-2">
          {categories.length === 0 ? (
            <p className="text-sm text-gray-400">No categories selected</p>
          ) : (
            categories.map((ac) => {
              const statusCls = ac.isVerified
                ? "bg-green-100 text-green-700"
                : ac.rejectionNote
                  ? "bg-red-100 text-red-600"
                  : "bg-yellow-100 text-yellow-700";

              const statusLabel = ac.isVerified
                ? "Approved"
                : ac.rejectionNote
                  ? "Rejected"
                  : "Pending";

              return (
                <div key={ac.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900">{ac.category?.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${statusCls}`}>
                      {statusLabel}
                    </span>
                  </div>
                  {ac.rejectionNote && (
                    <p className="text-[11px] text-red-600 mt-1">Admin remark: {ac.rejectionNote}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Documents per category */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-3">
        <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-gray-900">Documents by Category</h2>
          <div className="inline-flex rounded-full border border-gray-200 p-0.5">
            <button
              onClick={() => setDocFilter("needs-action")}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                docFilter === "needs-action"
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Needs re-upload
            </button>
            <button
              onClick={() => setDocFilter("all")}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                docFilter === "all"
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              All
            </button>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {categories
            .filter((ac) => {
              if (docFilter === "all") return true;
              const isRejectedCategory = !ac.isVerified && !!ac.rejectionNote;
              const requirements = ac.category?.documentRequirements || [];
              return requirements.some((req: any) => {
                const doc = documents.find((d: any) => d.requirementId === req.id);
                const attempts = doc?.resubmitCount ?? 0;
                const needsAction =
                  (doc?.status === "REJECTED" && attempts < MAX_RESUBMITS) ||
                  (isRejectedCategory && !doc);
                return needsAction;
              });
            })
            .map((ac) => {
            const isRejectedCategory = !ac.isVerified && !!ac.rejectionNote;
            const requirements = ac.category?.documentRequirements || [];
            const categoryNeedsReupload = requirements.some((req: any) => {
              const doc = documents.find((d: any) => d.requirementId === req.id);
              const attempts = doc?.resubmitCount ?? 0;
              return (
                (doc?.status === "REJECTED" && attempts < MAX_RESUBMITS) ||
                (isRejectedCategory && !doc)
              );
            });

            return (
              <div key={`cat-docs-${ac.id}`} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-900">{ac.category?.name}</p>
                  {isRejectedCategory && categoryNeedsReupload && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold">
                      Re-upload required
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {requirements.map((req: any) => {
                    const doc = documents.find((d: any) => d.requirementId === req.id);
                    const attempts = doc?.resubmitCount ?? 0;
                    const attemptsLeft = Math.max(0, MAX_RESUBMITS - attempts);
                    const canReupload =
                      (doc?.status === "REJECTED" && attempts < MAX_RESUBMITS) ||
                      (isRejectedCategory && !doc);

                    if (docFilter === "needs-action" && !canReupload) {
                      return null;
                    }

                    return (
                      <div key={req.id} className="bg-gray-50 rounded-md p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-gray-800">{req.name}</p>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              doc?.status === "APPROVED"
                                ? "bg-green-100 text-green-700"
                                : doc?.status === "REJECTED"
                                  ? "bg-red-100 text-red-600"
                                  : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {doc?.status || "PENDING"}
                          </span>
                        </div>

                        {doc?.url && (
                          <button
                            type="button"
                            className="mt-2 relative w-full rounded border border-gray-200 overflow-hidden"
                            onClick={() => setPreviewImg(doc.url)}
                          >
                            <img
                              src={doc.url}
                              alt={req.name}
                              className="h-16 sm:h-20 w-full object-cover"
                            />
                            <span className="absolute inset-0 bg-black/0 hover:bg-black/30 transition flex items-center justify-center">
                              <Eye size={16} className="text-white opacity-0 hover:opacity-100 transition" />
                            </span>
                          </button>
                        )}

                        {doc?.rejectionNote && (
                          <p className="text-[11px] text-red-600 mt-1">Admin remark: {doc.rejectionNote}</p>
                        )}

                        {doc?.status === "REJECTED" && (
                          <p className="text-[11px] text-gray-500 mt-1">
                            Re-upload attempts: {attempts}/{MAX_RESUBMITS}
                          </p>
                        )}

                        {canReupload && (
                          <label className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900 text-white text-[11px] font-semibold cursor-pointer hover:bg-gray-800 transition">
                            <Upload size={12} />
                            {uploadingReq === req.id
                              ? "Uploading..."
                              : attempts > 0
                                ? `Re-upload document (${attemptsLeft} left)`
                                : "Upload document"}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              disabled={uploadingReq === req.id}
                              onChange={(e) => handleReupload(req.id, e)}
                            />
                          </label>
                        )}

                        {doc?.status === "REJECTED" && attempts >= MAX_RESUBMITS && (
                          <p className="text-[11px] text-red-600 mt-1 font-medium">
                            Re-upload limit reached ({MAX_RESUBMITS}/{MAX_RESUBMITS}).
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {docFilter === "needs-action" &&
            categories.filter((ac) => {
              const isRejectedCategory = !ac.isVerified && !!ac.rejectionNote;
              const requirements = ac.category?.documentRequirements || [];
              return requirements.some((req: any) => {
                const doc = documents.find((d: any) => d.requirementId === req.id);
                const attempts = doc?.resubmitCount ?? 0;
                return (
                  (doc?.status === "REJECTED" && attempts < MAX_RESUBMITS) ||
                  (isRejectedCategory && !doc)
                );
              });
            }).length === 0 && (
              <p className="text-sm text-gray-400">No documents need re-upload right now.</p>
            )}
        </div>
      </div>

      {/* Personal Info */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-3">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
          <User size={14} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Personal Information</h2>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-gray-400 uppercase font-medium mb-0.5">Name</p>
              <p className="text-sm text-gray-900">{profile?.name}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase font-medium mb-0.5">Type</p>
              <p className="text-sm text-gray-900 capitalize">{profile?.type}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-gray-400 uppercase font-medium mb-0.5">Rating</p>
              <div className="flex items-center gap-1">
                <Star size={13} className="text-yellow-400" fill="currentColor" />
                <span className="text-sm text-gray-900">
                  {profile?.rating > 0 ? `${profile.rating}/5` : "None"}
                </span>
                {profile?.ratingCount > 0 && (
                  <span className="text-[11px] text-gray-400">({profile.ratingCount})</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase font-medium mb-0.5">Status</p>
              <span
                className={`inline-flex items-center gap-1 text-sm font-medium ${
                  profile?.isAvailable ? "text-green-600" : "text-gray-500"
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    profile?.isAvailable ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
                {profile?.isAvailable ? "Online" : "Offline"}
              </span>
            </div>
          </div>
          {profile?.address?.length > 0 && (
            <div>
              <p className="text-[11px] text-gray-400 uppercase font-medium mb-0.5">Address</p>
              <div className="flex items-start gap-1.5">
                <MapPin size={12} className="text-gray-400 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-900">
                  {profile.address[0].address}, {profile.address[0].city} - {profile.address[0].pin}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bank Details */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Landmark size={14} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Bank Details</h2>
          </div>
          {!editingBank && (
            <button
              onClick={() => setEditingBank(true)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 font-medium"
            >
              <Edit3 size={12} /> Edit
            </button>
          )}
        </div>
        <div className="p-4 space-y-3">
          {editingBank ? (
            <>
              <div>
                <label className="block text-[11px] text-gray-400 uppercase font-medium mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                  placeholder="Enter account number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 uppercase font-medium mb-1">
                  Holder Name
                </label>
                <input
                  type="text"
                  value={bankForm.holderName}
                  onChange={(e) => setBankForm({ ...bankForm, holderName: e.target.value })}
                  placeholder="Account holder name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 outline-none text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-400 uppercase font-medium mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={bankForm.ifscCode}
                    onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value })}
                    placeholder="IFSC code"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 uppercase font-medium mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                    placeholder="Bank name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 outline-none text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveBankDetails}
                  disabled={saving}
                  className="flex-1 bg-gray-900 text-white py-2 rounded-full text-sm font-semibold hover:bg-gray-800 active:scale-[0.97] flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all shadow-sm"
                >
                  <Save size={14} /> {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditingBank(false);
                    load();
                  }}
                  className="px-5 bg-gray-100 text-gray-600 py-2 rounded-full text-sm font-semibold hover:bg-gray-200 active:scale-[0.97] transition-all"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              {bankForm.accountNumber ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase font-medium mb-0.5">Account Number</p>
                    <p className="text-sm text-gray-900">{bankForm.accountNumber}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase font-medium mb-0.5">Holder Name</p>
                    <p className="text-sm text-gray-900">{bankForm.holderName}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase font-medium mb-0.5">IFSC Code</p>
                    <p className="text-sm text-gray-900">{bankForm.ifscCode}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase font-medium mb-0.5">Bank Name</p>
                    <p className="text-sm text-gray-900">{bankForm.bankName}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm mb-2">No bank details added</p>
                  <button
                    onClick={() => setEditingBank(true)}
                    className="text-xs text-gray-900 font-medium hover:underline"
                  >
                    Add Bank Details
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {previewImg && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3"
          onClick={() => setPreviewImg(null)}
        >
          <button
            onClick={() => setPreviewImg(null)}
            className="absolute top-3 right-3 bg-white/20 hover:bg-white/40 rounded-full p-2 transition"
          >
            <X size={20} className="text-white" />
          </button>
          <img
            src={previewImg}
            alt="Document Preview"
            className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
