import { type FormEvent, useState } from "react";
import axios from "axios";
import { UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../../auth/useAuth";
import CampfireHomeButton from "../../navigation/CampfireHomeButton";
import "../../../auth/auth.scss";

export default function Register() {
  const { t } = useTranslation();
  const { isAuthenticated, register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus(null);
    setError(null);
    setIsSubmitting(true);

    try {
      await register({ username, password });
      setUsername("");
      setPassword("");

      if (isAuthenticated) {
        setStatus(t("auth.register.status.created"));
      } else {
        navigate("/teams", { replace: true });
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError(t("auth.register.errors.adminRequired"));
      } else if (axios.isAxiosError(err) && err.response?.status === 409) {
        setError(t("auth.register.errors.usernameExists"));
      } else {
        setError(t("auth.register.errors.failed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <CampfireHomeButton />

      <section className="auth-page__hero" aria-labelledby="register-title">
        <h1 id="register-title">{t("auth.register.title")}</h1>
        <p>{t("auth.register.description")}</p>
      </section>

      <section className="auth-panel" aria-label={t("auth.register.formLabel")}>
        <h2>{t("auth.register.heading")}</h2>
        <p className="auth-panel__intro">{t("auth.register.intro")}</p>

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
              autoComplete="new-password"
              minLength={12}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <button type="submit" disabled={isSubmitting}>
            <UserPlus size={17} aria-hidden="true" />
            {isSubmitting ? t("auth.register.submitting") : t("auth.register.submit")}
          </button>
        </form>

        {status && <p className="auth-panel__message">{status}</p>}
        {error && <p className="auth-panel__message auth-panel__message--error">{error}</p>}

        <p className="auth-panel__switch">
          {t("auth.register.switchPrefix")} <Link to="/login">{t("auth.register.switchLink")}</Link>
        </p>
      </section>
    </main>
  );
}
