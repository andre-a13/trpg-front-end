import React, { useMemo, useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import characterService from "../../services/character.service";
import type { IAddCharacter } from "../../interface/IAddCharacter";

type Stats = { corps: number; mental: number; social: number };

export default function Form() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [race, setRace] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [portraitUrl, setPortraitUrl] = useState("");
  const [corps, setCorps] = useState(0);
  const [mental, setMental] = useState(0);
  const [social, setSocial] = useState(0);
  const [skillsPrimary, setSkillsPrimary] = useState("");
  const [skillsSecondary, setSkillsSecondary] = useState("");
  const [inventory, setInventory] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [createdCharacter, setCreatedCharacter] = useState<{ id: number; name: string; slug: string } | null>(null);

  const slugError = useMemo(() => {
    if (!slug) return null;
    return /^[a-z0-9-]+$/.test(slug) ? null : t("createCharacter.validation.slug");
  }, [slug, t]);

  function slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function csvToList(s: string) {
    return s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setCreatedCharacter(null);
    if (slugError) return;

    const payload: IAddCharacter = {
      name,
      race,
      slug,
      portraitUrl: portraitUrl || undefined,
      stats: { corps: Number(corps), mental: Number(mental), social: Number(social) } as Stats,
      skillsPrimary: csvToList(skillsPrimary),
      skillsSecondary: csvToList(skillsSecondary),
      inventory: csvToList(inventory),
    };

    try {
      const res = await characterService.create(payload);
      const data = res.data;
      setStatus(t("createCharacter.created", { id: data.id, name: data.name }));
      setCreatedCharacter({ id: data.id, name: data.name, slug });
      setName("");
      setRace("");
      setSlug("");
      setSlugTouched(false);
      setPortraitUrl("");
      setCorps(0);
      setMental(0);
      setSocial(0);
      setSkillsPrimary("");
      setSkillsSecondary("");
      setInventory("");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setStatus(t("common.errors.status", { status: err.response?.status ?? "network", message: err.message }));
        return;
      }
      setStatus(t("createCharacter.failed"));
    }
  }

  return (
    <form className="trpg-form trpg-form--character" onSubmit={handleSubmit}>
      <h2>{t("createCharacter.title")}</h2>

      <fieldset>
        <legend>{t("createCharacter.sections.identity")}</legend>
        <div>
          <label htmlFor="character-name">{t("createCharacter.name")}</label>
          <input
            id="character-name"
            value={name}
            onChange={(e) => {
              const nextName = e.target.value;
              setName(nextName);
              if (!slugTouched) setSlug(slugify(nextName));
            }}
            required
          />
        </div>
        <div>
          <label htmlFor="character-race">{t("createCharacter.race")}</label>
          <input id="character-race" value={race} onChange={(e) => setRace(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="character-slug">{t("createCharacter.slug")}</label>
          <input
            id="character-slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            required
            aria-invalid={Boolean(slugError)}
          />
          {slugError && <p className="trpg-form__field-error">{slugError}</p>}
        </div>
        <div>
          <label htmlFor="character-portrait">{t("createCharacter.portraitUrl")}</label>
          <input id="character-portrait" value={portraitUrl} onChange={(e) => setPortraitUrl(e.target.value)} />
        </div>
      </fieldset>

      <fieldset>
        <legend>{t("createCharacter.sections.stats")}</legend>
        <div className="trpg-form__stat-grid">
          <div>
            <label htmlFor="character-corps">{t("characterCard.stats.corps")}</label>
            <input id="character-corps" type="number" value={corps} onChange={(e) => setCorps(Number(e.target.value))} min={0} max={100} />
          </div>
          <div>
            <label htmlFor="character-mental">{t("characterCard.stats.mental")}</label>
            <input id="character-mental" type="number" value={mental} onChange={(e) => setMental(Number(e.target.value))} min={0} max={100} />
          </div>
          <div>
            <label htmlFor="character-social">{t("characterCard.stats.social")}</label>
            <input id="character-social" type="number" value={social} onChange={(e) => setSocial(Number(e.target.value))} min={0} max={100} />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>{t("createCharacter.sections.play")}</legend>
        <div>
          <label htmlFor="character-primary-skills">{t("createCharacter.primarySkills")}</label>
          <input id="character-primary-skills" value={skillsPrimary} onChange={(e) => setSkillsPrimary(e.target.value)} />
        </div>
        <div>
          <label htmlFor="character-secondary-skills">{t("createCharacter.secondarySkills")}</label>
          <input id="character-secondary-skills" value={skillsSecondary} onChange={(e) => setSkillsSecondary(e.target.value)} />
        </div>
        <div>
          <label htmlFor="character-inventory">{t("createCharacter.inventory")}</label>
          <input id="character-inventory" value={inventory} onChange={(e) => setInventory(e.target.value)} />
        </div>
      </fieldset>

      <div style={{ marginTop: 12 }}>
        <button type="submit" disabled={Boolean(slugError)}>{t("common.actions.create")}</button>
      </div>

      {status && (
        <div className="trpg-form__status">
          <strong>{status}</strong>
          {createdCharacter && (
            <div className="trpg-form__next-actions">
              <Link to={`/characters/${createdCharacter.slug}`}>{t("createCharacter.next.openSheet")}</Link>
              <Link to="/characters/new">{t("createCharacter.next.createAnother")}</Link>
              <Link to="/teams">{t("createCharacter.next.returnTeams")}</Link>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
