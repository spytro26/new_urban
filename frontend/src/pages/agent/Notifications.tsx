import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import { Bell, CheckCheck } from "lucide-react";

type AgentNotification = {
  id: string;
  kind: string;
  message: string;
  description?: string;
  createdAt: string;
};

export default function AgentNotifications() {
  const [notifications, setNotifications] = useState<AgentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("agent-read-notification-ids");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const load = () => {
    setLoading(true);
    api
      .get("/agents/notifications")
      .then((r) => setNotifications(r.data.notifications || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !readIds.includes(n.id)).length,
    [notifications, readIds],
  );

  const markAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    localStorage.setItem("agent-read-notification-ids", JSON.stringify(allIds));
  };

  const markRead = (id: string) => {
    if (readIds.includes(id)) return;
    const next = [...readIds, id];
    setReadIds(next);
    localStorage.setItem("agent-read-notification-ids", JSON.stringify(next));
  };

  return (
    <div className="px-4 lg:px-6 py-4 pb-20 md:pb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Notifications</h1>
          <p className="text-xs text-gray-500">
            {unreadCount} unread · {notifications.length} total
          </p>
        </div>
        {notifications.length > 0 && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800 transition"
          >
            <CheckCheck size={13} /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
        </div>
      ) : notifications.length === 0 ? (
        <p className="text-gray-400 text-center py-8 bg-white rounded-lg border text-sm">
          No notifications right now
        </p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const isRead = readIds.includes(n.id);
            return (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`w-full text-left rounded-lg border p-3 transition ${
                  isRead
                    ? "bg-white border-gray-200"
                    : "bg-amber-50 border-amber-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                      <Bell size={13} className={isRead ? "text-gray-400" : "text-amber-600"} />
                      {n.message}
                    </p>
                    {n.description && (
                      <p className="text-xs text-gray-600 mt-1">{n.description}</p>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-400 shrink-0">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
