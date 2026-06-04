import { useEffect, useState } from "react";
import { LogIn, LogOut, Sparkles, Swords, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../../auth/useAuth";
import { apiBaseUrl } from "../../../services/api";
import LanguageSwitch from "../../language-switch/LanguageSwitch";
import "./home.scss";

type ServerStatus = "checking" | "online" | "offline";

function useServerStatus() {
  const [status, setStatus] = useState<ServerStatus>("checking");

  useEffect(() => {
    let isMounted = true;
    const healthBaseUrl = apiBaseUrl.replace(/\/$/, "");

    async function checkHealth() {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 4500);

      try {
        const response = await fetch(`${healthBaseUrl}/health`, {
          signal: controller.signal,
        });

        if (isMounted) setStatus(response.ok ? "online" : "offline");
      } catch {
        if (isMounted) setStatus("offline");
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    checkHealth();
    const intervalId = window.setInterval(checkHealth, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return status;
}

export default function Home() {
  const status = useServerStatus();
  const { t } = useTranslation();
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const statusText = t(`home.server.${status}`);

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <main className="trpg-landing">
      <LanguageSwitch />

      <div className="trpg-landing__status" title={statusText} aria-label={statusText}>
        <span className={`trpg-landing__campfire trpg-landing__campfire--${status}`} aria-hidden="true">
          <img src="/assets/campfire.svg" alt="" />
        </span>
        <span>{statusText}</span>
      </div>

      <section className="trpg-landing__hero" aria-labelledby="trpg-landing-title">
        <p className="trpg-landing__eyebrow">
          <Sparkles size={16} aria-hidden="true" />
          {t("home.eyebrow")}
        </p>
        <h1 id="trpg-landing-title">{t("home.title")}</h1>
        <p className="trpg-landing__intro">{t("home.intro")}</p>

        <div className="trpg-landing__actions">
          {isAuthenticated ? (
            <>
              <Link className="trpg-landing__action trpg-landing__action--primary" to="/teams">
                <Swords size={18} aria-hidden="true" />
                {t("home.actions.openTable")}
              </Link>
              <button className="trpg-landing__action" type="button" onClick={handleLogout}>
                <LogOut size={18} aria-hidden="true" />
                {t("home.actions.logout", { username: user?.username })}
              </button>
            </>
          ) : (
            <>
              <Link className="trpg-landing__action trpg-landing__action--primary" to="/login">
                <LogIn size={18} aria-hidden="true" />
                {t("home.actions.login")}
              </Link>
              <Link className="trpg-landing__action" to="/register">
                <UserPlus size={18} aria-hidden="true" />
                {t("home.actions.register")}
              </Link>
            </>
          )}
        </div>
      </section>

      <div className="trpg-landing__sigil" aria-hidden="true">
        <Swords size={54} />
      </div>
    </main>
  );
}
