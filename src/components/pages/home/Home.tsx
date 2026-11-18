import { useEffect, useId, useState } from "react";
import { ArrowRight, BookOpen, LayoutDashboard, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../../auth/useAuth";
import { publicApiOptions } from "../../../services/api";
import { systemHealth } from "../../../api/generated/sdk.gen";
import PortalFrame from "./PortalFrame";
import useTimeOfDay from "./useTimeOfDay";
import "./home.scss";

type ServerStatus = "checking" | "online" | "offline";

function useServerStatus() {
  const [status, setStatus] = useState<ServerStatus>("checking");
  useEffect(() => {
    let mounted = true;
    let controller: AbortController | undefined;
    let timeoutId: number | undefined;
    async function checkHealth() {
      controller = new AbortController();
      timeoutId = window.setTimeout(() => controller?.abort(), 4500);
      try {
        await systemHealth({ ...publicApiOptions, signal: controller.signal });
        if (mounted) setStatus("online");
      } catch {
        if (mounted) setStatus("offline");
      } finally {
        window.clearTimeout(timeoutId);
      }
    }
    void checkHealth();
    const interval = window.setInterval(() => void checkHealth(), 30000);
    return () => {
      mounted = false;
      controller?.abort();
      window.clearTimeout(timeoutId);
      window.clearInterval(interval);
    };
  }, []);
  return status;
}

export default function Home() {
  const status = useServerStatus();
  const { t } = useTranslation();
  const { isAuthenticated, isInitializing, logout, user } = useAuth();
  const navigate = useNavigate();
  const timeOfDay = useTimeOfDay();
  const apertureId = useId();

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // AuthProvider clears the local session even if the server is unreachable.
    }
    navigate("/", { replace: true });
  }

  return (
    <main className={`portal-home portal-home--${timeOfDay}`} aria-label={t("home.title")}>
      <div className="portal-home__backdrop" aria-hidden="true" />
      <header className="portal-home__header">
        <div className="portal-home__account">
          {isAuthenticated && (
            <Link to="/light-words" aria-label={t("lightBook.catalogue.title")} title={t("lightBook.catalogue.title")}>
              <BookOpen size={17} aria-hidden="true" />
            </Link>
          )}
          {user?.role === "admin" && (
            <Link to="/dashboard" aria-label={t("navigation.dashboard")} title={t("navigation.dashboard")}>
              <LayoutDashboard size={17} aria-hidden="true" />
            </Link>
          )}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => void handleLogout()}
              aria-label={t("home.actions.logout", { username: user?.username })}
              title={t("home.actions.logout", { username: user?.username })}
            >
              <LogOut size={17} aria-hidden="true" />
            </button>
          )}
        </div>
      </header>

      <section className="portal-home__stage" aria-label={t("home.portal.enter")}>
        <div className="portal-home__scene" aria-hidden="true">
          <svg className="portal-home__world" viewBox="0 0 900 1040" focusable="false">
            <defs>
              <clipPath id={apertureId}>
                <path d="M198 1040V425C198 292 294 190 450 118C606 190 702 292 702 425V1040Z" />
              </clipPath>
              <linearGradient id={`${apertureId}-shade`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#13231d" stopOpacity=".4" />
                <stop offset=".4" stopColor="#13231d" stopOpacity="0" />
                <stop offset="1" stopColor="#07130f" stopOpacity=".95" />
              </linearGradient>
            </defs>
            <g clipPath={`url(#${apertureId})`}>
              <image href="/assets/campaign_bg.png" width="900" height="1040" preserveAspectRatio="xMidYMid slice" />
              <rect width="900" height="1040" fill={`url(#${apertureId}-shade)`} />
            </g>
          </svg>
          <PortalFrame />
        </div>

        <div className="portal-home__content">
          <div className="portal-home__entrance">
            <Link className="portal-home__enter" to={isAuthenticated ? "/teams" : "/login"}>
              {t("home.portal.enter")}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            {!isInitializing && !isAuthenticated && (
              <div className="portal-home__session">
                <Link to="/register">{t("home.actions.register")}</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="portal-home__footer">
        <div className={`portal-home__status portal-home__status--${status}`} role="status">
          <span aria-hidden="true" />
          {t(`home.server.${status}`)}
        </div>
      </footer>
    </main>
  );
}
