import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "./useAuth";
import type { UserRole } from "../types/api";
import "./auth.scss";

type ProtectedRouteProps = {
  requiredRole?: UserRole;
};

export default function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isInitializing, user } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <main className="auth-loading">
        <div className="auth-loading__spinner" aria-hidden="true" />
        <p>Checking session...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/teams" replace />;
  }

  return (
    <>
      <Outlet />
    </>
  );
}
