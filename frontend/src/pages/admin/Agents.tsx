import { useEffect, useState } from "react";
import api from "../../api";
import toast from "react-hot-toast";
import { Shield, ShieldOff, X, Eye, Check, XCircle, ChevronDown, ChevronUp, Upload } from "lucide-react";

export default function AdminAgents() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectingCat, setRejectingCat] = useState<{ agentId: number; categoryId: number } | null>(null);
  const [rejectingDoc, setRejectingDoc] = useState<number | null>(null);
  const [docRejectNote, setDocRejectNote] = useState("");

  const load = () => {
    api.get("/admin/agents").then((r) => { setAgents(r.data.agents); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const verifyCategory = async (agentId: number, categoryId: number, action: "approve" | "reject") => {
    try {
      await api.patch(`/admin/agents/${agentId}/categories/${categoryId}/verify`, {
        action,
        rejectionNote: action === "reject" ? rejectNote : undefined,
      });
      toast.success(action === "approve" ? "Category verified!" : "Category rejected");
      setRejectingCat(null);
      setRejectNote("");
      load();
    } catch (err: any) { toast.error(err.response?.data?.error || "Failed"); }
  };

  const handleDoc = async (docId: number, status: "APPROVED" | "REJECTED") => {
    try {
      await api.patch(`/admin/agents/documents/${docId}`, {
        status,
        rejectionNote: status === "REJECTED" ? docRejectNote : undefined,
      });
      toast.success(status === "APPROVED" ? "Document approved" : "Document rejected");
      setRejectingDoc(null);
      setDocRejectNote("");
      load();
    } catch { toast.error("Failed"); }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-700",
      APPROVED: "bg-green-100 text-green-700",
      REJECTED: "bg-red-100 text-red-600",
    };
    return map[status] || "bg-gray-100 text-gray-600";
  };

  return (
    <div className="px-4 lg:px-6 py-4">
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Agents</h1>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" /></div>
      ) : agents.length === 0 ? (
        <p className="text-gray-400 text-center py-8 bg-white rounded-lg border text-sm">No agents registered yet</p>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => {
            const expanded = expandedAgent === agent.id;
            return (
              <div key={agent.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {/* Agent Header */}
                <div className="p-4 cursor-pointer" onClick={() => setExpandedAgent(expanded ? null : agent.id)}>
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <p className="font-semibold text-sm text-gray-900">{agent.name}</p>
                        {agent.categories?.map((ac: any) => (
                          <span key={ac.id} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${ac.isVerified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {ac.category?.name}
                          </span>
                        ))}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${agent.isAvailable ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {agent.isAvailable ? "Online" : "Offline"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{agent.email}</p>
                      <p className="text-xs text-gray-400">{agent.rating > 0 ? `★ ${agent.rating}` : "No rating"} · {agent._count?.orders ?? 0} orders</p>
                      {agent.address?.[0]?.city && <p className="text-[11px] text-gray-400 capitalize mt-0.5">{agent.address[0].city}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold ${agent.isVerified ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                        {agent.isVerified ? <Shield size={13} /> : <ShieldOff size={13} />}
                        {agent.isVerified ? "Verified" : "Unverified"}
                      </span>
                      {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Detail */}
                {expanded && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
                    {/* Per-Category Verification */}
                    {agent.categories?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Category Verification</p>
                        <div className="space-y-2">
                          {agent.categories.map((ac: any) => (
                            <div key={ac.id} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-sm font-medium text-gray-900 capitalize">{ac.category?.name}</span>
                                  <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-medium ${ac.isVerified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                    {ac.isVerified ? "Verified" : "Pending"}
                                  </span>
                                  {ac.rejectionNote && <p className="text-[10px] text-red-500 mt-0.5">Rejected: {ac.rejectionNote}</p>}
                                </div>
                                {!ac.isVerified && (
                                  <div className="flex gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); verifyCategory(agent.id, ac.category?.id, "approve"); }}
                                      className="px-3 py-1 bg-green-600 text-white rounded-full text-[10px] font-semibold hover:bg-green-700 active:scale-[0.97] transition-all flex items-center gap-1">
                                      <Check size={10} /> Approve
                                    </button>
                                    {rejectingCat?.agentId === agent.id && rejectingCat?.categoryId === ac.category?.id ? (
                                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        <input value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Rejection reason"
                                          className="px-2 py-1 border rounded text-[10px] w-28 outline-none" />
                                        <button onClick={() => verifyCategory(agent.id, ac.category?.id, "reject")}
                                          className="px-2 py-1 bg-red-600 text-white rounded-full text-[10px] font-semibold hover:bg-red-700 transition-all">Reject</button>
                                        <button onClick={() => setRejectingCat(null)} className="text-gray-400 hover:text-gray-600"><X size={12} /></button>
                                      </div>
                                    ) : (
                                      <button onClick={(e) => { e.stopPropagation(); setRejectingCat({ agentId: agent.id, categoryId: ac.category?.id }); }}
                                        className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-semibold hover:bg-red-100 border border-red-200 active:scale-[0.97] transition-all flex items-center gap-1">
                                        <XCircle size={10} /> Reject
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Documents */}
                    {agent.documents?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Documents</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {agent.documents.map((doc: any) => (
                            <div key={doc.id} className="border border-gray-200 rounded-lg overflow-hidden">
                              <div className="relative group cursor-pointer" onClick={() => setPreviewImg(doc.url)}>
                                <img src={doc.url} alt={doc.requirement?.name} className="w-full h-24 object-cover" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                                  <Eye size={16} className="text-white opacity-0 group-hover:opacity-100 transition" />
                                </div>
                              </div>
                              <div className="p-2">
                                <p className="text-[10px] font-medium text-gray-700 truncate">{doc.requirement?.name || "Document"}</p>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${statusBadge(doc.status)}`}>{doc.status}</span>
                                {doc.rejectionNote && <p className="text-[9px] text-red-500 mt-0.5">{doc.rejectionNote}</p>}
                                {doc.status === "PENDING" && (
                                  <div className="flex gap-1 mt-1.5">
                                    <button onClick={() => handleDoc(doc.id, "APPROVED")}
                                      className="flex-1 bg-green-600 text-white py-1 rounded-full text-[9px] font-semibold hover:bg-green-700 active:scale-[0.97] transition-all">Approve</button>
                                    {rejectingDoc === doc.id ? (
                                      <div className="flex-1 space-y-1">
                                        <input value={docRejectNote} onChange={(e) => setDocRejectNote(e.target.value)} placeholder="Reason"
                                          className="w-full px-1.5 py-0.5 border rounded text-[9px] outline-none" />
                                        <div className="flex gap-0.5">
                                          <button onClick={() => handleDoc(doc.id, "REJECTED")}
                                            className="flex-1 bg-red-600 text-white py-0.5 rounded-full text-[9px] font-semibold">Reject</button>
                                          <button onClick={() => setRejectingDoc(null)} className="text-gray-400"><X size={10} /></button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button onClick={() => setRejectingDoc(doc.id)}
                                        className="flex-1 bg-red-50 text-red-600 py-1 rounded-full text-[9px] font-semibold hover:bg-red-100 border border-red-200 transition-all">Reject</button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Legacy documents */}
                    {(agent.id_proof || agent.address_proof) && (!agent.documents || agent.documents.length === 0) && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Legacy Documents</p>
                        <div className="flex gap-3">
                          {agent.id_proof && (
                            <div className="flex-1">
                              <p className="text-[10px] text-gray-400 mb-1">ID Proof</p>
                              <div className="relative group rounded overflow-hidden border border-gray-200 bg-gray-50 cursor-pointer"
                                onClick={() => setPreviewImg(agent.id_proof)}>
                                <img src={agent.id_proof} alt="ID Proof" className="w-full h-20 object-cover" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                                  <Eye size={16} className="text-white opacity-0 group-hover:opacity-100 transition" />
                                </div>
                              </div>
                            </div>
                          )}
                          {agent.address_proof && (
                            <div className="flex-1">
                              <p className="text-[10px] text-gray-400 mb-1">Address Proof</p>
                              <div className="relative group rounded overflow-hidden border border-gray-200 bg-gray-50 cursor-pointer"
                                onClick={() => setPreviewImg(agent.address_proof)}>
                                <img src={agent.address_proof} alt="Address Proof" className="w-full h-20 object-cover" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                                  <Eye size={16} className="text-white opacity-0 group-hover:opacity-100 transition" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {!agent.id_proof && !agent.address_proof && (!agent.documents || agent.documents.length === 0) && !agent.isVerified && (
                      <p className="text-[11px] text-red-400 italic flex items-center gap-1"><Upload size={11} /> No documents submitted</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Full-screen image preview lightbox */}
      {previewImg && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImg(null)}>
          <button onClick={() => setPreviewImg(null)}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 rounded-full p-2 transition">
            <X size={24} className="text-white" />
          </button>
          <img src={previewImg} alt="Document Preview" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
