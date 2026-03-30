import { useEffect, useState } from "react";
import api from "../../api";
import toast from "react-hot-toast";
import { Plus, Trash2, Edit, X, Check } from "lucide-react";

export default function AdminSubservices() {
  const [subservices, setSubservices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", description: "", categoryId: "" });
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", price: "", description: "", categoryId: "" });

  const load = () => {
    Promise.all([
      api.get("/admin/subservices"),
      api.get("/admin/categories"),
    ]).then(([s, c]) => {
      setSubservices(s.data.subservices);
      setCategories(c.data.categories);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Set default categoryId when categories load
  useEffect(() => {
    if (categories.length > 0 && !form.categoryId) {
      setForm((f) => ({ ...f, categoryId: String(categories[0].id) }));
    }
  }, [categories]);

  const add = async () => {
    if (!form.name) { toast.error("Name required"); return; }
    if (!form.categoryId) { toast.error("Select a category"); return; }
    try {
      await api.post("/admin/subservices", {
        name: form.name, price: Number(form.price) || undefined,
        description: form.description || undefined, categoryId: Number(form.categoryId),
      });
      toast.success("Sub-service added!");
      setShowAdd(false);
      setForm({ name: "", price: "", description: "", categoryId: categories[0]?.id?.toString() || "" });
      load();
    } catch (err: any) { toast.error(err.response?.data?.error || "Failed"); }
  };

  const update = async (id: number) => {
    try {
      await api.put(`/admin/subservices/${id}`, {
        name: editForm.name, price: Number(editForm.price) || undefined,
        description: editForm.description || undefined, categoryId: Number(editForm.categoryId),
      });
      toast.success("Updated!");
      setEditId(null);
      load();
    } catch { toast.error("Failed"); }
  };

  const remove = async (id: number) => {
    try {
      await api.delete(`/admin/subservices/${id}`);
      toast.success("Deleted");
      load();
    } catch { toast.error("Cannot delete — may have orders"); }
  };

  const CategorySelect = ({ value, onChange, cls }: { value: string; onChange: (v: string) => void; cls?: string }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className={cls || "w-full px-3 py-2 border rounded-md outline-none text-sm"}>
      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  );

  return (
    <div className="px-4 lg:px-6 py-4 pb-20 md:pb-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Sub-Services</h1>
        <button onClick={() => setShowAdd(!showAdd)} className="bg-gray-900 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold hover:bg-gray-800 active:scale-[0.97] flex items-center gap-1 transition-all shadow-sm">
          <Plus size={14} /> Add
        </button>
      </div>

      {showAdd && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 space-y-2">
          <input placeholder="Service name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-md outline-none focus:ring-2 focus:ring-gray-400 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Price (₹)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full px-3 py-2 border rounded-md outline-none focus:ring-2 focus:ring-gray-400 text-sm" />
            <CategorySelect value={form.categoryId} onChange={(v) => setForm({ ...form, categoryId: v })} />
          </div>
          <input placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 border rounded-md outline-none focus:ring-2 focus:ring-gray-400 text-sm" />
          <button onClick={add} className="w-full bg-gray-900 text-white py-2 rounded-full text-sm font-semibold hover:bg-gray-800 active:scale-[0.98] transition-all shadow-sm">Create</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" /></div>
      ) : subservices.length === 0 ? (
        <p className="text-gray-400 text-center py-6 bg-white rounded-lg border text-sm">No sub-services yet</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {subservices.map((s) => (
            <div key={s.id} className="bg-white border border-gray-200 rounded-lg p-3">
              {editId === s.id ? (
                <div className="space-y-2">
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded-md outline-none focus:ring-2 focus:ring-gray-400 text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded-md outline-none text-sm" />
                    <CategorySelect value={editForm.categoryId} onChange={(v) => setEditForm({ ...editForm, categoryId: v })}
                      cls="w-full px-3 py-1.5 border rounded-md outline-none text-sm" />
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => update(s.id)} className="flex-1 bg-gray-900 text-white py-1.5 rounded-full text-xs font-semibold hover:bg-gray-800 active:scale-[0.97] flex items-center justify-center gap-1 transition-all shadow-sm"><Check size={12} /> Save</button>
                    <button onClick={() => setEditId(null)} className="flex-1 bg-gray-100 text-gray-600 py-1.5 rounded-full text-xs font-semibold hover:bg-gray-200 active:scale-[0.97] flex items-center justify-center gap-1 transition-all"><X size={12} /> Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="font-medium text-sm truncate">{s.name}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-100 text-blue-700 shrink-0 capitalize">
                        {s.category?.name || "—"}
                      </span>
                    </div>
                    {s.description && <p className="text-xs text-gray-500 truncate">{s.description}</p>}
                    <p className="text-xs font-semibold text-gray-900 mt-0.5">₹{s.price ?? "N/A"}</p>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <button onClick={() => { setEditId(s.id); setEditForm({ name: s.name, price: s.price?.toString() || "", description: s.description || "", categoryId: s.categoryId?.toString() || s.category?.id?.toString() || "" }); }}
                      className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"><Edit size={14} /></button>
                    <button onClick={() => remove(s.id)} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
