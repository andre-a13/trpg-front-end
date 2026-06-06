import { type FormEvent, useEffect, useState } from "react";
import axios from "axios";
import { LogIn } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../../../auth/useAuth";
import CampfireHomeButton from "../../navigation/CampfireHomeButton";
import "../../../auth/auth.scss";

function getSafeNext(rawNext: string | null) {
  if (rawNext?.startsWith("/") && !rawNext.startsWith("//")) return rawNext;
  return "/teams";
}

export default function Login() {
  const { t } = useTranslation();
  const { isAuthenticated, isInitializing, login } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const next = getSafeNext(searchParams.get("next"));

  useEffect(() => {
    if (!isInitializing && isAuthenticated) {
      navigate(next, { replace: true });
    }
  }, [isAuthenticated, isInitializing, navigate, next]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ username, password });
      navigate(next, { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError(t("auth.login.errors.invalidCredentials"));
      } else {
        setError(t("auth.login.errors.failed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <CampfireHomeButton />

      <section className="auth-page__hero" aria-labelledby="login-title">
        <h1 id="login-title">{t("auth.login.title")}</h1>
        <p>{t("auth.login.description")}</p>
      </section>

      <section className="auth-panel" aria-label={t("auth.login.formLabel")}>
        <h2>{t("auth.login.heading")}</h2>
        <p className="auth-panel__intro">{t("auth.login.intro")}</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            {t("auth.fields.username")}
            <input
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>

          <label>
            {t("auth.fields.password")}
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <button type="submit" disabled={isSubmitting}>
            <LogIn size={17} aria-hidden="true" />
            {isSubmitting ? t("auth.login.submitting") : t("auth.login.submit")}
          </button>
        </form>

        {error && <p className="auth-panel__message auth-panel__message--error">{error}</p>}

        <p className="auth-panel__switch">
          {t("auth.login.switchPrefix")} <Link to="/register">{t("auth.login.switchLink")}</Link>
        </p>
      </section>
    </main>
  );
}
