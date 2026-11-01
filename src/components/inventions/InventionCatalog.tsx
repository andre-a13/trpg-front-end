import { type FormEvent, useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Plus, Trash2, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";
import inventionService from "../../services/invention.service";
import type { InventionDto } from "../../types/api";
import "./inventions.scss";

export default function InventionCatalog() {
  const { t } = useTranslation();
  const [items, setItems] = useState<InventionDto[]>([]);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      setItems(await inventionService.list());
    } catch {
      setFeedback({ error: true, text: t("inventions.errors.catalog") });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const item = await inventionService.add(name.trim());
      setItems((current) => [...current, item].sort((a, b) => a.id - b.id));
      setName("");
      setFeedback({ error: false, text: t("inventions.catalog.added") });
    } catch (cause) {
      setFeedback({ error: true, text: t(
        axios.isAxiosError(cause) && cause.response?.status === 409
          ? "inventions.errors.duplicate" : "inventions.errors.add",
      ) });
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: InventionDto) {
    if (busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      await inventionService.remove(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setFeedback({ error: false, text: t("inventions.catalog.removed") });
    } catch {
      setFeedback({ error: true, text: t("inventions.errors.remove") });
    } finally {
      setBusy(false);
    }
  }

  const filtered = items.filter((item) => item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));

  return (
    <section className="admin-panel admin-panel--wide invention-catalog" aria-labelledby="invention-catalog-title">
      <header className="admin-panel__header">
        <Wrench size={18} aria-hidden="true" />
        <h2 id="invention-catalog-title">{t("inventions.catalog.title")}</h2>
        <span className="invention-catalog__count">{items.length}</span>
      </header>
      <form className="admin-form invention-catalog__form" onSubmit={(event) => void add(event)}>
        <label htmlFor="invention-name">{t("inventions.catalog.name")}
          <input id="invention-name" required maxLength={200} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <button type="submit" disabled={busy || loading || !name.trim()}>
          <Plus size={16} aria-hidden="true" /> {t("common.actions.add")}
        </button>
      </form>
      {feedback && <p className={feedback.error ? "inventions-error" : "inventions-success"} role={feedback.error ? "alert" : "status"}>{feedback.text}</p>}
      {loading ? <p>{t("common.loading")}</p> : (
        <div className="invention-catalog__body">
          <label htmlFor="invention-search">{t("inventions.catalog.search")}</label>
          <input id="invention-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
          {feedback?.error && <button type="button" onClick={() => void load()} disabled={busy}>{t("inventions.retry")}</button>}
          <ul className="invention-catalog__list">
            {filtered.map((item) => (
              <li key={item.id}>
                <span>{item.name}</span>
                <button type="button" disabled={busy} onClick={() => void remove(item)} aria-label={t("inventions.catalog.remove", { name: item.name })}>
                  <Trash2 size={15} aria-hidden="true" /> {t("common.actions.delete")}
                </button>
              </li>
            ))}
          </ul>
          {filtered.length === 0 && <p>{t("inventions.catalog.empty")}</p>}
          <p className="invention-catalog__hint">{t("inventions.catalog.help")}</p>
        </div>
      )}
    </section>
  );
}
