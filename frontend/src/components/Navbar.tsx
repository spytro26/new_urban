import { useAuth } from "../context/AuthContext";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { user, role, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!isAuthenticated) return null;

  const links: { label: string; to: string }[] = (() => {
    if (role === "USER") return [
      { label: "Home", to: "/user/home" },
      { label: "Profile", to: "/user/profile" },
      { label: "Notifications", to: "/user/notifications" },
    ];
    if (role === "AGENT") return [
      { label: "Dashboard", to: "/agent/dashboard" },
      { label: "My Jobs", to: "/agent/jobs" },
      { label: "Notifications", to: "/agent/notifications" },
      { label: "Earnings", to: "/agent/earnings" },
      { label: "Profile", to: "/agent/profile" },
    ];
    if (role === "ADMIN") return [
      { label: "Dashboard", to: "/admin/dashboard" },
      { label: "Orders", to: "/admin/orders" },
      { label: "Agents", to: "/admin/agents" },
      { label: "Categories", to: "/admin/categories" },
      { label: "Cities", to: "/admin/cities" },
      { label: "Services", to: "/admin/subservices" },
      { label: "Settlements", to: "/admin/settlements" },
    ];
    return [];
  })();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 lg:px-6">
        <div className="flex justify-between h-14 items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900 tracking-tight">Urban<span className="text-amber-600">Comp</span></span>
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                {role?.toLowerCase()}
              </span>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-0.5">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                    location.pathname === l.to
                      ? "bg-gray-900 text-white"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <span className="text-xs text-gray-400">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>

          {/* Mobile menu toggle */}
          <button className="md:hidden p-1" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <div className="px-3 py-2 space-y-0.5">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === l.to
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-2 mt-2 border-t border-gray-100">
              <p className="px-3 py-1 text-xs text-gray-400">{user?.email}</p>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
