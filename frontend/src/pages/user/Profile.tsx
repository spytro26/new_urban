import { useEffect, useState } from "react";
import api from "../../api";
import toast from "react-hot-toast";
import { User, MapPin, Save, Edit3, Plus, Trash2, Phone, Home, Briefcase, MoreHorizontal } from "lucide-react";

const LABELS = [
  { value: "Home", icon: Home },
  { value: "Work", icon: Briefcase },
  { value: "Other", icon: MoreHorizontal },
];

export default function UserProfile() {
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Address editing
  const [editAddrId, setEditAddrId] = useState<number | null>(null);
  const [addrForm, setAddrForm] = useState({ label: "Home", address: "", pin: "", city: "" });
  const [addingAddr, setAddingAddr] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);
  const [deletingAddr, setDeletingAddr] = useState<number | null>(null);

  const load = () => {
    Promise.all([
      api.get("/users/profile"),
      api.get("/users/addresses"),
    ]).then(([pr, ad]) => {
      const u = pr.data.user;
      setUser(u);
      setForm({ name: u.name || "", phone: u.phone || "" });
      setAddresses(ad.data.addresses || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/users/profile", form);
      toast.success("Profile updated!");
      setEditing(false);
      load();
    } catch (err: any) { toast.error(err.response?.data?.error || "Update failed"); }
    finally { setSaving(false); }
  };

  const saveAddr = async () => {
    if (!addrForm.address || !addrForm.pin || !addrForm.city) { toast.error("Fill all address fields"); return; }
    setSavingAddr(true);
    try {
      if (editAddrId) {
        await api.put(`/users/addresses/${editAddrId}`, addrForm);
        toast.success("Address updated!");
      } else {
        await api.post("/users/addresses", addrForm);
        toast.success("Address added!");
      }
      setEditAddrId(null); setAddingAddr(false);
      setAddrForm({ label: "Home", address: "", pin: "", city: "" });
      load();
    } catch (err: any) { toast.error(err.response?.data?.error || "Failed"); }
    finally { setSavingAddr(false); }
  };

  const deleteAddr = async (id: number) => {
    setDeletingAddr(id);
    try {
      await api.delete(`/users/addresses/${id}`);
      toast.success("Address deleted");
      load();
    } catch (err: any) { toast.error(err.response?.data?.error || "Cannot delete"); }
    finally { setDeletingAddr(null); }
  };

  const startEditAddr = (a: any) => {
    setEditAddrId(a.id);
    setAddrForm({ label: a.label || "Home", address: a.address, pin: a.pin, city: a.city });
    setAddingAddr(false);
  };

  const startAddAddr = () => {
    setAddingAddr(true);
    setEditAddrId(null);
    setAddrForm({ label: "Home", address: "", pin: "", city: "" });
  };

  const cancelAddr = () => { setEditAddrId(null); setAddingAddr(false); setAddrForm({ label: "Home", address: "", pin: "", city: "" }); };

  const getInitials = (name: string, email: string) => {
    if (name) return name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
    return email?.charAt(0).toUpperCase() || "U";
  };

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" /></div>;

  return (
    <div className="px-4 lg:px-6 py-4 pb-20 md:pb-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0">
            {getInitials(form.name, user?.email)}
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-gray-900 truncate">{form.name || "Set your name"}</h1>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            {form.phone && <p className="text-xs text-gray-400">{form.phone}</p>}
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-3">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <User size={14} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Personal Information</h2>
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 font-medium">
              <Edit3 size={12} /> Edit
            </button>
          )}
        </div>
        <div className="p-4 space-y-3">
          <div>
            <p className="text-[11px] text-gray-400 uppercase font-medium mb-0.5">Email</p>
            <p className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">{user?.email}</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase font-medium mb-0.5">Full Name</p>
            {editing ? (
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Enter your full name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 outline-none text-sm" />
            ) : (
              <p className="text-sm text-gray-900 px-3 py-2">{form.name || <span className="text-gray-400 italic">Not set</span>}</p>
            )}
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase font-medium mb-0.5">Phone</p>
            {editing ? (
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="10-digit phone number"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 outline-none text-sm" />
              </div>
            ) : (
              <p className="text-sm text-gray-900 px-3 py-2">{form.phone || <span className="text-gray-400 italic">Not set</span>}</p>
            )}
          </div>
        </div>
        {editing && (
          <div className="px-4 pb-4 flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-gray-900 text-white py-2 rounded-full text-sm font-semibold hover:bg-gray-800 active:scale-[0.97] flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all shadow-sm">
              <Save size={14} /> {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => { setEditing(false); load(); }}
              className="px-5 bg-gray-100 text-gray-600 py-2 rounded-full text-sm font-semibold hover:bg-gray-200 active:scale-[0.97] transition-all">
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Addresses */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-3">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Addresses</h2>
            <span className="text-[10px] text-gray-400">({addresses.length})</span>
          </div>
          {!addingAddr && !editAddrId && (
            <button onClick={startAddAddr} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 font-medium">
              <Plus size={12} /> Add
            </button>
          )}
        </div>

        <div className="p-4 space-y-3">
          {/* Existing addresses */}
          {addresses.map((a) => (
            <div key={a.id}>
              {editAddrId === a.id ? (
                <AddressForm form={addrForm} setForm={setAddrForm} onSave={saveAddr} onCancel={cancelAddr} saving={savingAddr} />
              ) : (
                <div className="flex items-start justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                  <div className="flex items-start gap-2 min-w-0">
                    {(() => { const L = LABELS.find((l) => l.value === a.label); return L ? <L.icon size={14} className="text-gray-400 mt-0.5 shrink-0" /> : <Home size={14} className="text-gray-400 mt-0.5 shrink-0" />; })()}
                    <div className="min-w-0">
                      <span className="text-[10px] font-semibold text-gray-500 uppercase">{a.label || "Home"}</span>
                      <p className="text-sm text-gray-900 truncate">{a.address}</p>
                      <p className="text-xs text-gray-500">{a.city} • {a.pin}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button onClick={() => startEditAddr(a)} className="p-1 text-gray-400 hover:text-gray-700"><Edit3 size={12} /></button>
                    <button onClick={() => deleteAddr(a.id)} disabled={deletingAddr === a.id}
                      className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30"><Trash2 size={12} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {addresses.length === 0 && !addingAddr && (
            <p className="text-sm text-gray-400 text-center py-2">No addresses yet</p>
          )}

          {/* Add new address form */}
          {addingAddr && (
            <AddressForm form={addrForm} setForm={setAddrForm} onSave={saveAddr} onCancel={cancelAddr} saving={savingAddr} />
          )}
        </div>
      </div>
    </div>
  );
}

function AddressForm({ form, setForm, onSave, onCancel, saving }: {
  form: { label: string; address: string; pin: string; city: string };
  setForm: (f: any) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
      <div className="flex gap-1.5">
        {LABELS.map((l) => (
          <button key={l.value} onClick={() => setForm({ ...form, label: l.value })}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
              form.label === l.value ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            <l.icon size={10} /> {l.value}
          </button>
        ))}
      </div>
      <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
        placeholder="Street address" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-gray-400" />
      <div className="grid grid-cols-2 gap-2">
        <input type="text" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })}
          placeholder="PIN code" className="px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-gray-400" />
        <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
          placeholder="City" className="px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-gray-400" />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onSave} disabled={saving}
          className="flex-1 bg-gray-900 text-white py-1.5 rounded-full text-xs font-semibold hover:bg-gray-800 active:scale-[0.97] disabled:opacity-50 transition-all shadow-sm">
          {saving ? "Saving..." : "Save Address"}
        </button>
        <button onClick={onCancel}
          className="px-4 bg-gray-100 text-gray-600 py-1.5 rounded-full text-xs font-semibold hover:bg-gray-200 active:scale-[0.97] transition-all">
          Cancel
        </button>
      </div>
    </div>
  );
}
