import { useEffect, useState, type FormEvent } from "react";
import { BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { LightBookSettingsResponse } from "../../api/generated/types.gen";
import type Character from "../../models/character";
import lightBookService from "../../services/light-book.service";
import { characterPath, withOrigin } from "../navigation/navigationPaths";

type CharacterRow = Pick<Character, "id" | "name" | "slug">;

function SlotCountForm({ character, initialCount }: { character: CharacterRow; initialCount: number }) {
  const { t } = useTranslation();
  const [saved, setSaved] = useState(initialCount);
  const [value, setValue] = useState(String(initialCount));
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<"saved" | "error" | null>(null);
  const parsed = Number(value);
  const valid = value !== "" && Number.isSafeInteger(parsed) && parsed >= 0;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || busy || saved === parsed) return;
    setBusy(true);
    setFeedback(null);
    try {
      const result = await lightBookService.setSlots(character.slug, parsed);
      setSaved(result.slotCount);
      setValue(String(result.slotCount));
      setFeedback("saved");
    } catch {
      setFeedback("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={(event) => void save(event)}>
      <label>
        {t("lightBook.settings.slotCountFor", { character: character.name })}
        <input type="number" required min={0} step={1} max={Number.MAX_SAFE_INTEGER} value={value}
          disabled={busy} onChange={(event) => { setValue(event.target.value); setFeedback(null); }} />
      </label>
      <button type="submit" disabled={busy || !valid || saved === parsed}>{t("lightBook.settings.save")}</button>
      {feedback && <span role={feedback === "error" ? "alert" : "status"}>{t(`lightBook.settings.${feedback}`)}</span>}
    </form>
  );
}

export default function LightBookSettings({ characters }: { characters: CharacterRow[] }) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Record<string, LightBookSettingsResponse> | null>(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    lightBookService.listSettings(controller.signal).then((result) => {
      if (!controller.signal.aborted) setSettings(result);
    }).catch(() => {
      if (!controller.signal.aborted) setError(true);
    });
    return () => controller.abort();
  }, [reload]);

  return (
    <section className="admin-panel admin-panel--wide" aria-labelledby="light-book-settings-title">
      <header className="admin-panel__header">
        <BookOpen size={18} aria-hidden="true" />
        <h2 id="light-book-settings-title">{t("lightBook.settings.title")}</h2>
      </header>
      <Link to={withOrigin("/light-words", "/dashboard")}>{t("lightBook.catalogue.title")}</Link>
      {error && (
        <p role="alert">{t("lightBook.settings.loadError")} <button type="button" onClick={() => { setError(false); setReload((current) => current + 1); }}>{t("lightBook.retry")}</button></p>
      )}
      {!settings && !error && <p role="status">{t("common.loading")}</p>}
      {settings && (
        <div className="admin-tableWrap">
          <table className="admin-table">
            <thead><tr><th scope="col">{t("lightBook.settings.character")}</th><th scope="col">{t("lightBook.settings.slots")}</th></tr></thead>
            <tbody>
              {characters.map((character) => (
                <tr key={character.id}>
                  <th scope="row"><Link to={characterPath(character.slug, "/dashboard")}>{character.name}</Link></th>
                  <td><SlotCountForm character={character} initialCount={settings[character.id]?.slotCount ?? 0} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!characters.length && <p>{t("lightBook.settings.noCharacters")}</p>}
        </div>
      )}
    </section>
  );
}
