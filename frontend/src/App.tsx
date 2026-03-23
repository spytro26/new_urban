import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import AdminLogin from "./pages/auth/AdminLogin";

import UserHome from "./pages/user/Dashboard";
import NewOrder from "./pages/user/NewOrder";
import OrderDetail from "./pages/user/OrderDetail";
import UserProfile from "./pages/user/Profile";
import Notifications from "./pages/user/Notifications";

import AgentDashboard from "./pages/agent/Dashboard";
import AgentJobs from "./pages/agent/Jobs";
import AgentJobDetail from "./pages/agent/JobDetail";
import AgentProfile from "./pages/agent/Profile";
import AgentEarnings from "./pages/agent/Earnings";
import AgentNotifications from "./pages/agent/Notifications";

import AdminDashboard from "./pages/admin/Dashboard";
import AdminCities from "./pages/admin/Cities";
import AdminSubservices from "./pages/admin/Subservices";
import AdminOrders from "./pages/admin/Orders";
import AdminAgents from "./pages/admin/Agents";
import AdminCategories from "./pages/admin/Categories";
import AdminSettlements from "./pages/admin/Settlements";

function RoleRedirect() {
  const { role } = useAuth();
  if (role === "USER") return <Navigate to="/user/home" replace />;
  if (role === "AGENT") return <Navigate to="/agent/dashboard" replace />;
  if (role === "ADMIN") return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50/80">
      <Navbar />
      <main className="pb-6">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Root redirect */}
        <Route path="/" element={<RoleRedirect />} />

        {/* User routes */}
        <Route path="/user/home" element={<ProtectedRoute role="USER"><AppLayout><UserHome /></AppLayout></ProtectedRoute>} />
        <Route path="/user/dashboard" element={<Navigate to="/user/home" replace />} />
        <Route path="/user/order" element={<ProtectedRoute role="USER"><AppLayout><NewOrder /></AppLayout></ProtectedRoute>} />
        <Route path="/user/orders/:orderId" element={<ProtectedRoute role="USER"><AppLayout><OrderDetail /></AppLayout></ProtectedRoute>} />
        <Route path="/user/profile" element={<ProtectedRoute role="USER"><AppLayout><UserProfile /></AppLayout></ProtectedRoute>} />
        <Route path="/user/notifications" element={<ProtectedRoute role="USER"><AppLayout><Notifications /></AppLayout></ProtectedRoute>} />

        {/* Agent routes */}
        <Route path="/agent/dashboard" element={<ProtectedRoute role="AGENT"><AppLayout><AgentDashboard /></AppLayout></ProtectedRoute>} />
        <Route path="/agent/jobs" element={<ProtectedRoute role="AGENT"><AppLayout><AgentJobs /></AppLayout></ProtectedRoute>} />
        <Route path="/agent/jobs/:jobId" element={<ProtectedRoute role="AGENT"><AppLayout><AgentJobDetail /></AppLayout></ProtectedRoute>} />
        <Route path="/agent/profile" element={<ProtectedRoute role="AGENT"><AppLayout><AgentProfile /></AppLayout></ProtectedRoute>} />
        <Route path="/agent/earnings" element={<ProtectedRoute role="AGENT"><AppLayout><AgentEarnings /></AppLayout></ProtectedRoute>} />
        <Route path="/agent/notifications" element={<ProtectedRoute role="AGENT"><AppLayout><AgentNotifications /></AppLayout></ProtectedRoute>} />

        {/* Admin routes */}
        <Route path="/admin/dashboard" element={<ProtectedRoute role="ADMIN"><AppLayout><AdminDashboard /></AppLayout></ProtectedRoute>} />
        <Route path="/admin/cities" element={<ProtectedRoute role="ADMIN"><AppLayout><AdminCities /></AppLayout></ProtectedRoute>} />
        <Route path="/admin/subservices" element={<ProtectedRoute role="ADMIN"><AppLayout><AdminSubservices /></AppLayout></ProtectedRoute>} />
        <Route path="/admin/orders" element={<ProtectedRoute role="ADMIN"><AppLayout><AdminOrders /></AppLayout></ProtectedRoute>} />
        <Route path="/admin/agents" element={<ProtectedRoute role="ADMIN"><AppLayout><AdminAgents /></AppLayout></ProtectedRoute>} />
        <Route path="/admin/categories" element={<ProtectedRoute role="ADMIN"><AppLayout><AdminCategories /></AppLayout></ProtectedRoute>} />
        <Route path="/admin/settlements" element={<ProtectedRoute role="ADMIN"><AppLayout><AdminSettlements /></AppLayout></ProtectedRoute>} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
