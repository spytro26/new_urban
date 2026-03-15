import { useEffect, useState } from "react";
import api from "../../api";
import { DollarSign, TrendingUp, Banknote, CreditCard, Wrench, Package, ArrowDownLeft, ArrowUpRight } from "lucide-react";

export default function AgentEarnings() {
  const [earnings, setEarnings] = useState<any>(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/agents/earnings?month=${month}&year=${year}`)
      .then((r) => { setEarnings(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [month, year]);

  const fmt = (v: number | undefined | null) => `₹${(v ?? 0).toFixed(0)}`;
  const fmt2 = (v: number | undefined | null) => `₹${(v ?? 0).toFixed(2)}`;

  return (
    <div className="px-4 lg:px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Earnings</h1>
        <div className="flex gap-2">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
            className="px-2.5 py-1.5 border border-gray-300 rounded-md text-sm outline-none">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString("default", { month: "short" })}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="px-2.5 py-1.5 border border-gray-300 rounded-md text-sm outline-none">
            {Array.from({ length: new Date().getFullYear() - 2024 }, (_, i) => 2025 + i).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" /></div>
      ) : !earnings ? (
        <p className="text-gray-400 text-center py-8 text-sm">No data</p>
      ) : (
        <>
          {/* Earnings Breakdown */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-white rounded-lg p-3 border border-gray-200 relative">
              <Wrench size={13} className="text-blue-500 absolute top-3 right-3 opacity-60" />
              <p className="text-[10px] text-gray-400 mb-0.5">Services</p>
              <p className="text-lg font-bold text-gray-900">{fmt(earnings.serviceEarnings)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200 relative">
              <Package size={13} className="text-orange-500 absolute top-3 right-3 opacity-60" />
              <p className="text-[10px] text-gray-400 mb-0.5">Extra Mat.</p>
              <p className="text-lg font-bold text-gray-900">{fmt(earnings.extraEarnings)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200 relative">
              <TrendingUp size={13} className="text-emerald-500 absolute top-3 right-3 opacity-60" />
              <p className="text-[10px] text-gray-400 mb-0.5">Total</p>
              <p className="text-lg font-bold text-gray-900">{fmt(earnings.totalEarnings)}</p>
            </div>
          </div>

          {/* Collections & Commission */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-white rounded-lg p-3 border border-gray-200 relative">
              <Banknote size={13} className="text-green-500 absolute top-3 right-3 opacity-60" />
              <p className="text-[10px] text-gray-400 mb-0.5">COD</p>
              <p className="text-lg font-bold text-gray-900">{fmt(earnings.codCollected)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200 relative">
              <CreditCard size={13} className="text-purple-500 absolute top-3 right-3 opacity-60" />
              <p className="text-[10px] text-gray-400 mb-0.5">Online</p>
              <p className="text-lg font-bold text-gray-900">{fmt(earnings.onlineCollected)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200 relative">
              <DollarSign size={13} className="text-red-500 absolute top-3 right-3 opacity-60" />
              <p className="text-[10px] text-gray-400 mb-0.5">Comm. 5%</p>
              <p className="text-lg font-bold text-gray-900">{fmt(earnings.commission)}</p>
            </div>
          </div>

          {/* Commission note */}
          <p className="text-[10px] text-gray-400 text-center mb-3">Commission is 5% on service earnings only, not on extra materials.</p>

          {/* Previous carry */}
          {(earnings.previousCarry ?? 0) !== 0 && (
            <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg text-xs font-medium border ${
              earnings.previousCarry > 0 ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"
            }`}>
              {earnings.previousCarry > 0 ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
              <span>{earnings.previousCarry > 0 ? "Carry from last month (you owed)" : "Credit from last month"}: {fmt2(Math.abs(earnings.previousCarry))}</span>
            </div>
          )}

          {/* Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Summary</h3>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Completed Orders</span><span className="font-medium">{earnings.completedOrderCount}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Service Earnings</span><span className="font-medium">{fmt2(earnings.serviceEarnings)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Extra Material Earnings</span><span className="font-medium">{fmt2(earnings.extraEarnings)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Commission (5% of services)</span><span className="font-medium text-red-500">-{fmt2(earnings.commission)}</span></div>
            {(earnings.previousCarry ?? 0) !== 0 && (
              <div className="flex justify-between text-sm"><span className="text-gray-500">Previous Carry</span><span className={`font-medium ${earnings.previousCarry > 0 ? "text-red-500" : "text-green-600"}`}>{earnings.previousCarry > 0 ? "-" : "+"}{fmt2(Math.abs(earnings.previousCarry))}</span></div>
            )}
            <hr className="border-gray-100" />
            <div className="flex justify-between text-sm"><span className="text-gray-500">Net Payable</span><span className="font-medium">{fmt2(earnings.netPayable)}</span></div>
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-gray-700">Amount to Receive</span>
              <span className="text-green-600">{fmt2(earnings.amountToSend)}</span>
            </div>
            {(earnings.carryOver ?? 0) > 0 && (
              <div className="flex justify-between text-sm"><span className="text-gray-500">Carry Over (next month)</span><span className="font-medium text-red-600">{fmt2(earnings.carryOver)}</span></div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
