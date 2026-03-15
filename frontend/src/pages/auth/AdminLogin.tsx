import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";
import toast from "react-hot-toast";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/admin/login", { email, password });
      const data = res.data;
      login(data.token, { ...data.admin, role: "ADMIN" }, "ADMIN");
      toast.success("Welcome, Admin!");
      navigate("/admin/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-sm p-6">
        <div className="text-center mb-6">
          <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-2">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-base font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-400 text-xs">UrbanComp Management</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-gray-400 outline-none text-sm"
            placeholder="admin@urban.com" />
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-gray-400 outline-none text-sm"
            placeholder="Password" />
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-gray-900 text-white rounded-full text-sm font-semibold hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50 transition-all shadow-sm">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
