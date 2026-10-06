import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Grid2X2,
  List,
  LoaderCircle,
  PackageOpen,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Undo2,
} from "lucide-react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import characterService from "../../../services/character.service";
import hearthstoneDeckService from "../../../services/hearthstone-deck.service";
import type {
  DeckCardDefinitionDto,
  DeckDefinitionInput,
  DeckStateDto,
  HearthstoneCardDto,
  HearthstoneCatalogPageDto,
} from "../../../types/api";
import HearthstoneCard from "../../hearthstone-deck/HearthstoneCard";
import MinimalDeckList, { MinimalDrawnList } from "../../hearthstone-deck/MinimalDeckList";
import PackOpeningModal, { type PackOpeningHandle } from "../../hearthstone-deck/PackOpeningModal";
import Modal, { type ModalHandle } from "../../ui/modal/Modal";
import "../../hearthstone-deck/hearthstone-deck.scss";
import "./deck.scss";

type DraftDefinition = DeckDefinitionInput & {
  key: string;
  serverId?: number;
  renderUrl?: string | null;
  originalIllustrationUrl?: string | null;
  baselineNormalCount: number;
  baselineGoldenCount: number;
};

const PAGE_SIZE = 24;

function draftFromDefinition(definition: DeckCardDefinitionDto): DraftDefinition {
  return {
    key: `server-${definition.id}`,
    serverId: definition.id,
    sourceCardId: definition.sourceCardId,
    name: definition.name,
    cost: definition.cost,
    attack: definition.attack,
    health: definition.health,
    durability: definition.durability,
    text: definition.text,
    cardType: definition.cardType,
    rarity: definition.rarity,
    cardClass: definition.cardClass,
    tribe: definition.tribe,
    spellSchool: definition.spellSchool,
    cardSet: definition.cardSet,
    illustrationUrl: definition.illustrationUrl,
    renderUrl: definition.renderUrl,
    originalIllustrationUrl: definition.originalIllustrationUrl,
    normalCount: definition.normalCount,
    goldenCount: definition.goldenCount,
    baselineNormalCount: definition.normalCount,
    baselineGoldenCount: definition.goldenCount,
  };
}

function draftFromCatalog(card: HearthstoneCardDto, golden: boolean): DraftDefinition {
  return {
    key: `new-${card.id}-${crypto.randomUUID()}`,
    sourceCardId: card.id,
    name: card.name,
    cost: card.cost,
    attack: card.attack,
    health: card.health,
    durability: card.durability,
    text: card.text,
    cardType: card.cardType,
    rarity: card.rarity,
    cardClass: card.cardClass,
    tribe: card.tribe,
    spellSchool: card.spellSchool,
    cardSet: card.cardSet,
    illustrationUrl: card.illustrationUrl,
    renderUrl: card.renderUrl,
    originalIllustrationUrl: card.illustrationUrl,
    normalCount: golden ? 0 : 1,
    goldenCount: golden ? 1 : 0,
    baselineNormalCount: 0,
    baselineGoldenCount: 0,
  };
}

function toPayload(definition: DraftDefinition): DeckDefinitionInput {
  return {
    sourceCardId: definition.sourceCardId,
    name: definition.name,
    cost: definition.cost,
    attack: definition.attack,
    health: definition.health,
    durability: definition.durability,
    text: definition.text,
    cardType: definition.cardType,
    rarity: definition.rarity,
    cardClass: definition.cardClass,
    tribe: definition.tribe,
    spellSchool: definition.spellSchool,
    cardSet: definition.cardSet,
    illustrationUrl: definition.illustrationUrl,
    normalCount: definition.normalCount,
    goldenCount: definition.goldenCount,
  };
}

function sameEditableDefinition(left: DraftDefinition, right: DraftDefinition) {
  return (
    left.sourceCardId === right.sourceCardId &&
    left.name === right.name &&
    left.cost === right.cost &&
    left.attack === right.attack &&
    left.health === right.health &&
    left.durability === right.durability &&
    left.text === right.text &&
    left.cardType === right.cardType &&
    left.rarity === right.rarity &&
    left.cardClass === right.cardClass &&
    left.tribe === right.tribe &&
    left.spellSchool === right.spellSchool &&
    left.cardSet === right.cardSet &&
    left.illustrationUrl === right.illustrationUrl
  );
}

