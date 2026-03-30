import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api";
import toast from "react-hot-toast";
import { Star, ArrowLeft } from "lucide-react";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ASSIGNED: "bg-blue-100 text-blue-800",
  ON_THEWAY: "bg-purple-100 text-purple-800",
  IN_PROGRESS: "bg-orange-100 text-orange-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function OrderDetail() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ratingVal, setRatingVal] = useState(0);
  const [approvingId, setApprovingId] = useState<number | null>(null); // which material is being approved (shows payment picker)

  const load = () => {
    api.get(`/users/orderdetails/${orderId}`).then((r) => {
      setOrder(r.data.order);
      setSummary(r.data.summary);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [orderId]);

  const handleRate = async () => {
    if (ratingVal < 1 || ratingVal > 5) { toast.error("Select 1-5 stars"); return; }
    try {
      await api.patch(`/users/orders/${orderId}/rate`, { rating: ratingVal });
      toast.success("Rating submitted!");
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Rating failed");
    }
  };

  const handleApproveExtra = async (materialId: number, method: string) => {
    try {
      await api.patch(`/users/orders/${orderId}/extra-materials/${materialId}/approve`, { paymentMethod: method });
      toast.success(method === "ONLINE" ? "Approved & paid!" : "Approved — agent will verify cash");
      setApprovingId(null);
      load();
    } catch (err: any) {
      toast.error("Failed to approve");
    }
  };

  const handleRejectExtra = async (materialId: number) => {
    try {
      await api.patch(`/users/orders/${orderId}/extra-materials/${materialId}/reject`);
      toast.success("Extra material rejected");
      load();
    } catch (err: any) {
      toast.error("Failed to reject");
    }
  };

  const handleCancel = async () => {
    try {
      await api.patch(`/users/orders/${orderId}/cancel`);
      toast.success("Order cancelled");
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Cancel failed");
    }
  };

  // Poll for pending extra materials when order is active
  useEffect(() => {
    if (!order || ["COMPLETED", "CANCELLED"].includes(order.status)) return;
    const interval = setInterval(() => {
      api.get("/users/extra-materials/pending").then((r) => {
        if (r.data.count > 0) load(); // refresh order if new pending materials
      }).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [order?.status]);

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" /></div>;
  if (!order) return <div className="text-center py-8 text-gray-400 text-sm">Order not found</div>;

  return (
    <div className="px-4 lg:px-6 py-4 pb-20 md:pb-6">
      <Link to="/user/home" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-xs mb-3">
        <ArrowLeft size={14} /> Back
      </Link>

      <div className="flex justify-between items-start mb-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Order Details</h1>
          <p className="text-[11px] text-gray-400">{new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${statusColors[order.status]}`}>
          {order.status.replace("_", " ")}
        </span>
      </div>

      {/* Services */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-2">
        <h3 className="text-[11px] font-medium text-gray-400 uppercase mb-2">Services</h3>
        {(() => {
          const grouped = (order.orders || []).reduce((acc: any[], o: any) => {
            const existing = acc.find((g: any) => g.name === o.subservice?.name);
            const qty = o.subservice?.price ? Math.round(o.serviceCharge / o.subservice.price) : 1;
            if (existing) { existing.qty += qty; existing.total += (o.serviceCharge || 0); }
            else acc.push({ name: o.subservice?.name, qty, total: o.serviceCharge || 0 });
            return acc;
          }, []);
          return grouped.map((g: any, i: number) => (
            <div key={i} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0 text-sm">
              <span>{g.name}{g.qty > 1 ? ` × ${g.qty}` : ""}</span>
              <span className="font-medium">₹{g.total}</span>
            </div>
          ));
        })()}
        <div className="flex justify-between pt-2 font-bold text-sm">
          <span>Total</span><span>₹{order.totalPrice}</span>
        </div>
      </div>

      {/* Address */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-2">
        <h3 className="text-[11px] font-medium text-gray-400 uppercase mb-1">Service Address</h3>
        <p className="text-sm font-medium">{order.addressUser?.address}</p>
        <p className="text-xs text-gray-500">{order.addressUser?.city} - {order.addressUser?.pin}</p>
      </div>

      {/* Agent */}
      {order.agent && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-2">
          <h3 className="text-[11px] font-medium text-gray-400 uppercase mb-1">Assigned Agent</h3>
          <p className="text-sm font-medium">{order.agent.name}</p>
          <p className="text-xs text-gray-500 capitalize">{order.agent.type}</p>
          {order.agent.rating != null && order.agent.rating > 0 && (
            <p className="text-xs text-yellow-600 mt-0.5">★ {order.agent.rating}/5</p>
          )}
        </div>
      )}

      {/* Extra Materials */}
      {order.extraMaterials?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-2">
          <h3 className="text-[11px] font-medium text-gray-400 uppercase mb-2">Extra Materials</h3>
          {order.extraMaterials.map((m: any) => (
            <div key={m.id} className="py-2 border-b border-gray-100 last:border-0">
              <div className="flex justify-between items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium">{m.name} × {m.quantity}</p>
                    {m.approvalStatus === "APPROVED" && m.paid && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">Paid {m.paymentMethod === "CASH" ? "(Cash)" : "(Online)"}</span>}
                    {m.approvalStatus === "APPROVED" && !m.paid && m.paymentMethod === "CASH" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Waiting for agent verification</span>}
                    {m.approvalStatus === "PENDING" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">Pending</span>}
                    {m.approvalStatus === "REJECTED" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">Rejected</span>}
                  </div>
                  <p className="text-[11px] text-gray-400">₹{m.price} each • by {m.addedByAgent?.name}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-sm font-medium">₹{m.price * m.quantity}</span>
                  {m.approvalStatus === "PENDING" && approvingId !== m.id && (
                    <div className="flex gap-1">
                      <button onClick={() => setApprovingId(m.id)} className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-[11px] font-semibold hover:bg-green-200 active:scale-95 transition-all">OK</button>
                      <button onClick={() => handleRejectExtra(m.id)} className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-[11px] font-semibold hover:bg-red-200 active:scale-95 transition-all">No</button>
                    </div>
                  )}
                </div>
              </div>
              {/* Payment method picker when approving */}
              {approvingId === m.id && (
                <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-2.5 space-y-2">
                  <p className="text-xs font-medium text-gray-700">How would you like to pay?</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleApproveExtra(m.id, "ONLINE")}
                      className="flex-1 bg-purple-600 text-white py-2 rounded-full text-xs font-semibold hover:bg-purple-700 active:scale-[0.97] transition-all shadow-sm">
                      Pay Online
                    </button>
                    <button onClick={() => handleApproveExtra(m.id, "CASH")}
                      className="flex-1 bg-green-600 text-white py-2 rounded-full text-xs font-semibold hover:bg-green-700 active:scale-[0.97] transition-all shadow-sm">
                      Pay Cash
                    </button>
                  </div>
                  <button onClick={() => setApprovingId(null)} className="w-full text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                </div>
              )}
            </div>
          ))}
          <p className="text-xs text-gray-400 mt-1.5">Extra total: ₹{summary?.extraMaterialTotal ?? 0}</p>
        </div>
      )}

      {/* Payments */}
      {order.payments?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-2">
          <h3 className="text-[11px] font-medium text-gray-400 uppercase mb-2">Payments</h3>
          {order.payments.map((p: any) => (
            <div key={p.id} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0 text-sm">
              <div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.method === "CASH" ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"}`}>
                  {p.method}
                </span>
                {p.note && <span className="text-[11px] text-gray-400 ml-1.5">{p.note}</span>}
              </div>
              <span className="font-medium">₹{p.amount}</span>
            </div>
          ))}
          <p className="text-xs text-gray-400 mt-1.5">Total paid: ₹{summary?.totalPaid ?? 0}</p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 mt-3">
        {order.status === "COMPLETED" && !order.rating && order.agent && (
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h3 className="text-[11px] font-medium text-gray-400 uppercase mb-2">Rate the Agent</h3>
            <div className="flex gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button key={v} onClick={() => setRatingVal(v)} className={`transition ${ratingVal >= v ? "text-yellow-400" : "text-gray-300"}`}>
                  <Star size={24} fill={ratingVal >= v ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
            <button onClick={handleRate} disabled={ratingVal === 0}
              className="w-full bg-yellow-500 text-white py-2 rounded-full text-sm font-semibold hover:bg-yellow-600 active:scale-[0.98] disabled:opacity-40 transition-all shadow-sm">
              Submit Rating
            </button>
          </div>
        )}
        {order.rating && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
            <p className="text-xs text-yellow-800">You rated this order: {"★".repeat(order.rating)}</p>
          </div>
        )}

        {order.status === "PENDING" && (
          <button onClick={handleCancel} className="w-full bg-red-50 text-red-600 py-2 rounded-full text-sm font-semibold hover:bg-red-100 active:scale-[0.98] border border-red-200 transition-all">
            Cancel Order
          </button>
        )}
      </div>
    </div>
  );
}
