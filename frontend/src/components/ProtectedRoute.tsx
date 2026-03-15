import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { ReactNode } from "react";

export default function ProtectedRoute({ children, role }: { children: ReactNode; role: string }) {
  const { isAuthenticated, role: currentRole } = useAuth();
  const loginPath = role === "ADMIN" ? "/admin/login" : "/login";

  if (!isAuthenticated) return <Navigate to={loginPath} replace />;
  if (currentRole !== role) return <Navigate to={loginPath} replace />;

  return <>{children}</>;
}
