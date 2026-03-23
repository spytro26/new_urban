import { useEffect, useState } from "react";
import api from "../../api";
import toast from "react-hot-toast";
import { Plus, Trash2, Edit, X, Check, FileText } from "lucide-react";

const STANDARD_DOCUMENTS = [
  { name: "Aadhar Card", description: "Government identity proof", isRequired: true },
  { name: "PAN Card", description: "PAN details for tax verification", isRequired: true },
  { name: "Address Proof", description: "Utility bill, rent agreement, or similar", isRequired: true },
  { name: "Selfie Photo", description: "Recent passport-style photo", isRequired: false },
  { name: "Police Verification", description: "Police verification or background check", isRequired: false },
  { name: "Trade Certificate", description: "Relevant skill or trade certificate", isRequired: false },
] as const;

export default function AdminCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "" });
  const [docReqs, setDocReqs] = useState<{ name: string; description: string; isRequired: boolean }[]>([]);
  const [newReqForm, setNewReqForm] = useState({ name: "", description: "", isRequired: true });
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", slug: "", description: "" });
  const [addReqForm, setAddReqForm] = useState({ name: "", description: "", isRequired: true, categoryId: null as number | null });

  const load = () => {
    api.get("/admin/categories").then((r) => { setCategories(r.data.categories); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const normalizeReqName = (name: string) => name.trim().toLowerCase();

  const addDocReqToNewCategory = (req: { name: string; description?: string; isRequired: boolean }) => {
    const cleanedName = req.name.trim();
    if (!cleanedName) {
      toast.error("Requirement name required");
      return;
    }

    const exists = docReqs.some((r) => normalizeReqName(r.name) === normalizeReqName(cleanedName));
    if (exists) {
      toast.error("This document requirement is already added");
      return;
    }

    setDocReqs((prev) => [...prev, {
      name: cleanedName,
      description: req.description?.trim() || "",
      isRequired: req.isRequired,
    }]);
  };

  const addCategory = async () => {
    if (!form.name) { toast.error("Name required"); return; }
    try {
      await api.post("/admin/categories", {
        name: form.name,
        slug: form.slug || form.name.toLowerCase().replace(/\s+/g, "-"),
        description: form.description || undefined,
        documentRequirements: docReqs.length > 0 ? docReqs : undefined,
      });
      toast.success("Category created!");
      setShowAdd(false);
      setForm({ name: "", slug: "", description: "" });
      setDocReqs([]);
      setNewReqForm({ name: "", description: "", isRequired: true });
      load();
    } catch (err: any) { toast.error(err.response?.data?.error || "Failed"); }
  };

  const updateCategory = async (id: number) => {
    try {
      await api.put(`/admin/categories/${id}`, {
        name: editForm.name,
        slug: editForm.slug,
        description: editForm.description || undefined,
      });
      toast.success("Updated!");
      setEditId(null);
      load();
    } catch { toast.error("Failed"); }
  };

  const deleteCategory = async (id: number, name: string) => {
    const confirmed = window.confirm(`Delete category \"${name}\"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await api.delete(`/admin/categories/${id}`);
      toast.success("Deleted");
      load();
    } catch (err: any) { toast.error(err.response?.data?.error || "Cannot delete — may have subservices or agents"); }
  };

  const addDocReq = async () => {
    if (!addReqForm.name || !addReqForm.categoryId) { toast.error("Name required"); return; }
    try {
      await api.post(`/admin/categories/${addReqForm.categoryId}/requirements`, {
        name: addReqForm.name,
        description: addReqForm.description || undefined,
        isRequired: addReqForm.isRequired,
      });
      toast.success("Requirement added!");
      setAddReqForm({ name: "", description: "", isRequired: true, categoryId: null });
      load();
    } catch (err: any) { toast.error(err.response?.data?.error || "Failed"); }
  };

  const deleteDocReq = async (reqId: number) => {
    try {
      await api.delete(`/admin/requirements/${reqId}`);
      toast.success("Requirement deleted");
      load();
    } catch { toast.error("Failed"); }
  };

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-gray-400 text-sm";

  return (
    <div className="px-4 lg:px-6 py-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Categories</h1>
        <button onClick={() => setShowAdd(!showAdd)}
          className="bg-gray-900 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold hover:bg-gray-800 active:scale-[0.97] flex items-center gap-1 transition-all shadow-sm">
          <Plus size={14} /> Add Category
        </button>
      </div>

      {/* Add Category Form */}
      {showAdd && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">New Category</h3>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Category name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            <input placeholder="Slug (auto-generated)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={inputCls} />
          </div>
          <input placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />

          {/* Inline doc requirements for new category */}
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">Document Requirements</p>
            {docReqs.map((r, i) => (
              <div key={i} className="flex items-start gap-2 mb-1.5">
                <div className="flex-1">
                  <span className="text-xs text-gray-700">{r.name} {r.isRequired && <span className="text-red-500">*</span>}</span>
                  {r.description && <p className="text-[10px] text-gray-400">{r.description}</p>}
                </div>
                <button onClick={() => setDocReqs(docReqs.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><X size={12} /></button>
              </div>
            ))}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
              <input
                placeholder="Requirement name"
                className="px-2 py-1.5 border rounded-md text-xs outline-none"
                value={newReqForm.name}
                onChange={(e) => setNewReqForm({ ...newReqForm, name: e.target.value })}
              />
              <input
                placeholder="Description (optional)"
                className="px-2 py-1.5 border rounded-md text-xs outline-none"
                value={newReqForm.description}
                onChange={(e) => setNewReqForm({ ...newReqForm, description: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-1 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={newReqForm.isRequired}
                  onChange={(e) => setNewReqForm({ ...newReqForm, isRequired: e.target.checked })}
                  className="rounded"
                />
                Required
              </label>
              <button
                type="button"
                onClick={() => {
                  addDocReqToNewCategory(newReqForm);
                  setNewReqForm({ name: "", description: "", isRequired: true });
                }}
                className="px-3 py-1 bg-gray-900 text-white rounded-full text-[10px] font-semibold hover:bg-gray-800 active:scale-[0.97] transition-all"
              >
                Add Requirement
              </button>
            </div>

            <div className="mt-2">
              <p className="text-[10px] text-gray-500 mb-1">Quick add standard documents:</p>
              <div className="flex flex-wrap gap-1">
                {STANDARD_DOCUMENTS.map((preset) => {
                  const exists = docReqs.some((r) => normalizeReqName(r.name) === normalizeReqName(preset.name));
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      disabled={exists}
                      onClick={() =>
                        addDocReqToNewCategory({
                          name: preset.name,
                          description: preset.description,
                          isRequired: newReqForm.isRequired,
                        })
                      }
                      className="px-2 py-1 text-[10px] rounded-full border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {preset.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button onClick={addCategory}
            className="w-full bg-gray-900 text-white py-2 rounded-full text-sm font-semibold hover:bg-gray-800 active:scale-[0.98] transition-all shadow-sm">
            Create Category
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" /></div>
      ) : categories.length === 0 ? (
        <p className="text-gray-400 text-center py-6 bg-white rounded-lg border text-sm">No categories yet</p>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white border border-gray-200 rounded-lg p-4">
              {editId === cat.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} />
                    <input value={editForm.slug} onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })} className={inputCls} />
                  </div>
                  <input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Description" className={inputCls} />
                  <div className="flex gap-1.5">
                    <button onClick={() => updateCategory(cat.id)} className="flex-1 bg-gray-900 text-white py-1.5 rounded-full text-xs font-semibold hover:bg-gray-800 active:scale-[0.97] flex items-center justify-center gap-1 transition-all shadow-sm"><Check size={12} /> Save</button>
                    <button onClick={() => setEditId(null)} className="flex-1 bg-gray-100 text-gray-600 py-1.5 rounded-full text-xs font-semibold hover:bg-gray-200 active:scale-[0.97] flex items-center justify-center gap-1 transition-all"><X size={12} /> Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-semibold text-gray-900 capitalize">{cat.name}</h3>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{cat.slug}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cat.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                          {cat.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {cat.description && <p className="text-xs text-gray-500">{cat.description}</p>}
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {cat._count?.subservices ?? 0} subservices · {cat._count?.agents ?? 0} agents
                      </p>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      <button onClick={() => { setEditId(cat.id); setEditForm({ name: cat.name, slug: cat.slug, description: cat.description || "" }); }}
                        className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"><Edit size={14} /></button>
                      <button onClick={() => deleteCategory(cat.id, cat.name)}
                        className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                    </div>
                  </div>

                  {/* Document Requirements */}
                  <div className="border-t border-gray-100 pt-2">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <FileText size={10} /> Document Requirements
                    </p>
                    {cat.documentRequirements?.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No document requirements</p>
                    ) : (
                      <div className="space-y-1">
                        {cat.documentRequirements?.map((req: any) => (
                          <div key={req.id} className="flex items-center justify-between bg-gray-50 rounded px-2.5 py-1.5">
                            <div>
                              <span className="text-xs text-gray-700">{req.name}</span>
                              {req.isRequired && <span className="text-[9px] text-red-500 ml-1 font-bold">REQUIRED</span>}
                              {req.description && <p className="text-[10px] text-gray-400">{req.description}</p>}
                            </div>
                            <button onClick={() => deleteDocReq(req.id)} className="text-gray-300 hover:text-red-500 transition"><Trash2 size={12} /></button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add requirement to existing category */}
                    {addReqForm.categoryId === cat.id ? (
                      <div className="mt-2 space-y-1.5">
                        <div>
                          <p className="text-[10px] text-gray-500 mb-1">Quick add standard documents:</p>
                          <div className="flex flex-wrap gap-1">
                            {STANDARD_DOCUMENTS.map((preset) => (
                              <button
                                key={`${cat.id}-${preset.name}`}
                                type="button"
                                onClick={() =>
                                  setAddReqForm((prev) => ({
                                    ...prev,
                                    categoryId: cat.id,
                                    name: preset.name,
                                    description: preset.description,
                                  }))
                                }
                                className="px-2 py-1 text-[10px] rounded-full border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                              >
                                {preset.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        <input placeholder="Requirement name" value={addReqForm.name} onChange={(e) => setAddReqForm({ ...addReqForm, name: e.target.value })}
                          className="w-full px-2 py-1.5 border rounded-md text-xs outline-none focus:ring-1 focus:ring-gray-400" />
                        <input placeholder="Description (optional)" value={addReqForm.description} onChange={(e) => setAddReqForm({ ...addReqForm, description: e.target.value })}
                          className="w-full px-2 py-1.5 border rounded-md text-xs outline-none focus:ring-1 focus:ring-gray-400" />
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1 text-xs text-gray-600">
                            <input type="checkbox" checked={addReqForm.isRequired} onChange={(e) => setAddReqForm({ ...addReqForm, isRequired: e.target.checked })} className="rounded" /> Required
                          </label>
                          <div className="flex gap-1 flex-1 justify-end">
                            <button onClick={addDocReq} className="px-3 py-1 bg-gray-900 text-white rounded-full text-[10px] font-semibold hover:bg-gray-800 active:scale-[0.97] transition-all">Add</button>
                            <button onClick={() => setAddReqForm({ name: "", description: "", isRequired: true, categoryId: null })} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-semibold hover:bg-gray-200 transition-all">Cancel</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAddReqForm({ name: "", description: "", isRequired: true, categoryId: cat.id })}
                        className="mt-2 flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-900 font-medium transition">
                        <Plus size={10} /> Add Requirement
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
