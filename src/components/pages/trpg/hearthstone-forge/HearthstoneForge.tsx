import { type FormEvent, useEffect, useReducer, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Flame,
  Gem,
  Home,
  ImagePlus,
  Printer,
  RotateCcw,
  Sparkles,
  Trash2,
  WandSparkles,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import CardPreview from "./CardPreview";
import {
  applyCriticalRetouch,
  createStoredCard,
  evaluateRetouch,
  GEM_RULES,
  getRetouchThreshold,
  PHASE_ORDER,
  pickFlaw,
  resolveForge,
  rollD100,
  rollD6,
  scorePhase,
  SKILL_BY_PHASE,
} from "./game";
import { normalizeIllustration } from "./image";
import { loadForgeCards, loadForgeSkills, saveForgeCards, saveForgeSkills } from "./storage";
import type {
  CardDraft,
  CriticalAdjustment,
  FlawId,
  ForgeResolution,
  ForgeView,
  PhaseKey,
  PhaseResult,
  Posture,
  Rarity,
  RetouchAdjustment,
  SkillKey,
  StoredForgeCardV1,
} from "./types";
import "./hearthstone-forge.scss";

type PhaseStatus = "choosing" | "retouch" | "criticalChoice" | "complete";

type ForgeState = {
  view: ForgeView;
  draft: CardDraft;
  selectedPosture: Posture | null;
  phaseStatus: PhaseStatus;
  phaseResults: PhaseResult[];
  lastRoll: number | null;
  selectedRetouch: RetouchAdjustment | null;
  resolution: ForgeResolution | null;
  resultCard: StoredForgeCardV1 | null;
  collection: StoredForgeCardV1[];
  storageError: boolean;
};

type ForgeAction =
  | { type: "START_NEW" }
  | { type: "OPEN_COLLECTION" }
  | { type: "RETURN_LANDING" }
  | { type: "UPDATE_DRAFT"; patch: Partial<CardDraft> }
  | { type: "BEGIN_RITUAL" }
  | { type: "SELECT_POSTURE"; posture: Posture }
  | { type: "ROLL_PHASE"; result: PhaseResult }
  | { type: "SELECT_RETOUCH"; adjustment: RetouchAdjustment }
  | { type: "SKIP_RETOUCH" }
  | { type: "RESOLVE_RETOUCH"; result: PhaseResult }
  | { type: "APPLY_CRITICAL_RETOUCH"; result: PhaseResult }
  | { type: "ADVANCE_PHASE" }
  | { type: "REVEAL"; resolution: ForgeResolution; card?: StoredForgeCardV1 }
  | { type: "FINALIZE_UNSTABLE"; card: StoredForgeCardV1 }
  | { type: "RETRY_SAME_CARD" }
  | { type: "DELETE_CARD"; id: string }
  | { type: "STORAGE_ERROR" }
  | { type: "STORAGE_SAVED" };

type HearthstoneForgeProps = {
  dieRoller?: () => number;
  skillRoller?: () => number;
  chaosRoller?: () => number;
  flawPicker?: () => FlawId;
  storage?: Storage;
};

const POSTURE_ICONS = {
  precise: Sparkles,
  steady: WandSparkles,
  forced: Zap,
} satisfies Record<Posture, typeof Sparkles>;

const DIE_FACES = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const SKILL_ORDER: SkillKey[] = ["runology", "artCalligraphy", "gemologyEnchantment"];
const NEGATIVE_RETOUCH_OPTIONS: RetouchAdjustment[] = [-1, -2, -3];
const POSITIVE_RETOUCH_OPTIONS: RetouchAdjustment[] = [1, 2, 3];
const NEGATIVE_CRITICAL_OPTIONS: CriticalAdjustment[] = [-1, -2, -3];
const POSITIVE_CRITICAL_OPTIONS: CriticalAdjustment[] = [1, 2, 3];

function emptyDraft(skills: CardDraft["skills"] = { runology: null, artCalligraphy: null, gemologyEnchantment: null }): CardDraft {
  return {
    name: "",
    minionType: "",
    illustration: { kind: "fallback" },
    manaCost: 0,
    attack: 1,
    health: 1,
    effect: "",
    rarity: "common",
    skills: { ...skills },
  };
}

function initialState(storage: Storage): ForgeState {
  return {
    view: "landing",
    draft: emptyDraft(loadForgeSkills(storage)),
    selectedPosture: null,
    phaseStatus: "choosing",
    phaseResults: [],
    lastRoll: null,
    selectedRetouch: null,
    resolution: null,
    resultCard: null,
    collection: loadForgeCards(storage),
    storageError: false,
  };
}

function resetRitual(state: ForgeState, view: ForgeView): ForgeState {
  return {
    ...state,
    view,
    selectedPosture: null,
    phaseStatus: "choosing",
    phaseResults: [],
    lastRoll: null,
    selectedRetouch: null,
    resolution: null,
    resultCard: null,
  };
}

function reducer(state: ForgeState, action: ForgeAction): ForgeState {
  switch (action.type) {
    case "START_NEW":
      return { ...resetRitual(state, "design"), draft: emptyDraft(state.draft.skills) };
    case "OPEN_COLLECTION":
      return { ...state, view: "collection" };
    case "RETURN_LANDING":
      return { ...state, view: "landing" };
    case "UPDATE_DRAFT":
      return { ...state, draft: { ...state.draft, ...action.patch } };
    case "BEGIN_RITUAL":
      return resetRitual(state, "ink");
    case "SELECT_POSTURE":
      return state.phaseStatus === "choosing" ? { ...state, selectedPosture: action.posture } : state;
    case "ROLL_PHASE":
      return {
        ...state,
        phaseResults: [...state.phaseResults.filter((item) => item.phase !== action.result.phase), action.result],
        lastRoll: action.result.roll,
        selectedRetouch: null,
        phaseStatus: "retouch",
      };
    case "SELECT_RETOUCH":
      return state.phaseStatus === "retouch" ? { ...state, selectedRetouch: action.adjustment } : state;
    case "SKIP_RETOUCH":
      return state.phaseStatus === "retouch" ? { ...state, selectedRetouch: null, phaseStatus: "complete" } : state;
    case "RESOLVE_RETOUCH":
      return {
        ...state,
        phaseResults: [...state.phaseResults.filter((item) => item.phase !== action.result.phase), action.result],
        phaseStatus: action.result.retouch?.outcome === "criticalSuccess" ? "criticalChoice" : "complete",
      };
    case "APPLY_CRITICAL_RETOUCH":
      return {
        ...state,
        phaseResults: [...state.phaseResults.filter((item) => item.phase !== action.result.phase), action.result],
        phaseStatus: "complete",
      };
    case "ADVANCE_PHASE": {
      const nextView: Record<PhaseKey, ForgeView> = { ink: "paint", paint: "gem", gem: "resolving" };
      if (!PHASE_ORDER.includes(state.view as PhaseKey)) return state;
      return {
        ...state,
        view: nextView[state.view as PhaseKey],
        selectedPosture: null,
        phaseStatus: "choosing",
        lastRoll: null,
        selectedRetouch: null,
      };
    }
    case "REVEAL":
      if (action.resolution.outcome === "unstable") {
        return { ...state, view: "unstableChoice", resolution: action.resolution };
      }
      return {
        ...state,
        view: "result",
        resolution: action.resolution,
        resultCard: action.card ?? null,
        collection: action.card ? [action.card, ...state.collection] : state.collection,
      };
    case "FINALIZE_UNSTABLE":
      return {
        ...state,
        view: "result",
        resultCard: action.card,
        collection: [action.card, ...state.collection],
      };
    case "RETRY_SAME_CARD":
      return resetRitual(state, "design");
    case "DELETE_CARD":
      return { ...state, collection: state.collection.filter((card) => card.id !== action.id) };
    case "STORAGE_ERROR":
      return { ...state, storageError: true };
    case "STORAGE_SAVED":
      return state.storageError ? { ...state, storageError: false } : state;
    default:
      return state;
  }
}

function isPhaseView(view: ForgeView): view is PhaseKey {
  return view === "ink" || view === "paint" || view === "gem";
}

function reactionTier(roll: number): "low" | "mid" | "high" {
  if (roll <= 2) return "low";
  if (roll <= 4) return "mid";
  return "high";
}

export default function HearthstoneForge({
  dieRoller = rollD6,
  skillRoller = rollD100,
  chaosRoller = rollD6,
  flawPicker = () => pickFlaw(),
  storage = window.localStorage,
}: HearthstoneForgeProps) {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(reducer, storage, initialState);
  const [imageError, setImageError] = useState<string | null>(null);
  const [designError, setDesignError] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);

  useEffect(() => {
    try {
      saveForgeCards(state.collection, storage);
      dispatch({ type: "STORAGE_SAVED" });
    } catch {
      dispatch({ type: "STORAGE_ERROR" });
    }
  }, [state.collection, storage]);

  useEffect(() => {
    try {
      saveForgeSkills(state.draft.skills, storage);
    } catch {
      // La dernière saisie valide reste en mémoire tant que le stockage est indisponible.
    }
  }, [state.draft.skills, storage]);

  const currentPhase = isPhaseView(state.view) ? state.view : null;
  const currentPhaseResult = currentPhase ? state.phaseResults.find((result) => result.phase === currentPhase) : undefined;
  const currentSkill = currentPhase ? SKILL_BY_PHASE[currentPhase] : null;
  const currentSkillScore = currentSkill ? state.draft.skills[currentSkill] : null;
  const gemColor = GEM_RULES[state.draft.rarity].color;
  const targetScore = GEM_RULES[state.draft.rarity].target;
  const currentScore = state.phaseResults.reduce((total, result) => total + result.score, 0);

  function updateDraft(patch: Partial<CardDraft>) {
    setDesignError(null);
    dispatch({ type: "UPDATE_DRAFT", patch });
  }

  function submitDesign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (processingImage) return;
    if (!state.draft.name.trim() || !state.draft.effect.trim()) {
      setDesignError(t("hearthstoneForge.design.requiredError"));
      return;
    }
    if (Object.values(state.draft.skills).some((score) => score === null || !Number.isInteger(score) || score < 0 || score > 100)) {
      setDesignError(t("hearthstoneForge.design.skillsError"));
      return;
    }
    setDesignError(null);
    dispatch({ type: "BEGIN_RITUAL" });
  }

  async function handleImageFile(file?: File) {
    if (!file) return;
    setImageError(null);
    setProcessingImage(true);

    try {
      const value = await normalizeIllustration(file);
      updateDraft({ illustration: { kind: "dataUrl", value } });
    } catch (error) {
      const code = error instanceof Error ? error.message : "processing-failed";
      setImageError(t(`hearthstoneForge.design.imageErrors.${code}`));
    } finally {
      setProcessingImage(false);
    }
  }

  function handleRoll() {
    if (!currentPhase || !state.selectedPosture || state.phaseStatus !== "choosing") return;
    const roll = dieRoller();
    const score = scorePhase(state.selectedPosture, roll);
    dispatch({
      type: "ROLL_PHASE",
      result: {
        phase: currentPhase,
        posture: state.selectedPosture,
        roll,
        baseScore: score,
        score,
      },
    });
  }

  function handleRetouch() {
    if (!currentPhase || !currentPhaseResult || state.phaseStatus !== "retouch" || state.selectedRetouch === null) return;
    const skill = SKILL_BY_PHASE[currentPhase];
    const skillScore = state.draft.skills[skill];
    if (skillScore === null) return;

    const roll = skillRoller();
    const chaosDirection = roll >= 96 ? (chaosRoller() <= 3 ? -1 : 1) : 1;
    const evaluation = evaluateRetouch(
      currentPhaseResult.score,
      skill,
      skillScore,
      state.selectedRetouch,
      roll,
      chaosDirection,
    );

    dispatch({
      type: "RESOLVE_RETOUCH",
      result: { ...currentPhaseResult, score: evaluation.score, retouch: evaluation.attempt },
    });
  }

  function handleCriticalRetouch(adjustment: CriticalAdjustment) {
    if (!currentPhaseResult?.retouch || currentPhaseResult.retouch.outcome !== "criticalSuccess") return;
    const resolved = applyCriticalRetouch(currentPhaseResult.baseScore, adjustment);
    dispatch({
      type: "APPLY_CRITICAL_RETOUCH",
      result: {
        ...currentPhaseResult,
        score: resolved.score,
        retouch: { ...currentPhaseResult.retouch, appliedAdjustment: resolved.appliedAdjustment },
      },
    });
  }

  function revealResult() {
    const resolution = resolveForge(state.draft, state.phaseResults);
    const card = resolution.outcome === "stable" ? createStoredCard(state.draft, "stable") : undefined;
    dispatch({ type: "REVEAL", resolution, card });
  }

  function finalizeUnstable(mode: "singleUse" | "flawed") {
    const flaw = mode === "flawed" ? flawPicker() : undefined;
    const card = createStoredCard(state.draft, "unstable", { unstableMode: mode, flaw });
    dispatch({ type: "FINALIZE_UNSTABLE", card });
  }

  function deleteCard(card: StoredForgeCardV1) {
    if (!window.confirm(t("hearthstoneForge.collection.deleteConfirm", { name: card.name }))) return;
    dispatch({ type: "DELETE_CARD", id: card.id });
  }

  return (
    <main
      className="forge-page"
      data-scene={state.view}
      data-phase={currentPhase ?? undefined}
      data-rarity={state.draft.rarity}
      data-outcome={state.resolution?.outcome}
    >
      <div className="forge-page__smoke" aria-hidden="true" />
      <header className="forge-topbar">
        <button type="button" className="forge-topbar__brand" onClick={() => dispatch({ type: "RETURN_LANDING" })}>
          <Printer size={19} aria-hidden="true" />
          <span>{t("hearthstoneForge.title")}</span>
        </button>
        <Link to="/teams" className="forge-topbar__exit">
          <Home size={17} aria-hidden="true" />
          <span>{t("hearthstoneForge.actions.leave")}</span>
        </Link>
      </header>

      {state.storageError && (
        <div className="forge-storage-warning" role="alert">
          {t("hearthstoneForge.collection.storageError")}
        </div>
      )}

      {state.view === "landing" && (
        <section className="forge-landing" aria-labelledby="forge-landing-title">
          <div className="forge-landing__sigil" aria-hidden="true">
            <Flame size={58} />
          </div>
          <p className="forge-eyebrow">{t("hearthstoneForge.landing.eyebrow")}</p>
          <h1 id="forge-landing-title">{t("hearthstoneForge.landing.title")}</h1>
          <p className="forge-landing__intro">{t("hearthstoneForge.landing.intro")}</p>
          <div className="forge-landing__actions">
            <button type="button" className="forge-button forge-button--primary" onClick={() => dispatch({ type: "START_NEW" })}>
              <Flame size={20} aria-hidden="true" />
              {t("hearthstoneForge.landing.newCard")}
            </button>
            <button type="button" className="forge-button" onClick={() => dispatch({ type: "OPEN_COLLECTION" })}>
              <BookOpen size={20} aria-hidden="true" />
              {t("hearthstoneForge.landing.collection", { count: state.collection.length })}
            </button>
          </div>
        </section>
      )}

      {state.view === "design" && (
        <section className="forge-design" aria-labelledby="forge-design-title">
          <form className="forge-design__form" onSubmit={submitDesign}>
            <div className="forge-section-heading">
              <button type="button" className="forge-icon-button" onClick={() => dispatch({ type: "RETURN_LANDING" })} aria-label={t("hearthstoneForge.actions.back")}>
                <ArrowLeft size={20} />
              </button>
              <div>
                <p className="forge-eyebrow">{t("hearthstoneForge.design.eyebrow")}</p>
                <h1 id="forge-design-title">{t("hearthstoneForge.design.title")}</h1>
              </div>
            </div>

            <div className="forge-form-grid">
              <label className="forge-form-grid__half">
                {t("hearthstoneForge.design.name")}
                <input
                  required
                  maxLength={80}
                  value={state.draft.name}
                  onChange={(event) => updateDraft({ name: event.target.value })}
                  placeholder={t("hearthstoneForge.design.namePlaceholder")}
                />
              </label>

              <label className="forge-form-grid__half">
                {t("hearthstoneForge.design.minionType")}
                <input
                  maxLength={40}
                  value={state.draft.minionType}
                  onChange={(event) => updateDraft({ minionType: event.target.value })}
                  placeholder={t("hearthstoneForge.design.minionTypePlaceholder")}
                />
              </label>

              <label className="forge-form-grid__wide">
                {t("hearthstoneForge.design.effect")}
                <textarea
                  required
                  maxLength={300}
                  value={state.draft.effect}
                  onChange={(event) => updateDraft({ effect: event.target.value })}
                  placeholder={t("hearthstoneForge.design.effectPlaceholder")}
                />
                <span className="forge-field-hint">{state.draft.effect.length}/300</span>
              </label>

              <label className="forge-form-grid__stat">
                {t("hearthstoneForge.design.mana")}
                <input type="number" required min={0} max={20} value={state.draft.manaCost} onChange={(event) => updateDraft({ manaCost: Number(event.target.value) })} />
              </label>
              <label className="forge-form-grid__stat">
                {t("hearthstoneForge.design.attack")}
                <input type="number" required min={0} max={99} value={state.draft.attack} onChange={(event) => updateDraft({ attack: Number(event.target.value) })} />
              </label>
              <label className="forge-form-grid__stat">
                {t("hearthstoneForge.design.health")}
                <input type="number" required min={1} max={99} value={state.draft.health} onChange={(event) => updateDraft({ health: Number(event.target.value) })} />
              </label>
            </div>

            <fieldset className="forge-choice-group">
              <legend>{t("hearthstoneForge.design.ambition")}</legend>
              <p>{t("hearthstoneForge.design.ambitionHint")}</p>
              <div className="forge-rarity-choices">
                {(["common", "rare", "epic", "legendary"] as Rarity[]).map((rarity) => {
                  const color = GEM_RULES[rarity].color;
                  return (
                    <label className={`forge-rarity-choice forge-rarity-choice--${color}`} key={rarity}>
                      <input type="radio" name="rarity" checked={state.draft.rarity === rarity} onChange={() => updateDraft({ rarity })} />
                      <Gem size={19} aria-hidden="true" />
                      <span>
                        {t(`hearthstoneForge.rarities.${rarity}`)}
                        <small>{t("hearthstoneForge.design.targetScore", { value: GEM_RULES[rarity].target })}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="forge-choice-group">
              <legend>{t("hearthstoneForge.design.skills")}</legend>
              <p>{t("hearthstoneForge.design.skillsHint")}</p>
              <div className="forge-skill-inputs">
                {SKILL_ORDER.map((skill) => (
                  <label key={skill}>
                    {t(`hearthstoneForge.skills.${skill}`)}
                    <span>
                      <input
                        type="number"
                        aria-label={t(`hearthstoneForge.skills.${skill}`)}
                        required
                        min={0}
                        max={100}
                        step={1}
                        value={state.draft.skills[skill] ?? ""}
                        onChange={(event) => updateDraft({
                          skills: {
                            ...state.draft.skills,
                            [skill]: event.target.value === "" ? null : Number(event.target.value),
                          },
                        })}
                      />
                      <small>/ 100</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="forge-choice-group forge-illustration-picker">
              <legend>{t("hearthstoneForge.design.illustration")}</legend>
              <label>
                {t("hearthstoneForge.design.imageUrl")}
                <input
                  type="url"
                  value={state.draft.illustration.kind === "url" ? state.draft.illustration.value ?? "" : ""}
                  onChange={(event) => updateDraft({ illustration: event.target.value ? { kind: "url", value: event.target.value } : { kind: "fallback" } })}
                  placeholder="https://…"
                />
              </label>
              <span>{t("hearthstoneForge.design.or")}</span>
              <label className="forge-file-button">
                <ImagePlus size={18} aria-hidden="true" />
                {processingImage ? t("hearthstoneForge.design.processingImage") : t("hearthstoneForge.design.chooseFile")}
                <input type="file" accept="image/jpeg,image/png,image/webp" disabled={processingImage} onChange={(event) => void handleImageFile(event.target.files?.[0])} />
              </label>
              {imageError && <p className="forge-field-error" role="alert">{imageError}</p>}
            </fieldset>

            {designError && <p className="forge-field-error" role="alert">{designError}</p>}
            <button type="submit" className="forge-button forge-button--primary forge-design__submit" disabled={processingImage}>
              <Flame size={20} aria-hidden="true" />
              {t("hearthstoneForge.design.begin")}
            </button>
          </form>

          <aside className="forge-design__preview">
            <p className="forge-eyebrow">{t("hearthstoneForge.design.preview")}</p>
            <CardPreview card={state.draft} />
          </aside>
        </section>
      )}

      {currentPhase && (
        <section className="forge-ritual" aria-labelledby="forge-phase-title">
          <div className="forge-ritual__status">
            <div className="forge-ritual__progress" aria-label={t("hearthstoneForge.ritual.progressLabel") }>
              {PHASE_ORDER.map((phase, index) => (
                <span key={phase} className={`${phase === currentPhase ? "is-current" : ""} ${PHASE_ORDER.indexOf(currentPhase) > index ? "is-complete" : ""}`}>
                  {t(`hearthstoneForge.phases.${phase}.short`)}
                </span>
              ))}
            </div>
            <div className="forge-print-score" aria-live="polite" aria-label={t("hearthstoneForge.ritual.scoreAria", { current: currentScore, target: targetScore })}>
              <span>
                <small>{t("hearthstoneForge.ritual.currentScore")}</small>
                <strong>{currentScore}</strong>
              </span>
              <i aria-hidden="true">/</i>
              <span>
                <small>{t("hearthstoneForge.ritual.targetScore")}</small>
                <strong>{targetScore}</strong>
              </span>
            </div>
          </div>

          <div className="forge-ritual__machine">
            <div className={`forge-apparatus forge-apparatus--${gemColor}`} aria-hidden="true">
              <span className="forge-apparatus__ring" />
              <span className="forge-apparatus__claw forge-apparatus__claw--left" />
              <span className="forge-apparatus__claw forge-apparatus__claw--right" />
            </div>
            <CardPreview card={state.draft} />
          </div>

          <div className="forge-ritual__controls">
            <p className="forge-eyebrow">{t(`hearthstoneForge.phases.${currentPhase}.eyebrow`)}</p>
            <h1 id="forge-phase-title">{t(`hearthstoneForge.phases.${currentPhase}.title`)}</h1>
            <p className="forge-ritual__prompt">{t(`hearthstoneForge.phases.${currentPhase}.prompt`)}</p>

            {state.phaseStatus === "choosing" ? (
              <>
                <div className="forge-postures" role="radiogroup" aria-label={t("hearthstoneForge.ritual.choosePosture")}>
                  {(["precise", "steady", "forced"] as Posture[]).map((posture) => {
                    const Icon = POSTURE_ICONS[posture];
                    return (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={state.selectedPosture === posture}
                        className={state.selectedPosture === posture ? "is-selected" : ""}
                        key={posture}
                        onClick={() => dispatch({ type: "SELECT_POSTURE", posture })}
                      >
                        <Icon size={22} aria-hidden="true" />
                        <strong>{t(`hearthstoneForge.postures.${posture}.name`)}</strong>
                        <span>{t(`hearthstoneForge.postures.${posture}.description`)}</span>
                      </button>
                    );
                  })}
                </div>
                <button type="button" className="forge-button forge-button--primary" disabled={!state.selectedPosture} onClick={handleRoll}>
                  <Flame size={20} aria-hidden="true" />
                  {t("hearthstoneForge.ritual.roll")}
                </button>
              </>
            ) : currentPhaseResult && currentSkill && currentSkillScore !== null ? (
              <div className="forge-roll-reveal" aria-live="polite">
                <div className="forge-roll-reveal__summary">
                  <div className="forge-die" aria-label={t("hearthstoneForge.ritual.dieResult", { value: state.lastRoll })}>
                    <span aria-hidden="true">{DIE_FACES[state.lastRoll ?? 0]}</span>
                  </div>
                  <div>
                    <p>{t(`hearthstoneForge.ritual.reactions.${currentPhase}.${reactionTier(state.lastRoll ?? 1)}`)}</p>
                    <p className="forge-phase-score">
                      <span>{t("hearthstoneForge.ritual.phaseScore")}</span>
                      <strong>{currentPhaseResult.score}</strong>
                    </p>
                  </div>
                </div>

                {state.phaseStatus === "retouch" && (
                  <div className="forge-retouch">
                    <div className="forge-retouch__heading">
                      <div>
                        <p className="forge-eyebrow">{t("hearthstoneForge.ritual.retouch.eyebrow")}</p>
                        <h2>{t("hearthstoneForge.ritual.retouch.title")}</h2>
                      </div>
                      <span>{t("hearthstoneForge.ritual.retouch.skillValue", {
                        skill: t(`hearthstoneForge.skills.${currentSkill}`),
                        value: currentSkillScore,
                      })}</span>
                    </div>
                    <p>{t("hearthstoneForge.ritual.retouch.body")}</p>
                    <div className="forge-retouch__options" role="radiogroup" aria-label={t("hearthstoneForge.ritual.retouch.optionsLabel") }>
                      {[
                        { direction: "decrease", options: NEGATIVE_RETOUCH_OPTIONS },
                        { direction: "increase", options: POSITIVE_RETOUCH_OPTIONS },
                      ].map(({ direction, options }) => (
                        <div className={`forge-retouch__column forge-retouch__column--${direction}`} key={direction}>
                          <p>{t(`hearthstoneForge.ritual.retouch.${direction}`)}</p>
                          {options.map((adjustment) => {
                            const threshold = getRetouchThreshold(currentSkillScore, adjustment);
                            return (
                              <button
                                type="button"
                                role="radio"
                                aria-checked={state.selectedRetouch === adjustment}
                                aria-label={t("hearthstoneForge.ritual.retouch.optionLabel", {
                                  adjustment: adjustment > 0 ? `+${adjustment}` : adjustment,
                                  threshold,
                                })}
                                className={state.selectedRetouch === adjustment ? "is-selected" : ""}
                                key={adjustment}
                                onClick={() => dispatch({ type: "SELECT_RETOUCH", adjustment })}
                              >
                                <strong>{adjustment > 0 ? `+${adjustment}` : adjustment}</strong>
                                <span>{t("hearthstoneForge.ritual.retouch.threshold", { value: threshold })}</span>
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                    <div className="forge-retouch__actions">
                      <button type="button" className="forge-button forge-button--primary" disabled={state.selectedRetouch === null} onClick={handleRetouch}>
                        <Sparkles size={18} aria-hidden="true" />
                        {t("hearthstoneForge.ritual.retouch.attempt")}
                      </button>
                      <button type="button" className="forge-button" onClick={() => dispatch({ type: "SKIP_RETOUCH" })}>
                        {t("hearthstoneForge.ritual.retouch.keep")}
                      </button>
                    </div>
                  </div>
                )}

                {state.phaseStatus === "criticalChoice" && currentPhaseResult.retouch && (
                  <div className="forge-retouch forge-retouch--critical">
                    <div className="forge-skill-die" aria-label={t("hearthstoneForge.ritual.retouch.skillRoll", {
                      roll: currentPhaseResult.retouch.roll,
                      threshold: currentPhaseResult.retouch.threshold,
                    })}>
                      {String(currentPhaseResult.retouch.roll).padStart(2, "0")}
                    </div>
                    <p className="forge-retouch__outcome">{t("hearthstoneForge.ritual.retouch.outcomes.criticalSuccess")}</p>
                    <p>{t("hearthstoneForge.ritual.retouch.criticalChoice")}</p>
                    <div className="forge-critical-options" aria-label={t("hearthstoneForge.ritual.retouch.criticalOptionsLabel") }>
                      <div>
                        <p>{t("hearthstoneForge.ritual.retouch.decrease")}</p>
                        {NEGATIVE_CRITICAL_OPTIONS.map((adjustment) => (
                          <button type="button" key={adjustment} onClick={() => handleCriticalRetouch(adjustment)}>{adjustment}</button>
                        ))}
                      </div>
                      <div>
                        <p>{t("hearthstoneForge.ritual.retouch.increase")}</p>
                        {POSITIVE_CRITICAL_OPTIONS.map((adjustment) => (
                          <button type="button" key={adjustment} onClick={() => handleCriticalRetouch(adjustment)}>+{adjustment}</button>
                        ))}
                      </div>
                      <button type="button" className="forge-critical-options__keep" onClick={() => handleCriticalRetouch(0)}>
                        {t("hearthstoneForge.ritual.retouch.noAdjustment")}
                      </button>
                    </div>
                  </div>
                )}

                {state.phaseStatus === "complete" && (
                  <div className="forge-retouch forge-retouch--complete">
                    {currentPhaseResult.retouch ? (
                      <>
                        <div className="forge-skill-die" aria-label={t("hearthstoneForge.ritual.retouch.skillRoll", {
                          roll: currentPhaseResult.retouch.roll,
                          threshold: currentPhaseResult.retouch.threshold,
                        })}>
                          {String(currentPhaseResult.retouch.roll).padStart(2, "0")}
                        </div>
                        <p className={`forge-retouch__outcome forge-retouch__outcome--${currentPhaseResult.retouch.outcome}`}>
                          {t(`hearthstoneForge.ritual.retouch.outcomes.${currentPhaseResult.retouch.outcome}`)}
                        </p>
                        <p>{t("hearthstoneForge.ritual.retouch.finalScore", { value: currentPhaseResult.score })}</p>
                      </>
                    ) : (
                      <p className="forge-retouch__outcome">{t("hearthstoneForge.ritual.retouch.kept", { value: currentPhaseResult.score })}</p>
                    )}
                    <button type="button" className="forge-button forge-button--primary" onClick={() => dispatch({ type: "ADVANCE_PHASE" })}>
                      {currentPhase === "gem" ? t("hearthstoneForge.ritual.seal") : t("hearthstoneForge.ritual.continue")}
                      <ChevronRight size={19} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </section>
      )}

      {state.view === "resolving" && (
        <section className="forge-resolution forge-resolution--waiting" aria-labelledby="forge-resolution-title">
          <div className={`forge-resolution__seal forge-resolution__seal--${gemColor}`} aria-hidden="true">
            <Gem size={60} />
          </div>
          <p className="forge-eyebrow">{t("hearthstoneForge.resolving.eyebrow")}</p>
          <h1 id="forge-resolution-title">{t("hearthstoneForge.resolving.title")}</h1>
          <p>{t("hearthstoneForge.resolving.body")}</p>
          <div className="forge-resolution__score">{t("hearthstoneForge.ritual.scoreSummary", { current: currentScore, target: targetScore })}</div>
          <button type="button" className="forge-button forge-button--primary" onClick={revealResult}>
            <Sparkles size={20} aria-hidden="true" />
            {t("hearthstoneForge.resolving.reveal")}
          </button>
        </section>
      )}

      {state.view === "unstableChoice" && (
        <section className="forge-resolution forge-resolution--unstable" aria-labelledby="forge-unstable-title">
          <div className="forge-resolution__seal forge-resolution__seal--unstable" aria-hidden="true">
            <Zap size={58} />
          </div>
          <p className="forge-eyebrow">{t("hearthstoneForge.unstable.eyebrow")}</p>
          <h1 id="forge-unstable-title">{t("hearthstoneForge.unstable.title")}</h1>
          <p>{t("hearthstoneForge.unstable.body")}</p>
          <div className="forge-unstable-choices">
            <button type="button" onClick={() => finalizeUnstable("singleUse")}>
              <Flame size={25} aria-hidden="true" />
              <strong>{t("hearthstoneForge.unstable.singleUse.title")}</strong>
              <span>{t("hearthstoneForge.unstable.singleUse.body")}</span>
            </button>
            <button type="button" onClick={() => finalizeUnstable("flawed")}>
              <WandSparkles size={25} aria-hidden="true" />
              <strong>{t("hearthstoneForge.unstable.flawed.title")}</strong>
              <span>{t("hearthstoneForge.unstable.flawed.body")}</span>
            </button>
          </div>
        </section>
      )}

      {state.view === "result" && state.resolution && (
        <section className={`forge-result forge-result--${state.resolution.outcome}`} aria-labelledby="forge-result-title">
          <div className="forge-result__card">
            <CardPreview card={state.resultCard ?? state.draft} />
          </div>
          <div className="forge-result__story" aria-live="polite">
            <p className="forge-eyebrow">{t(`hearthstoneForge.result.${state.resolution.outcome}.eyebrow`)}</p>
            <h1 id="forge-result-title">{t(`hearthstoneForge.result.${state.resolution.outcome}.title`)}</h1>
            <p>{t(`hearthstoneForge.result.${state.resolution.outcome}.body`)}</p>
            {state.resultCard?.unstableMode === "singleUse" && <p className="forge-result__detail">{t("hearthstoneForge.result.singleUse")}</p>}
            {state.resultCard?.flaw && <p className="forge-result__detail">{t(`hearthstoneForge.flaws.${state.resultCard.flaw}`)}</p>}
            <p className="forge-result__score">{t("hearthstoneForge.ritual.scoreSummary", { current: state.resolution.total, target: state.resolution.target })}</p>
            <div className="forge-result__actions">
              {state.resultCard ? (
                <>
                  <button type="button" className="forge-button forge-button--primary" onClick={() => dispatch({ type: "OPEN_COLLECTION" })}>
                    <BookOpen size={19} aria-hidden="true" />
                    {t("hearthstoneForge.result.openCollection")}
                  </button>
                  <button type="button" className="forge-button" onClick={() => dispatch({ type: "START_NEW" })}>
                    <Printer size={19} aria-hidden="true" />
                    {t("hearthstoneForge.result.createAnother")}
                  </button>
                  <button type="button" className="forge-button" onClick={() => dispatch({ type: "RETRY_SAME_CARD" })}>
                    <RotateCcw size={19} aria-hidden="true" />
                    {t("hearthstoneForge.result.retrySame")}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="forge-button forge-button--primary" onClick={() => dispatch({ type: "RETRY_SAME_CARD" })}>
                    <RotateCcw size={19} aria-hidden="true" />
                    {t("hearthstoneForge.result.retrySame")}
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {state.view === "collection" && (
        <section className="forge-collection" aria-labelledby="forge-collection-title">
          <div className="forge-section-heading">
            <button type="button" className="forge-icon-button" onClick={() => dispatch({ type: "RETURN_LANDING" })} aria-label={t("hearthstoneForge.actions.back")}>
              <ArrowLeft size={20} />
            </button>
            <div>
              <p className="forge-eyebrow">{t("hearthstoneForge.collection.eyebrow")}</p>
              <h1 id="forge-collection-title">{t("hearthstoneForge.collection.title")}</h1>
            </div>
          </div>

          {state.collection.length === 0 ? (
            <div className="forge-collection__empty">
              <BookOpen size={42} aria-hidden="true" />
              <p>{t("hearthstoneForge.collection.empty")}</p>
              <button type="button" className="forge-button forge-button--primary" onClick={() => dispatch({ type: "START_NEW" })}>
                {t("hearthstoneForge.landing.newCard")}
              </button>
            </div>
          ) : (
            <div className="forge-collection__grid">
              {state.collection.map((card) => (
                <article className="forge-collection-item" key={card.id}>
                  <CardPreview card={card} compact />
                  <div className="forge-collection-item__meta">
                    <p>{t(`hearthstoneForge.rarities.${card.rarity}`)}</p>
                    {card.unstableMode === "singleUse" && <span>{t("hearthstoneForge.collection.singleUse")}</span>}
                    {card.flaw && <span>{t(`hearthstoneForge.flaws.${card.flaw}`)}</span>}
                  </div>
                  <button type="button" className="forge-collection-item__delete" onClick={() => deleteCard(card)}>
                    <Trash2 size={17} aria-hidden="true" />
                    {t("hearthstoneForge.collection.delete")}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

