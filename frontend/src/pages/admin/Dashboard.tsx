import { useEffect, useState } from "react";
import api from "../../api";
import { Link } from "react-router-dom";
import { DollarSign, Users, CalendarDays, Package, AlertCircle } from "lucide-react";

const activeStatuses = new Set(["PENDING", "ASSIGNED", "ON_THEWAY", "IN_PROGRESS"]);

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ASSIGNED: "bg-blue-100 text-blue-800",
  ON_THEWAY: "bg-purple-100 text-purple-800",
  IN_PROGRESS: "bg-orange-100 text-orange-800",
};

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [ongoingOrders, setOngoingOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/admin/dashboard"), api.get("/admin/orders")])
      .then(([dashboardRes, ordersRes]) => {
        setData(dashboardRes.data);
        const orders = ordersRes.data?.orders || [];
        setOngoingOrders(orders.filter((o: any) => activeStatuses.has(o.status)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" /></div>;

  const stats = [
    { label: "Total Revenue", value: `₹${(data?.totalRevenue ?? 0).toLocaleString()}`, icon: DollarSign, color: "text-emerald-600" },
    { label: "Active Agents", value: data?.activeAgents ?? 0, icon: Users, color: "text-blue-600" },
    { label: "Bookings Today", value: data?.bookingsToday ?? 0, icon: CalendarDays, color: "text-violet-600" },
    { label: "Total Orders", value: data?.totalOrders ?? 0, icon: Package, color: "text-amber-600" },
    { label: "Unassigned", value: data?.unassignedOrders ?? 0, icon: AlertCircle, color: (data?.unassignedOrders ?? 0) > 0 ? "text-red-600" : "text-gray-400" },
  ];

  return (
    <div className="px-4 lg:px-6 py-4 pb-20 md:pb-6">
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {stats.map((s) => (
          <div key={s.label} className={`bg-white rounded-lg border border-gray-200 p-4 ${s.label === "Unassigned" && (data?.unassignedOrders ?? 0) > 0 ? "border-red-200 bg-red-50/30" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</span>
              <s.icon size={16} className={s.color} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Ongoing Orders</h2>
          <Link to="/admin/orders" className="text-xs font-medium text-gray-600 hover:text-gray-900">
            View all
          </Link>
        </div>

        {ongoingOrders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No ongoing orders right now.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {ongoingOrders.slice(0, 8).map((order) => (
              <Link
                key={order.id}
                to="/admin/orders"
                className="block px-4 py-3 hover:bg-gray-50 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">#{order.id} {order.name || "Service Order"}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {order.addressUser?.address}, {order.addressUser?.city}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${statusColors[order.status] || "bg-gray-100 text-gray-600"}`}>
                      {order.status?.replace("_", " ")}
                    </span>
                    <p className="text-xs font-semibold text-gray-900 mt-1">₹{order.totalPrice ?? 0}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
