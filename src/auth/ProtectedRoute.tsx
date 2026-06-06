import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "./useAuth";
import "./auth.scss";

export default function ProtectedRoute() {
  const { isAuthenticated, isInitializing } = useAuth();
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

  return (
    <>
      <Outlet />
    </>
  );
}
