import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, Clock } from "lucide-react";

export default function AgentJobDetail() {
  const { jobId } = useParams();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showExtra, setShowExtra] = useState(false);
  const [extraForm, setExtraForm] = useState({ name: "", quantity: "1", price: "", description: "" });

  const load = () => {
    api.get(`/agents/jobs`).then((r) => {
      const found = r.data.jobs.find((j: any) => j.id === Number(jobId));
      setJob(found);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [jobId]);

  const updateStatus = async (status: string) => {
    try {
      await api.patch(`/agents/jobs/${jobId}/status`, { status });
      toast.success(`Status updated to ${status}`);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed");
    }
  };

  const addExtra = async () => {
    try {
      await api.post(`/agents/jobs/${jobId}/extra-material`, {
        name: extraForm.name,
        quantity: Number(extraForm.quantity),
        price: Number(extraForm.price),
        description: extraForm.description || undefined,
      });
      toast.success("Extra material requested!");
      setShowExtra(false);
      setExtraForm({ name: "", quantity: "1", price: "", description: "" });
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed");
    }
  };

  const verifyPayment = async (materialId: number) => {
    try {
      await api.patch(`/agents/jobs/${jobId}/extra-material/${materialId}/verify-payment`);
      toast.success("Cash payment verified!");
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to verify");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" /></div>;
  if (!job) return <div className="text-center py-8 text-gray-400 text-sm">Job not found</div>;

  const nextStatus: Record<string, string> = {
    ASSIGNED: "ON_THEWAY",
    ON_THEWAY: "IN_PROGRESS",
    IN_PROGRESS: "COMPLETED",
  };

  return (
    <div className="px-4 lg:px-6 py-4">
      <Link to="/agent/jobs" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-xs mb-3">
        <ArrowLeft size={14} /> Back
      </Link>

      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">#{job.id}</h1>
          <p className="text-xs text-gray-500">{job.addressUser?.address}, {job.addressUser?.city}</p>
          {job.servicetime && (
            <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
              <Clock size={12} /> {new Date(job.servicetime).toLocaleString()}
            </p>
          )}
        </div>
        <span className="text-sm font-semibold capitalize px-2.5 py-1 rounded bg-gray-100">{job.status.replace("_", " ")}</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
        <h3 className="text-[11px] font-medium text-gray-400 uppercase mb-2">Services</h3>
        {(() => {
          const grouped = (job.orders || []).reduce((acc: any[], o: any) => {
            const existing = acc.find((g: any) => g.name === o.subservice?.name);
            const qty = o.subservice?.price ? Math.round(o.serviceCharge / o.subservice.price) : 1;
            if (existing) { existing.qty += qty; existing.total += (o.serviceCharge || 0); }
            else acc.push({ name: o.subservice?.name, price: o.subservice?.price, qty, total: o.serviceCharge || 0 });
            return acc;
          }, []);
          return grouped.map((g: any, i: number) => (
            <div key={i} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0 text-sm">
              <span>{g.name}{g.qty > 1 ? ` × ${g.qty}` : ""}</span>
              <span className="font-medium">₹{g.total}</span>
            </div>
          ));
        })()}
        <div className="flex justify-between pt-2 font-bold text-sm"><span>Total</span><span>₹{job.totalPrice}</span></div>
      </div>

      {nextStatus[job.status] && (
        <button onClick={() => {
          if (nextStatus[job.status] === "COMPLETED") {
            if (!window.confirm("Are you sure the job is complete? This action cannot be undone.")) return;
          }
          updateStatus(nextStatus[job.status]);
        }}
          className={`w-full py-2.5 rounded-full text-sm font-semibold mb-3 active:scale-[0.98] transition-all shadow-sm ${
            nextStatus[job.status] === "COMPLETED"
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-gray-900 text-white hover:bg-gray-800"
          }`}>
          {nextStatus[job.status] === "COMPLETED" ? "✓ Mark as Completed" : `Mark as ${nextStatus[job.status].replace("_", " ")}`}
        </button>
      )}

      {["ASSIGNED", "ON_THEWAY", "IN_PROGRESS"].includes(job.status) && (
        <div className="mb-3">
          {!showExtra ? (
            <button onClick={() => setShowExtra(true)}
              className="w-full bg-amber-50 text-amber-700 py-2 rounded-full text-sm font-semibold hover:bg-amber-100 border border-amber-200 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5">
              <Plus size={14} /> Request Extra Material
            </button>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
              <h3 className="text-sm font-medium">Extra Material</h3>
              <input placeholder="Item name" value={extraForm.name} onChange={(e) => setExtraForm({ ...extraForm, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-1 focus:ring-gray-400" />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="Qty" value={extraForm.quantity} onChange={(e) => setExtraForm({ ...extraForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-1 focus:ring-gray-400" />
                <input type="number" placeholder="Price" value={extraForm.price} onChange={(e) => setExtraForm({ ...extraForm, price: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-1 focus:ring-gray-400" />
              </div>
              <div className="flex gap-2">
                <button onClick={addExtra} className="flex-1 bg-gray-900 text-white py-2 rounded-full text-sm font-semibold hover:bg-gray-800 active:scale-[0.97] transition-all shadow-sm">Submit</button>
                <button onClick={() => setShowExtra(false)} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-full text-sm font-semibold hover:bg-gray-200 active:scale-[0.97] transition-all">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Extra Materials Status */}
      {job.extraMaterials?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
          <h3 className="text-[11px] font-medium text-gray-400 uppercase mb-2">Extra Materials</h3>
          {job.extraMaterials.map((m: any) => (
            <div key={m.id} className="py-2 border-b border-gray-100 last:border-0">
              <div className="flex justify-between items-center">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{m.name} × {m.quantity}</p>
                  <p className="text-[11px] text-gray-400">₹{m.price} each</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-sm font-medium">₹{m.price * m.quantity}</span>
                </div>
              </div>
              <div className="mt-1">
                {m.approvalStatus === "PENDING" && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-yellow-50 text-yellow-700 border border-yellow-200">⏳ Waiting for user approval</span>
                )}
                {m.approvalStatus === "REJECTED" && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">✗ Rejected by user</span>
                )}
                {m.approvalStatus === "APPROVED" && m.paymentMethod === "ONLINE" && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">✓ Approved — Paid Online</span>
                )}
                {m.approvalStatus === "APPROVED" && m.paymentMethod === "CASH" && m.paid && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">✓ Approved — Cash Received</span>
                )}
                {m.approvalStatus === "APPROVED" && m.paymentMethod === "CASH" && !m.paid && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">Cash — Awaiting your verification</span>
                    <button onClick={() => verifyPayment(m.id)}
                      className="text-[11px] px-3 py-1 bg-green-600 text-white rounded-full font-semibold hover:bg-green-700 active:scale-95 transition-all shadow-sm">
                      Payment Received
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
