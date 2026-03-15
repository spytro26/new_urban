import { useEffect, useState } from "react";
import api from "../../api";
import toast from "react-hot-toast";
import { User, MapPin, Star, ShieldCheck, ShieldX, Landmark, Edit3, Save } from "lucide-react";

export default function AgentProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [bankForm, setBankForm] = useState({ accountNumber: "", holderName: "", ifscCode: "", bankName: "" });
  const [loading, setLoading] = useState(true);
  const [editingBank, setEditingBank] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get("/agents/profile").then((r) => {
      setProfile(r.data.agent);
      if (r.data.agent.bankDetails) {
        setBankForm({
          accountNumber: r.data.agent.bankDetails.accountNumber,
          holderName: r.data.agent.bankDetails.holderName,
          ifscCode: r.data.agent.bankDetails.ifscCode,
          bankName: r.data.agent.bankDetails.bankName,
        });
      }
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const saveBankDetails = async () => {
    setSaving(true);
    try {
      await api.put("/agents/bank-details", bankForm);
      toast.success("Bank details saved!");
      setEditingBank(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed");
    } finally { setSaving(false); }
  };

  const getInitials = (name: string) => {
    if (name) return name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
    return "AG";
  };

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" /></div>;

  return (
    <div className="px-4 lg:px-6 py-4">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0">
            {getInitials(profile?.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-gray-900 truncate">{profile?.name || "Agent"}</h1>
            <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[11px] bg-gray-100 px-2 py-0.5 rounded font-medium capitalize">{profile?.type?.toLowerCase()}</span>
            {profile?.isVerified ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-green-700 font-medium"><ShieldCheck size={11} /> Verified</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-red-600 font-medium"><ShieldX size={11} /> Unverified</span>
            )}
          </div>
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
            <div><p className="text-[11px] text-gray-400 uppercase font-medium mb-0.5">Name</p><p className="text-sm text-gray-900">{profile?.name}</p></div>
            <div><p className="text-[11px] text-gray-400 uppercase font-medium mb-0.5">Type</p><p className="text-sm text-gray-900 capitalize">{profile?.type}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-gray-400 uppercase font-medium mb-0.5">Rating</p>
              <div className="flex items-center gap-1">
                <Star size={13} className="text-yellow-400" fill="currentColor" />
                <span className="text-sm text-gray-900">{profile?.rating > 0 ? `${profile.rating}/5` : "None"}</span>
                {profile?.ratingCount > 0 && <span className="text-[11px] text-gray-400">({profile.ratingCount})</span>}
              </div>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase font-medium mb-0.5">Status</p>
              <span className={`inline-flex items-center gap-1 text-sm font-medium ${profile?.isAvailable ? "text-green-600" : "text-gray-500"}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${profile?.isAvailable ? "bg-green-500" : "bg-gray-400"}`} />
                {profile?.isAvailable ? "Online" : "Offline"}
              </span>
            </div>
          </div>
          {profile?.address?.length > 0 && (
            <div>
              <p className="text-[11px] text-gray-400 uppercase font-medium mb-0.5">Address</p>
              <div className="flex items-start gap-1.5">
                <MapPin size={12} className="text-gray-400 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-900">{profile.address[0].address}, {profile.address[0].city} - {profile.address[0].pin}</p>
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
            <button onClick={() => setEditingBank(true)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 font-medium">
              <Edit3 size={12} /> Edit
            </button>
          )}
        </div>
        <div className="p-4 space-y-3">
          {editingBank ? (
            <>
              <div>
                <label className="block text-[11px] text-gray-400 uppercase font-medium mb-1">Account Number</label>
                <input type="text" value={bankForm.accountNumber}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                  placeholder="Enter account number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 uppercase font-medium mb-1">Holder Name</label>
                <input type="text" value={bankForm.holderName}
                  onChange={(e) => setBankForm({ ...bankForm, holderName: e.target.value })}
                  placeholder="Account holder name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 outline-none text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-400 uppercase font-medium mb-1">IFSC Code</label>
                  <input type="text" value={bankForm.ifscCode}
                    onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value })}
                    placeholder="IFSC code"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 uppercase font-medium mb-1">Bank Name</label>
                  <input type="text" value={bankForm.bankName}
                    onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                    placeholder="Bank name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 outline-none text-sm" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={saveBankDetails} disabled={saving}
                  className="flex-1 bg-gray-900 text-white py-2 rounded-full text-sm font-semibold hover:bg-gray-800 active:scale-[0.97] flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all shadow-sm">
                  <Save size={14} /> {saving ? "Saving..." : "Save"}
                </button>
                <button onClick={() => { setEditingBank(false); load(); }}
                  className="px-5 bg-gray-100 text-gray-600 py-2 rounded-full text-sm font-semibold hover:bg-gray-200 active:scale-[0.97] transition-all">
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              {bankForm.accountNumber ? (
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-[11px] text-gray-400 uppercase font-medium mb-0.5">Account Number</p><p className="text-sm text-gray-900">{bankForm.accountNumber}</p></div>
                  <div><p className="text-[11px] text-gray-400 uppercase font-medium mb-0.5">Holder Name</p><p className="text-sm text-gray-900">{bankForm.holderName}</p></div>
                  <div><p className="text-[11px] text-gray-400 uppercase font-medium mb-0.5">IFSC Code</p><p className="text-sm text-gray-900">{bankForm.ifscCode}</p></div>
                  <div><p className="text-[11px] text-gray-400 uppercase font-medium mb-0.5">Bank Name</p><p className="text-sm text-gray-900">{bankForm.bankName}</p></div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm mb-2">No bank details added</p>
                  <button onClick={() => setEditingBank(true)} className="text-xs text-gray-900 font-medium hover:underline">Add Bank Details</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
