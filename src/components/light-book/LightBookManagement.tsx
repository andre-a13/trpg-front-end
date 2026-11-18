import { useEffect, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import type { LightWordResponse } from "../../api/generated/types.gen";
import type Character from "../../models/character";
import characterService from "../../services/character.service";
import lightBookService from "../../services/light-book.service";

type Props = {
  words: LightWordResponse[];
  onCreate: (word: LightWordResponse) => void;
};

type Feedback = { key: string; error?: boolean };

export default function LightBookManagement({ words, onCreate }: Props) {
  const { t } = useTranslation();
  const [characters, setCharacters] = useState<Character[] | null>(null);
  const [characterLoadFailed, setCharacterLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [wordId, setWordId] = useState("");
  const [characterSlug, setCharacterSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [createFeedback, setCreateFeedback] = useState<Feedback | null>(null);
  const [unlockFeedback, setUnlockFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    let active = true;
    characterService.listAll().then((items) => {
      if (active) setCharacters(items);
    }).catch(() => {
      if (active) setCharacterLoadFailed(true);
    });
    return () => { active = false; };
  }, [loadAttempt]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    setCreateFeedback(null);
    try {
      const word = await lightBookService.createWord(name, description);
      onCreate(word);
      setWordId(String(word.id));
      setName("");
      setDescription("");
      setCreateFeedback({ key: "lightBook.wordCreated" });
    } catch (error) {
      const duplicate = isAxiosError(error) && error.response?.status === 409;
      setCreateFeedback({ key: duplicate ? "lightBook.errors.duplicate" : "lightBook.errors.create", error: true });
    } finally {
      setCreating(false);
    }
  }

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!wordId || !characterSlug || unlocking) return;
    setUnlocking(true);
    setUnlockFeedback(null);
    try {
      await lightBookService.unlockWord(characterSlug, Number(wordId));
      setUnlockFeedback({ key: "lightBook.wordUnlocked" });
    } catch {
      setUnlockFeedback({ key: "lightBook.errors.unlock", error: true });
    } finally {
      setUnlocking(false);
    }
  }

  return (
    <details className="light-catalogue__management">
      <summary>{t("lightBook.manage")}</summary>
      <div className="light-catalogue__forms">
        <form onSubmit={(event) => void create(event)}>
          <label>{t("lightBook.wordName")}<input required maxLength={200} value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>{t("lightBook.wordDescription")}<textarea maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          <button type="submit" disabled={creating || !name.trim()}>{t("lightBook.createWord")}</button>
          {createFeedback && <p role={createFeedback.error ? "alert" : "status"}>{t(createFeedback.key)}</p>}
        </form>
        <form onSubmit={(event) => void unlock(event)}>
          <label>
            {t("lightBook.availableWord")}
            <select required value={wordId} onChange={(event) => { setWordId(event.target.value); setUnlockFeedback(null); }}>
              <option value="">{t(words.length ? "lightBook.chooseWord" : "lightBook.noAvailableWords")}</option>
              {words.map((word) => <option key={word.id} value={word.id}>{word.name}</option>)}
            </select>
          </label>
          <label>
            {t("lightBook.catalogue.character")}
            <select required disabled={!characters?.length} value={characterSlug}
              onChange={(event) => { setCharacterSlug(event.target.value); setUnlockFeedback(null); }}>
              <option value="">{t(characters?.length === 0 ? "lightBook.settings.noCharacters" : "lightBook.catalogue.chooseCharacter")}</option>
              {characters?.map((character) => <option key={character.id} value={character.slug}>{character.name}</option>)}
            </select>
          </label>
          {characterLoadFailed && (
            <p role="alert">
              {t("lightBook.errors.characters")} <button type="button" onClick={() => { setCharacterLoadFailed(false); setLoadAttempt((count) => count + 1); }}>{t("lightBook.retry")}</button>
            </p>
          )}
          <button type="submit" disabled={unlocking || !wordId || !characterSlug}>{t("lightBook.unlockWord")}</button>
          {unlockFeedback && <p role={unlockFeedback.error ? "alert" : "status"}>{t(unlockFeedback.key)}</p>}
        </form>
      </div>
    </details>
  );
}
