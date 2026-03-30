import { useEffect, useState } from "react";
import api from "../../api";
import toast from "react-hot-toast";
import { Shield, ShieldOff, X, Eye, Check, XCircle, ChevronDown, ChevronUp, Upload, RefreshCw } from "lucide-react";

export default function AdminAgents() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectingCat, setRejectingCat] = useState<{ agentId: number; categoryId: number } | null>(null);
  const [rejectingDoc, setRejectingDoc] = useState<number | null>(null);
  const [docRejectNote, setDocRejectNote] = useState("");
  const [filter, setFilter] = useState<"all" | "needs-verification" | "resubmitted">("needs-verification");

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

  const reviewDocument = async (docId: number, status: "APPROVED" | "REJECTED") => {
    try {
      await api.patch(`/admin/agents/documents/${docId}`, {
        status,
        rejectionNote: status === "REJECTED" ? docRejectNote : undefined,
      });
      toast.success(status === "APPROVED" ? "Document approved!" : "Document rejected");
      setRejectingDoc(null);
      setDocRejectNote("");
      load();
    } catch (err: any) { toast.error(err.response?.data?.error || "Failed"); }
  };

  // Check if a document has been resubmitted (needs re-review)
  const isResubmitted = (doc: any) =>
    doc.status === "PENDING" && (doc.resubmitCount > 0 || new Date(doc.updatedAt).getTime() > new Date(doc.createdAt).getTime() + 1000);

  const agentsNeedingVerification = agents.filter(
    (agent) =>
      !agent.isVerified ||
      (agent.categories || []).some((ac: any) => !ac.isVerified) ||
      (agent.documents || []).some((d: any) => d.status === "PENDING"),
  );

  const agentsWithResubmittedDocs = agents.filter(
    (agent) => (agent.documents || []).some((d: any) => isResubmitted(d)),
  );

  const visibleAgents =
    filter === "needs-verification"
      ? agentsNeedingVerification
      : filter === "resubmitted"
        ? agentsWithResubmittedDocs
        : agents;

  return (
    <div className="px-4 lg:px-6 py-4 pb-20 md:pb-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h1 className="text-lg font-semibold text-gray-900">Agents</h1>

        <div className="inline-flex rounded-full border border-gray-200 bg-white p-1 flex-wrap">
          <button
            onClick={() => setFilter("resubmitted")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              filter === "resubmitted"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <RefreshCw size={10} className="inline mr-1" />
            Re-uploaded ({agentsWithResubmittedDocs.length})
          </button>
          <button
            onClick={() => setFilter("needs-verification")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              filter === "needs-verification"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Needs review ({agentsNeedingVerification.length})
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              filter === "all"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            All ({agents.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" /></div>
      ) : visibleAgents.length === 0 ? (
        <p className="text-gray-400 text-center py-8 bg-white rounded-lg border text-sm">
          {filter === "needs-verification"
            ? "No agents are pending verification"
            : "No agents registered yet"}
        </p>
      ) : (
        <div className="space-y-3">
          {visibleAgents.map((agent) => {
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
                    {/* Uploaded Documents with approve/reject */}
                    {agent.documents?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Documents</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {agent.documents.map((doc: any) => {
                            const resubmitted = isResubmitted(doc);
                            return (
                            <div key={doc.id} className={`border rounded-lg overflow-hidden ${resubmitted ? "border-blue-400 ring-1 ring-blue-200" : "border-gray-200"}`}>
                              <div className="relative group cursor-pointer" onClick={() => setPreviewImg(doc.url)}>
                                <img src={doc.url} alt={doc.requirement?.name} className="w-full h-24 object-cover" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                                  <Eye size={16} className="text-white opacity-0 group-hover:opacity-100 transition" />
                                </div>
                                {resubmitted && (
                                  <span className="absolute top-1 right-1 text-[8px] px-1.5 py-0.5 rounded font-bold bg-blue-600 text-white">
                                    RE-UPLOADED
                                  </span>
                                )}
                              </div>
                              <div className="p-2">
                                <p className="text-[10px] font-medium text-gray-700 truncate">{doc.requirement?.name || "Document"}</p>
                                <p className="text-[9px] text-gray-400 truncate">{doc.requirement?.category?.name}</p>
                                <div className="flex items-center gap-1 mt-1 flex-wrap">
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                                    doc.status === "APPROVED"
                                      ? "bg-green-100 text-green-700"
                                      : doc.status === "REJECTED"
                                        ? "bg-red-100 text-red-600"
                                        : "bg-yellow-100 text-yellow-700"
                                  }`}>
                                    {doc.status}
                                  </span>
                                </div>
                                <p className="text-[9px] text-gray-400 mt-0.5">
                                  Updated: {new Date(doc.updatedAt).toLocaleString()}
                                </p>
                                {doc.resubmitCount > 0 && (
                                  <p className="text-[9px] text-gray-400">
                                    Re-uploads: {doc.resubmitCount}/5
                                  </p>
                                )}
                                {doc.rejectionNote && <p className="text-[9px] text-red-500 mt-0.5">{doc.rejectionNote}</p>}

                                {/* Document approve/reject buttons */}
                                {doc.status === "PENDING" && (
                                  <div className="mt-2 flex flex-col gap-1">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); reviewDocument(doc.id, "APPROVED"); }}
                                      className="w-full px-2 py-1 bg-green-600 text-white rounded text-[9px] font-semibold hover:bg-green-700 flex items-center justify-center gap-1"
                                      title="Approving may auto-approve the category if all required docs are done"
                                    >
                                      <Check size={10} /> Approve
                                    </button>
                                    {rejectingDoc === doc.id ? (
                                      <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                                        <input
                                          value={docRejectNote}
                                          onChange={(e) => setDocRejectNote(e.target.value)}
                                          placeholder="Reason (required for agent)"
                                          className="w-full px-2 py-1 border rounded text-[9px] outline-none"
                                        />
                                        <p className="text-[8px] text-red-500">This will reject all categories needing this document</p>
                                        <div className="flex gap-1">
                                          <button
                                            onClick={() => reviewDocument(doc.id, "REJECTED")}
                                            className="flex-1 px-2 py-1 bg-red-600 text-white rounded text-[9px] font-semibold hover:bg-red-700"
                                          >
                                            Reject
                                          </button>
                                          <button
                                            onClick={() => { setRejectingDoc(null); setDocRejectNote(""); }}
                                            className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[9px]"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setRejectingDoc(doc.id); }}
                                        className="w-full px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded text-[9px] font-semibold hover:bg-red-100 flex items-center justify-center gap-1"
                                      >
                                        <XCircle size={10} /> Reject
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )})}
                        </div>
                      </div>
                    )}

                    {/* Legacy uploaded docs (view only) */}
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

                    {/* Per-Category Verification */}
                    {agent.categories?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Category Verification</p>
                        <div className="space-y-2">
                          {agent.categories.map((ac: any) => {
                            const categoryDocs = (agent.documents || []).filter(
                              (d: any) => d.requirement?.categoryId === ac.category?.id,
                            );
                            const pendingDocs = categoryDocs.filter((d: any) => d.status === "PENDING");
                            const rejectedDocs = categoryDocs.filter((d: any) => d.status === "REJECTED");
                            const approvedDocs = categoryDocs.filter((d: any) => d.status === "APPROVED");
                            const hasResubmitted = categoryDocs.some(
                              (d: any) => d.status === "PENDING" && (d.resubmitCount > 0 || new Date(d.updatedAt).getTime() > new Date(d.createdAt).getTime() + 1000),
                            );

                            const statusLabel = ac.isVerified
                              ? "Verified"
                              : ac.rejectionNote
                                ? "Rejected"
                                : "Pending";
                            const statusCls = ac.isVerified
                              ? "bg-green-100 text-green-700"
                              : ac.rejectionNote
                                ? "bg-red-100 text-red-600"
                                : "bg-yellow-100 text-yellow-700";

                            return (
                              <div key={ac.id} className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div>
                                    <span className="text-sm font-medium text-gray-900 capitalize">{ac.category?.name}</span>
                                    <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-medium ${statusCls}`}>
                                      {statusLabel}
                                    </span>
                                    {hasResubmitted && (
                                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-100 text-blue-700">
                                        Resubmitted
                                      </span>
                                    )}
                                    <p className="text-[9px] text-gray-400 mt-0.5">
                                      Docs: {approvedDocs.length} approved, {pendingDocs.length} pending, {rejectedDocs.length} rejected
                                    </p>
                                    {ac.rejectionNote && (
                                      <p className="text-[10px] text-red-500 mt-0.5">{ac.rejectionNote}</p>
                                    )}
                                  </div>
                                  {!ac.isVerified && (
                                    <div className="flex gap-1 flex-wrap">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); verifyCategory(agent.id, ac.category?.id, "approve"); }}
                                        className="px-3 py-1 bg-green-600 text-white rounded-full text-[10px] font-semibold hover:bg-green-700 active:scale-[0.97] transition-all flex items-center gap-1"
                                        title="This will also approve all pending documents for this category"
                                      >
                                        <Check size={10} /> Approve All
                                      </button>
                                      {rejectingCat?.agentId === agent.id && rejectingCat?.categoryId === ac.category?.id ? (
                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                          <input
                                            value={rejectNote}
                                            onChange={(e) => setRejectNote(e.target.value)}
                                            placeholder="Reason for agent"
                                            className="px-2 py-1 border rounded text-[10px] w-32 outline-none"
                                          />
                                          <button
                                            onClick={() => verifyCategory(agent.id, ac.category?.id, "reject")}
                                            className="px-2 py-1 bg-red-600 text-white rounded-full text-[10px] font-semibold hover:bg-red-700 transition-all"
                                          >
                                            Reject
                                          </button>
                                          <button onClick={() => setRejectingCat(null)} className="text-gray-400 hover:text-gray-600">
                                            <X size={12} />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setRejectingCat({ agentId: agent.id, categoryId: ac.category?.id }); }}
                                          className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-semibold hover:bg-red-100 border border-red-200 active:scale-[0.97] transition-all flex items-center gap-1"
                                          title="Only rejects category, documents stay as-is"
                                        >
                                          <XCircle size={10} /> Reject
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
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
