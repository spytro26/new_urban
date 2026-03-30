import { Link } from "react-router-dom";
import { MapPin, Wrench, FileText, Settings, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AdminMore() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const menuItems = [
    { to: "/admin/cities", label: "Cities", icon: <MapPin size={20} />, desc: "Manage serviceable cities" },
    { to: "/admin/subservices", label: "Services", icon: <Wrench size={20} />, desc: "Manage subservices & pricing" },
    { to: "/admin/settlements", label: "Settlements", icon: <FileText size={20} />, desc: "Revenue reports & payouts" },
    { to: "/admin/settings", label: "Settings", icon: <Settings size={20} />, desc: "Contact info & FAQs" },
  ];

  return (
    <div className="px-4 py-4 pb-20 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-4">More</h1>

      <div className="space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all active:scale-[0.98]"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-gray-600">{item.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          </Link>
        ))}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-red-200 hover:bg-red-50 transition-all active:scale-[0.98] mt-4"
        >
          <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
            <LogOut size={20} className="text-red-600" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-red-600">Logout</p>
            <p className="text-xs text-gray-500">Sign out of your account</p>
          </div>
        </button>
      </div>
    </div>
  );
}
