import { useEffect, useState } from "react";
import { Sparkles, Swords } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitch from "../../language-switch/LanguageSwitch";
import "./home.scss";

type ServerStatus = "checking" | "online" | "offline";

function getApiBaseUrl() {
  return import.meta.env.VITE_TRPG_API_URL ?? "http://localhost:8000";
}

function useServerStatus() {
  const [status, setStatus] = useState<ServerStatus>("checking");

  useEffect(() => {
    let isMounted = true;
    const apiBaseUrl = getApiBaseUrl().replace(/\/$/, "");

    async function checkHealth() {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 4500);

      try {
        const response = await fetch(`${apiBaseUrl}/health`, {
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
  const statusText = t(`home.server.${status}`);

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
      </section>

      <div className="trpg-landing__sigil" aria-hidden="true">
        <Swords size={54} />
      </div>
    </main>
  );
}