function nullableNumber(raw: string) {
  if (raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.max(0, value) : null;
}

export default function DeckPage() {
  const { t } = useTranslation();
  const { slug = "" } = useParams();
  const [characterName, setCharacterName] = useState(slug);
  const [deck, setDeck] = useState<DeckStateDto | null>(null);
  const [draft, setDraft] = useState<DraftDefinition[]>([]);
  const [selectedCard, setSelectedCard] = useState<DraftDefinition | null>(null);
  const [draftDirty, setDraftDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedCardSet, setSelectedCardSet] = useState("");
  const [catalog, setCatalog] = useState<HearthstoneCatalogPageDto | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"full" | "minimal">(() => (
    window.localStorage.getItem("hearthstomancer-deck-view") === "minimal" ? "minimal" : "full"
  ));
  const [feedback, setFeedback] = useState<{ id: number; message: string } | null>(null);
  const compositionModalRef = useRef<ModalHandle | null>(null);
  const packModalRef = useRef<PackOpeningHandle | null>(null);

  const syncDraft = useCallback((state: DeckStateDto) => {
    setDraft(state.definitions.map(draftFromDefinition));
    setDraftDirty(false);
  }, []);

  const refresh = useCallback(async () => {
    if (!slug) return false;
    setLoading(true);
    setError(null);
    try {
      const [character, state] = await Promise.all([
        characterService.getBySlug(slug),
        hearthstoneDeckService.getDeck(slug),
      ]);
      setCharacterName(character.name);
      setDeck(state);
      syncDraft(state);
      return true;
    } catch {
      setError(t("hearthstomancer.errors.load"));
      return false;
    } finally {
      setLoading(false);
    }
  }, [slug, syncDraft, t]);

  const loadCatalog = useCallback(async (search: string, page: number, cardSet: string) => {
    setCatalogLoading(true);
    try {
      setCatalog(await hearthstoneDeckService.searchCards(search, page, PAGE_SIZE, cardSet));
    } catch {
      setError(t("hearthstomancer.errors.catalog"));
    } finally {
      setCatalogLoading(false);
    }
  }, [t]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!feedback) return;
    const timeoutId = window.setTimeout(() => setFeedback(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  const canAct = Boolean(deck?.enabled && deck.permissions.canManage);
  const totalPages = catalog ? Math.max(1, Math.ceil(catalog.total / catalog.pageSize)) : 1;
  const draftTotal = useMemo(
    () => draft.reduce((sum, definition) => sum + definition.normalCount + definition.goldenCount, 0),
    [draft],
  );

  function applyState(state: DeckStateDto) {
    setDeck(state);
    syncDraft(state);
  }

  function showFeedback(message: string) {
    setFeedback({ id: Date.now(), message });
  }

  function changeViewMode(mode: "full" | "minimal") {
    setViewMode(mode);
    window.localStorage.setItem("hearthstomancer-deck-view", mode);
  }

  async function run(action: () => Promise<DeckStateDto>, successMessage?: string) {
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      applyState(await action());
      if (successMessage) showFeedback(successMessage);
      return true;
    } catch {
      setError(t("hearthstomancer.errors.action"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function selectCatalogCard(card: HearthstoneCardDto) {
    setSelectedCard({
      ...draftFromCatalog(card, false),
      normalCount: 0,
      goldenCount: 0,
    });
  }

  function patchSelectedCard(patch: Partial<DraftDefinition>) {
    setSelectedCard((current) => current ? { ...current, ...patch } : current);
  }

  function addSelectedCard(golden: boolean) {
    if (!selectedCard) return;
    setDraft((current) => {
      const existing = current.find((definition) => sameEditableDefinition(definition, selectedCard));
      if (!existing) return [...current, {
        ...selectedCard,
        key: `new-${selectedCard.sourceCardId}-${crypto.randomUUID()}`,
        normalCount: golden ? 0 : 1,
        goldenCount: golden ? 1 : 0,
      }];
      return current.map((definition) => definition.key === existing.key ? {
        ...definition,
        normalCount: definition.normalCount + (golden ? 0 : 1),
        goldenCount: definition.goldenCount + (golden ? 1 : 0),
      } : definition);
    });
    setDraftDirty(true);
    showFeedback(t("hearthstomancer.feedback.draftUpdated"));
  }

  async function saveDraft() {
    if (!deck) return;
    const saved = await run(
      () => hearthstoneDeckService.saveComposition(slug, draft.map(toPayload)),
      t("hearthstomancer.feedback.saved"),
    );
    if (saved) compositionModalRef.current?.close();
  }

  function resetDraft() {
    if (!deck) return;
    syncDraft(deck);
    showFeedback(t("hearthstomancer.feedback.draftReset"));
  }

  async function refreshWithFeedback() {
    if (await refresh()) showFeedback(t("hearthstomancer.feedback.refreshed"));
  }

  async function submitSearch(event: FormEvent) {
    event.preventDefault();
    await loadCatalog(query, 1, selectedCardSet);
  }

  function openComposition() {
    if (!deck) return;
    syncDraft(deck);
    setSelectedCard(null);
    compositionModalRef.current?.open();
    if (!catalog) void loadCatalog("", 1, selectedCardSet);
  }

  function closeComposition() {
    if (draftDirty && !window.confirm(t("hearthstomancer.builder.discardConfirm"))) return;
    if (deck) syncDraft(deck);
    compositionModalRef.current?.close();
  }

  function changeCardSet(cardSet: string) {
    setSelectedCardSet(cardSet);
    void loadCatalog(query, 1, cardSet);
  }

  async function removeDeckCard(definition: DeckCardDefinitionDto, isGolden: boolean) {
    await run(
      () => hearthstoneDeckService.remove(slug, {
        zone: "deck",
        definitionId: definition.id,
        isGolden,
      }),
      t("hearthstomancer.feedback.removed"),
    );
  }

  function renderDrawnCard(card: DeckStateDto["drawnCards"][number]) {
    return (
      <HearthstoneCard
        key={card.copyId}
        definition={card.definition}
        golden={card.isGolden}
        actions={canAct ? (
          <>
            <button type="button" disabled={busy || draftDirty} onClick={() => run(() => hearthstoneDeckService.discard(slug, card.copyId), t("hearthstomancer.feedback.discarded"))}>
              {t("hearthstomancer.actions.discard")}
            </button>
            {!card.isGolden && (
              <button type="button" disabled={busy || draftDirty} onClick={() => run(() => hearthstoneDeckService.play(slug, card.copyId), t("hearthstomancer.feedback.played"))}>
                {t("hearthstomancer.actions.play")}
              </button>
            )}
          </>
        ) : undefined}
      />
    );
  }

  if (loading) return <main className="page hs-deckPage"><p>{t("common.loading")}</p></main>;
  if (!deck) return <main className="page hs-deckPage"><p className="hs-deckPage__error">{error}</p></main>;

  return (
    <main
      className={`page hs-deckPage ${viewMode === "minimal" ? "is-minimal" : ""} ${busy ? "is-busy" : ""}`}
      aria-busy={busy}
    >
      <header className="hs-deckPage__header">
        <div>
          <Link to={`/characters/${slug}`} className="hs-deckPage__back"><ArrowLeft size={16} /> {t("hearthstomancer.actions.backToSheet")}</Link>
          <h1>{t("hearthstomancer.title", { name: characterName })}</h1>
        </div>
        <div className="hs-deckPage__headerActions">
          <div className="hs-viewToggle" role="group" aria-label={t("hearthstomancer.view.label")}>
            <button
              type="button"
              className={viewMode === "full" ? "is-selected" : ""}
              aria-pressed={viewMode === "full"}
              onClick={() => changeViewMode("full")}
            >
              <Grid2X2 size={15} aria-hidden="true" /> {t("hearthstomancer.view.full")}
            </button>
            <button
              type="button"
              className={viewMode === "minimal" ? "is-selected" : ""}
              aria-pressed={viewMode === "minimal"}
              onClick={() => changeViewMode("minimal")}
            >
              <List size={16} aria-hidden="true" /> {t("hearthstomancer.view.minimal")}
            </button>
          </div>
          <span className={`hs-deckPage__status ${deck.enabled ? "is-active" : "is-inactive"}`}>
            {t(`hearthstomancer.state.${deck.enabled ? "active" : "inactive"}`)}
          </span>
        </div>
      </header>

      {viewMode === "full" && <section className="hs-deckPage__overview">
        <div className="hs-deckPage__counts">
          <span>{t("hearthstomancer.counts.total", { count: deck.counts.total })}</span>
          <span>{t("hearthstomancer.counts.remaining", { count: deck.counts.remaining })}</span>
          <span>{t("hearthstomancer.counts.drawn", { count: deck.counts.drawn })}</span>
        </div>
        <div className="hs-deckPage__toolbar">
          {canAct && (
            <button type="button" disabled={busy || draftDirty || deck.counts.remaining === 0} onClick={() => run(() => hearthstoneDeckService.draw(slug), t("hearthstomancer.feedback.drawn"))}>
              {t("hearthstomancer.actions.draw")}
            </button>
          )}
          {canAct && (
            <button type="button" disabled={busy || draftDirty} onClick={() => run(() => hearthstoneDeckService.reset(slug), t("hearthstomancer.feedback.reset"))}>
              <RotateCcw size={16} /> {t("hearthstomancer.actions.reset")}
            </button>
          )}
          {canAct && deck.undoablePlay && (
            <button type="button" disabled={busy || draftDirty} onClick={() => run(() => hearthstoneDeckService.undoPlay(slug), t("hearthstomancer.feedback.undo"))}>
              <Undo2 size={16} /> {t("hearthstomancer.actions.undoPlay")}
            </button>
          )}
          <button type="button" disabled={busy || draftDirty} onClick={() => void refreshWithFeedback()}>{t("hearthstomancer.actions.refresh")}</button>
        </div>
        {draftDirty && <p className="hs-deckPage__notice">{t("hearthstomancer.builder.dirtyActionHelp")}</p>}
        {!deck.enabled && <p className="hs-deckPage__notice">{t("hearthstomancer.inactiveHelp")}</p>}
        {error && <p className="hs-deckPage__error" role="alert">{error}</p>}
      </section>}

      <section className={`hs-deckPage__section ${viewMode === "minimal" ? "hs-deckPage__section--minimal" : ""}`}>
        <header className="hs-deckPage__sectionHeader">
          <h2>{t("hearthstomancer.drawnTitle")}</h2>
          {viewMode === "minimal" && canAct && (
            <button
              type="button"
              disabled={busy || draftDirty || deck.counts.remaining === 0}
              onClick={() => run(() => hearthstoneDeckService.draw(slug), t("hearthstomancer.feedback.drawn"))}
            >
              {t("hearthstomancer.actions.draw")}
            </button>
          )}
        </header>
        {deck.drawnCards.length === 0 ? <p>{t("hearthstomancer.drawnEmpty")}</p> : (
          viewMode === "minimal" ? (
            <MinimalDrawnList
              cards={deck.drawnCards}
              canAct={canAct}
              disabled={busy || draftDirty}
              onDiscard={(card) => void run(() => hearthstoneDeckService.discard(slug, card.copyId), t("hearthstomancer.feedback.discarded"))}
              onPlay={(card) => void run(() => hearthstoneDeckService.play(slug, card.copyId), t("hearthstomancer.feedback.played"))}
            />
          ) : <div className="hs-compositionGroups">
            {deck.drawnCards.some((card) => !card.isGolden) && (
              <section className="hs-compositionGroup">
                <h3>{t("hearthstomancer.view.normalCards")}</h3>
                <div className="hs-deckPage__cards">
                  {deck.drawnCards.filter((card) => !card.isGolden).map(renderDrawnCard)}
                </div>
              </section>
            )}
            {deck.drawnCards.some((card) => card.isGolden) && (
              <section className="hs-compositionGroup is-golden">
                <h3><Sparkles size={16} aria-hidden="true" /> {t("hearthstomancer.view.goldenCards")}</h3>
                <div className="hs-deckPage__cards">
                  {deck.drawnCards.filter((card) => card.isGolden).map(renderDrawnCard)}
                </div>
              </section>
            )}
          </div>
        )}
      </section>

      <section className={`hs-deckPage__section ${viewMode === "minimal" ? "hs-deckPage__section--minimal" : ""}`}>
        <header className="hs-deckPage__sectionHeader">
          <h2>{t("hearthstomancer.compositionTitle")}</h2>
          {canAct && (
            <div className="hs-deckPage__sectionActions">
              <button type="button" disabled={busy} onClick={openComposition}>
                <Plus size={16} aria-hidden="true" /> {t("hearthstomancer.actions.addCard")}
              </button>
              <button type="button" disabled={busy || draftDirty} onClick={() => packModalRef.current?.open()}>
                <PackageOpen size={16} aria-hidden="true" /> {t("hearthstomancer.actions.openPack")}
              </button>
            </div>
          )}
        </header>
        {viewMode === "minimal" ? (
          <>
            <p className="hs-minimalList__hint">{t("hearthstomancer.view.minimalHint")}</p>
            <MinimalDeckList
              definitions={deck.definitions}
              canAct={canAct}
              disabled={busy || draftDirty}
              onRemove={(definition, isGolden) => void removeDeckCard(definition, isGolden)}
            />
          </>
        ) : deck.counts.remaining === 0 ? <p>{t("hearthstomancer.compositionEmpty")}</p> : (
          <div className="hs-compositionGroups">
            {deck.definitions.some((definition) => definition.remainingNormalCount > 0) && (
              <section className="hs-compositionGroup">
                <h3>{t("hearthstomancer.view.normalCards")}</h3>
                <div className="hs-deckPage__cards">
                  {deck.definitions.filter((definition) => definition.remainingNormalCount > 0).map((definition) => (
                    <HearthstoneCard
                      key={`normal-${definition.id}`}
                      definition={definition}
                      actions={(
                        <>
                          <span>{t("hearthstomancer.counts.normal", { count: definition.remainingNormalCount })}</span>
                          {canAct && definition.remainingNormalCount > 0 && (
                            <button type="button" className="is-danger" disabled={busy || draftDirty} onClick={() => void removeDeckCard(definition, false)}>
                              {t("hearthstomancer.actions.removeNormal")}
                            </button>
                          )}
                        </>
                      )}
                    />
                  ))}
                </div>
              </section>
            )}

            {deck.definitions.some((definition) => definition.remainingGoldenCount > 0) && (
              <section className="hs-compositionGroup is-golden">
                <h3><Sparkles size={16} aria-hidden="true" /> {t("hearthstomancer.view.goldenCards")}</h3>
                <div className="hs-deckPage__cards">
                  {deck.definitions.filter((definition) => definition.remainingGoldenCount > 0).map((definition) => (
                    <HearthstoneCard
                      key={`golden-${definition.id}`}
                      definition={definition}
                      golden
                      actions={(
                        <>
                          <span>{t("hearthstomancer.counts.golden", { count: definition.remainingGoldenCount })}</span>
                          {canAct && definition.remainingGoldenCount > 0 && (
                            <button type="button" className="is-danger" disabled={busy || draftDirty} onClick={() => void removeDeckCard(definition, true)}>
                              {t("hearthstomancer.actions.removeGolden")}
                            </button>
                          )}
                        </>
                      )}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </section>

      {canAct && (
        <Modal
          ref={compositionModalRef}
          title={t("hearthstomancer.builder.title")}
          subtitle={t("hearthstomancer.builder.help")}
          size="xl"
          align="top"
          showCloseButton={false}
          closeOnBackdrop={false}
          closeOnEsc={false}
          containerClassName="hs-compositionModal"
          bodyClassName="hs-compositionModal__body"
          footer={(
            <>
              <span className="hs-compositionModal__total">{t("hearthstomancer.builder.draftTotal", { count: draftTotal })}</span>
              <button type="button" disabled={!draftDirty || busy} onClick={resetDraft}>{t("common.actions.cancel")}</button>
              <button type="button" onClick={closeComposition}>{t("common.actions.close")}</button>
              <button type="button" disabled={!draftDirty || busy || draft.some((item) => !item.name.trim())} onClick={() => void saveDraft()}>
                {t("common.actions.save")}
              </button>
            </>
          )}
        >
          <div className="hs-builder">

          {selectedCard ? (
            <section className="hs-builderCard hs-selectedCardEditor">
              <header>
                <div>
                  <h3>{t("hearthstomancer.builder.selectedCard")}</h3>
                  <p>{t("hearthstomancer.builder.selectedCardHelp")}</p>
                </div>
                <strong>{selectedCard.name}</strong>
              </header>
              <div className="hs-builderCard__body">
                <label>{t("hearthstomancer.card.name")}<input value={selectedCard.name} onChange={(event) => patchSelectedCard({ name: event.target.value })} /></label>
                <div className="hs-builderCard__numbers">
                  {(["cost", "attack", "health", "durability"] as const).map((field) => (
                    <label key={field}>{t(`hearthstomancer.card.${field}`)}<input type="number" min="0" value={selectedCard[field] ?? ""} onChange={(event) => patchSelectedCard({ [field]: nullableNumber(event.target.value) })} /></label>
                  ))}
                </div>
                <label>{t("hearthstomancer.card.effect")}<textarea value={selectedCard.text} onChange={(event) => patchSelectedCard({ text: event.target.value })} /></label>
                <div className="hs-builderCard__metadata">
                  {(["cardType", "rarity", "cardClass", "tribe", "spellSchool", "cardSet"] as const).map((field) => (
                    <label key={field}>{t(`hearthstomancer.card.${field}`)}<input value={selectedCard[field] ?? ""} onChange={(event) => patchSelectedCard({ [field]: event.target.value || null })} /></label>
                  ))}
                </div>
                <label>{t("hearthstomancer.card.illustrationUrl")}<input type="url" value={selectedCard.illustrationUrl ?? ""} onChange={(event) => patchSelectedCard({ illustrationUrl: event.target.value || null })} /></label>
                <div className="hs-builder__actions">
                  <button type="button" disabled={!selectedCard.name.trim()} onClick={() => addSelectedCard(false)}><Plus size={15} /> {t("hearthstomancer.catalog.addNormal")}</button>
                  <button type="button" disabled={!selectedCard.name.trim()} onClick={() => addSelectedCard(true)}><Plus size={15} /> {t("hearthstomancer.catalog.addGolden")}</button>
                </div>
              </div>
            </section>
          ) : (
            <p className="hs-selectedCardEditor__empty">{t("hearthstomancer.builder.selectCardHelp")}</p>
          )}

          <form className="hs-catalogSearch" onSubmit={submitSearch}>
            <label htmlFor="hs-card-search">{t("hearthstomancer.catalog.search")}</label>
            <div>
              <input id="hs-card-search" value={query} onChange={(event) => setQuery(event.target.value)} />
              <select
                aria-label={t("hearthstomancer.catalog.setFilter")}
                value={selectedCardSet}
                onChange={(event) => changeCardSet(event.target.value)}
              >
                <option value="">{t("hearthstomancer.catalog.allSets")}</option>
                {catalog?.sets.map((cardSet) => (
                  <option key={cardSet.code} value={cardSet.code}>
                    {cardSet.name} ({cardSet.cardCount})
                  </option>
                ))}
              </select>
              <button type="submit" disabled={catalogLoading}><Search size={16} /> {t("hearthstomancer.catalog.submit")}</button>
            </div>
          </form>

          {catalogLoading ? <p>{t("common.loading")}</p> : catalog && (
            <>
              <div className="hs-catalogGrid">
                {catalog.items.map((card) => (
                  <article className="hs-catalogCard" key={card.id}>
                    <img src={card.renderUrl} alt="" />
                    <div>
                      <h3>{card.name}</h3>
                      <span className="hs-catalogCard__set">{card.cardSetName}</span>
                      <p>{card.text}</p>
                      <div className="hs-builder__actions">
                        <button type="button" onClick={() => selectCatalogCard(card)}>{t("hearthstomancer.catalog.select")}</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <div className="hs-builder__pager">
                <button type="button" disabled={catalog.page <= 1} onClick={() => loadCatalog(query, catalog.page - 1, selectedCardSet)}>{t("hearthstomancer.catalog.previous")}</button>
                <span>{t("hearthstomancer.catalog.page", { page: catalog.page, total: totalPages })}</span>
                <span>{t("hearthstomancer.catalog.resultCount", { count: catalog.total })}</span>
                <button type="button" disabled={catalog.page >= totalPages} onClick={() => loadCatalog(query, catalog.page + 1, selectedCardSet)}>{t("hearthstomancer.catalog.next")}</button>
              </div>
            </>
          )}
          </div>
        </Modal>
      )}

      {busy && (
        <div className="hs-actionProgress" role="status" aria-live="polite">
          <LoaderCircle size={17} aria-hidden="true" />
          {t("hearthstomancer.feedback.updating")}
        </div>
      )}

      {feedback && (
        <div className="hs-actionFeedback" role="status" aria-live="polite" key={feedback.id}>
          <CheckCircle2 size={18} aria-hidden="true" />
          {feedback.message}
        </div>
      )}

      {canAct && (
        <PackOpeningModal
          ref={packModalRef}
          slug={slug}
          onDeckChange={applyState}
          onPackSaved={(count) => showFeedback(t("hearthstomancer.feedback.packSaved", { count }))}
        />
      )}
    </main>
  );
}
