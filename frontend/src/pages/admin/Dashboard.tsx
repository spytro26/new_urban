import { useEffect, useState } from "react";
import api from "../../api";
import { DollarSign, Users, CalendarDays, Package, AlertCircle } from "lucide-react";

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/dashboard").then((r) => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
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
    <div className="px-4 lg:px-6 py-4">
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
    </div>
  );
}
