import { useEffect, useState } from "react";
import api from "../../api";
import { Bell, Check } from "lucide-react";

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get("/users/notifications").then((r) => { setNotifications(r.data.notifications); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: number) => {
    await api.patch(`/users/notifications/${id}/read`);
    load();
  };

  const markAllRead = async () => {
    await api.patch("/users/notifications/read-all");
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" /></div>;

  return (
    <div className="px-4 lg:px-6 py-4 pb-20 md:pb-6">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-lg font-semibold text-gray-900">Notifications</h1>
        {notifications.some((n) => !n.isRead) && (
          <button onClick={markAllRead} className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 font-medium">
            <Check size={12} /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg border">
          <Bell className="mx-auto text-gray-300 mb-2" size={24} />
          <p className="text-gray-400 text-sm">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {notifications.map((n) => (
            <div key={n.id}
              className={`bg-white rounded-lg border p-3 ${n.isRead ? "border-gray-100" : "border-blue-200 bg-blue-50/50"}`}>
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className={`text-sm ${n.isRead ? "text-gray-600" : "text-gray-900 font-medium"}`}>{n.message.replace(/#\d+/g, "").replace(/\s{2,}/g, " ").trim()}</p>
                  {n.description && <p className="text-xs text-gray-400 mt-0.5">{n.description}</p>}
                  <p className="text-[11px] text-gray-300 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.isRead && (
                  <button onClick={() => markRead(n.id)} className="text-[11px] text-blue-600 hover:underline shrink-0">Read</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
