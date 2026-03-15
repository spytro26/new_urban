import { useEffect, useState } from "react";
import api from "../../api";
import toast from "react-hot-toast";
import { Download, RefreshCw, Check } from "lucide-react";

export default function AdminSettlements() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState<any>(null);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"report" | "settlements">("report");

  const loadReport = () => {
    setLoading(true);
    api.get(`/admin/reports/monthly?month=${month}&year=${year}`)
      .then((r) => { setReport(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const loadSettlements = () => {
    setLoading(true);
    api.get(`/admin/settlements?month=${month}&year=${year}`)
      .then((r) => { setSettlements(r.data.settlements); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (tab === "report") loadReport();
    else loadSettlements();
  }, [month, year, tab]);

  const generateSettlements = async () => {
    try {
      await api.post(`/admin/settlements/generate?month=${month}&year=${year}`);
      toast.success("Settlements generated!");
      loadSettlements();
    } catch { toast.error("Failed"); }
  };

  const markSettled = async (id: number) => {
    try {
      await api.patch(`/admin/settlements/${id}/mark-settled`);
      toast.success("Marked as settled!");
      loadSettlements();
    } catch { toast.error("Failed"); }
  };

  const downloadCSV = async () => {
    try {
      const res = await api.get(`/admin/reports/monthly/download?month=${month}&year=${year}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `revenue-report-${year}-${month}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download CSV");
    }
  };

  return (
    <div className="px-4 lg:px-6 py-4">
      <h1 className="text-lg font-semibold text-gray-900 mb-3">Settlements & Reports</h1>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
          className="px-3 py-1.5 border border-gray-200 rounded-md outline-none text-sm">
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString("default", { month: "long" })}</option>
          ))}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}
          className="px-3 py-1.5 border border-gray-200 rounded-md outline-none text-sm">
          {Array.from({ length: new Date().getFullYear() - 2024 }, (_, i) => 2025 + i).map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        <div className="flex gap-0.5 bg-gray-100 rounded-md p-0.5">
          <button onClick={() => setTab("report")} className={`px-3 py-1.5 rounded text-xs font-medium ${tab === "report" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}>Report</button>
          <button onClick={() => setTab("settlements")} className={`px-3 py-1.5 rounded text-xs font-medium ${tab === "settlements" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}>Settlements</button>
        </div>

        <button onClick={downloadCSV} className="ml-auto bg-gray-900 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold hover:bg-gray-800 active:scale-[0.97] flex items-center gap-1 transition-all shadow-sm">
          <Download size={13} /> CSV
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" /></div>
      ) : tab === "report" ? (
        <div>
          {report && (
            <div className="mb-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-emerald-800">Platform Revenue: ₹{report.platformRevenue?.toFixed(2)}</p>
                <p className="text-xs text-emerald-600">{report.agents?.length ?? 0} agents with earnings</p>
              </div>
            </div>
          )}

          {report?.agents?.length === 0 ? (
            <p className="text-gray-400 text-center py-6 bg-white rounded-lg border text-sm">No completed orders this month</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full bg-white">
                <thead className="bg-gray-50">
                  <tr>
                    {["Agent", "Orders", "Earnings", "Commission", "COD", "Online", "To Send", "Carry"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report?.agents?.map((a: any) => (
                    <tr key={a.agentId} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <p className="font-medium text-xs">{a.name}</p>
                        <p className="text-[11px] text-gray-400">{a.email}</p>
                      </td>
                      <td className="px-3 py-2 text-xs">{a.orderCount}</td>
                      <td className="px-3 py-2 text-xs font-medium">₹{a.totalEarnings.toFixed(0)}</td>
                      <td className="px-3 py-2 text-xs text-red-600">₹{a.commission.toFixed(0)}</td>
                      <td className="px-3 py-2 text-xs">₹{a.codCollected.toFixed(0)}</td>
                      <td className="px-3 py-2 text-xs">₹{a.onlineCollected.toFixed(0)}</td>
                      <td className="px-3 py-2 text-xs font-bold text-green-600">₹{a.amountToSend.toFixed(0)}</td>
                      <td className="px-3 py-2 text-xs text-orange-600">₹{a.carryOver.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="mb-3">
            <button onClick={generateSettlements}
              className="bg-gray-900 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold hover:bg-gray-800 active:scale-[0.97] flex items-center gap-1 transition-all shadow-sm">
              <RefreshCw size={13} /> Generate/Refresh
            </button>
          </div>

          {settlements.length === 0 ? (
            <p className="text-gray-400 text-center py-6 bg-white rounded-lg border text-sm">No settlements. Generate them first.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {settlements.map((s) => (
                <div key={s.id} className={`bg-white border rounded-lg p-3 ${s.settled ? "border-green-200" : "border-gray-200"}`}>
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{s.agent?.name}</p>
                      <p className="text-xs text-gray-400 truncate">{s.agent?.email}</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 mt-2 text-xs">
                        <p className="text-gray-500">Earnings: <span className="font-medium text-gray-900">₹{s.totalEarnings.toFixed(0)}</span></p>
                        <p className="text-gray-500">Commission: <span className="font-medium text-red-600">₹{s.commission.toFixed(0)}</span></p>
                        <p className="text-gray-500">COD: <span className="font-medium">₹{s.codCollected.toFixed(0)}</span></p>
                        <p className="text-gray-500">Online: <span className="font-medium">₹{s.onlineCollected.toFixed(0)}</span></p>
                        <p className="text-gray-500">To Send: <span className="font-bold text-green-600">₹{s.amountToSend.toFixed(0)}</span></p>
                        <p className="text-gray-500">Carry: <span className="font-medium text-orange-600">₹{s.carryOver.toFixed(0)}</span></p>
                        {s.previousCarry > 0 && (
                          <p className="text-gray-500">Prev: <span className="font-medium text-red-600">₹{s.previousCarry.toFixed(0)}</span></p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 ml-3">
                      {s.settled ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                          <Check size={12} /> Settled
                        </span>
                      ) : (
                        <button onClick={() => markSettled(s.id)}
                          className="bg-gray-900 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold hover:bg-gray-800 active:scale-[0.97] transition-all shadow-sm">
                          Settle
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
