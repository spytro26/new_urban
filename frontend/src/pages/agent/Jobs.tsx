import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import { RefreshCw } from "lucide-react";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ASSIGNED: "bg-blue-100 text-blue-800",
  ON_THEWAY: "bg-purple-100 text-purple-800",
  IN_PROGRESS: "bg-orange-100 text-orange-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function AgentJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = () => {
    setCooldownLeft(30);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldownLeft((p) => { if (p <= 1) { clearInterval(cooldownRef.current!); cooldownRef.current = null; return 0; } return p - 1; });
    }, 1000);
  };
  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  const load = () => {
    const q = statusFilter ? `?status=${statusFilter}` : "";
    api.get(`/agents/jobs${q}`).then((r) => { setJobs(r.data.jobs); setLoading(false); }).catch(() => setLoading(false));
  };

  const handleRefresh = () => {
    setRefreshing(true);
    const q = statusFilter ? `?status=${statusFilter}` : "";
    api.get(`/agents/jobs${q}`).then((r) => setJobs(r.data.jobs)).catch(() => {}).finally(() => { setRefreshing(false); startCooldown(); });
  };

  useEffect(() => { load(); }, [statusFilter]);

  // Auto-refresh every 60s (silent)
  useEffect(() => {
    const interval = setInterval(() => {
      const q = statusFilter ? `?status=${statusFilter}` : "";
      api.get(`/agents/jobs${q}`).then((r) => setJobs(r.data.jobs)).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  return (
    <div className="px-4 lg:px-6 py-4 pb-20 md:pb-6">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold text-gray-900">My Jobs</h1>
        <button onClick={handleRefresh} disabled={refreshing || cooldownLeft > 0}
          className={`p-1.5 rounded-md transition flex items-center gap-1 ${refreshing ? "text-gray-500" : cooldownLeft > 0 ? "text-gray-300 cursor-not-allowed" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"}`} title={refreshing ? "Refreshing…" : cooldownLeft > 0 ? `Wait ${cooldownLeft}s` : "Refresh"}>
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          {cooldownLeft > 0 && !refreshing && <span className="text-[10px] font-medium text-gray-400">{cooldownLeft}s</span>}
        </button>
      </div>

      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {["", "ASSIGNED", "COMPLETED"].map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setLoading(true); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition ${
              statusFilter === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {s || "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" /></div>
      ) : jobs.length === 0 ? (
        <p className="text-gray-400 text-center py-8 bg-white rounded-lg border text-sm">No jobs found</p>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <Link key={job.id} to={`/agent/jobs/${job.id}`}
              className="block bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition">
              <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">#{job.id}</p>
                  <p className="text-xs text-gray-500 truncate">{job.addressUser?.address}, {job.addressUser?.city}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {(() => {
                      const grouped = (job.orders || []).reduce((acc: any[], o: any) => {
                        const existing = acc.find((g: any) => g.name === o.subservice?.name);
                        const qty = o.subservice?.price ? Math.round(o.serviceCharge / o.subservice.price) : 1;
                        if (existing) existing.qty += qty;
                        else acc.push({ name: o.subservice?.name, qty });
                        return acc;
                      }, []);
                      return grouped.map((g: any) => g.qty > 1 ? `${g.name} × ${g.qty}` : g.name).join(", ");
                    })()}
                  </p>
                  {job.servicetime && (
                    <p className="text-[11px] text-amber-600 mt-0.5">🕐 {new Date(job.servicetime).toLocaleString()}</p>
                  )}
                </div>
                <div className="text-right shrink-0 ml-2">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${statusColors[job.status]}`}>
                    {job.status.replace("_", " ")}
                  </span>
                  <p className="text-xs font-semibold text-gray-900 mt-1">₹{job.totalPrice}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
