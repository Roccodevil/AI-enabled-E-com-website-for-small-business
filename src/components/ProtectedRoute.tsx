import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  requireTransport = false,
}: {
  children: ReactNode;
  requireAdmin?: boolean;
  requireTransport?: boolean;
}) {
  const { role } = useAuth();
  if (!role) return <Navigate to="/login" replace />;
  if (requireAdmin && role !== "admin") return <Navigate to="/catalog" replace />;
  if (requireTransport && role !== "transport") return <Navigate to="/catalog" replace />;
  return <>{children}</>;
}
