import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";
import toast from "react-hot-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRoleState] = useState<"USER" | "AGENT">("USER");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = role === "USER" ? "/auth/user/login" : "/auth/agent/login";
      const res = await api.post(endpoint, { email, password });
      const data = res.data;
      const userData = data.user || data.agent;
      login(data.token, { ...userData, role }, role);
      toast.success("Login successful!");
      if (role === "USER") navigate("/");
      else navigate("/agent/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-sm p-6">
        <div className="text-center mb-6">
          <h1 className="text-lg font-bold text-gray-900">Urban<span className="text-amber-500">Comp</span></h1>
          <p className="text-gray-400 text-xs mt-0.5">Home services at your doorstep</p>
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-md p-0.5 mb-5">
          {(["USER", "AGENT"] as const).map((r) => (
            <button key={r} onClick={() => setRoleState(r)}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition ${
                role === r ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"
              }`}>
              {r === "USER" ? "Customer" : "Service Partner"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] text-gray-400 uppercase font-medium mb-1">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-1 focus:ring-gray-400 focus:bg-white outline-none text-sm"
              placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 uppercase font-medium mb-1">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-1 focus:ring-gray-400 focus:bg-white outline-none text-sm"
              placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-gray-900 text-white rounded-full text-sm font-semibold hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50 transition-all shadow-sm">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-5">
          Don't have an account?{" "}
          <Link to="/register" className="text-gray-900 hover:underline font-semibold">Register</Link>
        </p>
      </div>
    </div>
  );
}
