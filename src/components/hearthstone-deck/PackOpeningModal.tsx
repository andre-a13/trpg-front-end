import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { PackageOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import hearthstoneDeckService from "../../services/hearthstone-deck.service";
import type {
  DeckStateDto,
  HearthstoneCardDto,
  HearthstoneCardSetDto,
} from "../../types/api";
import Modal, { type ModalHandle } from "../ui/modal/Modal";

const CLASSIC_CARD_BACK_URL = "https://hearthstone.wiki.gg/images/CardBack0.png?2a307b";

type PackCard = {
  card: HearthstoneCardDto;
  status: "hidden" | "revealed";
};

type Props = {
  slug: string;
  onDeckChange: (deck: DeckStateDto) => void;
  onPackSaved: (count: number) => void;
};

export type PackOpeningHandle = {
  open: () => void;
};

const PackOpeningModal = forwardRef<PackOpeningHandle, Props>(function PackOpeningModal(
  { slug, onDeckChange, onPackSaved },
  ref,
) {
  const { t } = useTranslation();
  const modalRef = useRef<ModalHandle | null>(null);
  const [sets, setSets] = useState<HearthstoneCardSetDto[]>([]);
  const [selectedSet, setSelectedSet] = useState("");
  const [cards, setCards] = useState<PackCard[]>([]);
  const [loadingSets, setLoadingSets] = useState(false);
  const [opening, setOpening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSets() {
    if (sets.length > 0 || loadingSets) return;
    setLoadingSets(true);
    try {
      const catalog = await hearthstoneDeckService.searchCards("", 1, 1);
      setSets(catalog.sets);
    } catch {
      setError(t("hearthstomancer.pack.errors.sets"));
    } finally {
      setLoadingSets(false);
    }
  }

  useImperativeHandle(ref, () => ({
    open() {
      setSelectedSet("");
      setCards([]);
      setSaving(false);
      setError(null);
      modalRef.current?.open();
      void loadSets();
    },
  }));

  async function confirmSet() {
    if (!selectedSet) return;
    setOpening(true);
    setError(null);
    try {
      const pack = await hearthstoneDeckService.openPack(slug, selectedSet);
      setCards(pack.cards.map((card) => ({ card, status: "hidden" })));
    } catch {
      setError(t("hearthstomancer.pack.errors.open"));
    } finally {
      setOpening(false);
    }
  }

  function revealCard(index: number) {
    const packCard = cards[index];
    if (!packCard || packCard.status !== "hidden" || saving) return;

    setError(null);
    setCards((current) => current.map((entry, entryIndex) => (
      entryIndex === index ? { ...entry, status: "revealed" } : entry
    )));
  }

  async function savePack() {
    if (cards.length !== 5 || cards.some((entry) => entry.status !== "revealed")) return;
    setSaving(true);
    setError(null);
    try {
      const deck = await hearthstoneDeckService.savePack(
        slug,
        cards.map((entry) => entry.card.id),
      );
      onDeckChange(deck);
      onPackSaved(cards.length);
      modalRef.current?.close();
    } catch {
      setError(t("hearthstomancer.pack.errors.save"));
    } finally {
      setSaving(false);
    }
  }

  const revealedCount = cards.filter((entry) => entry.status === "revealed").length;
  const selectedSetName = sets.find((cardSet) => cardSet.code === selectedSet)?.name;

  return (
    <Modal
      ref={modalRef}
      title={t("hearthstomancer.pack.title")}
      subtitle={cards.length > 0
        ? t("hearthstomancer.pack.openedSet", { set: selectedSetName })
        : t("hearthstomancer.pack.chooseHelp")}
      icon={<PackageOpen size={21} />}
      size="xl"
      align="top"
      closeOnBackdrop={false}
      closeOnEsc={!saving}
      showCloseButton={!saving}
      containerClassName="hs-packModal"
      footer={cards.length > 0 ? (
        <>
          <span className="hs-packModal__progress">
            {t("hearthstomancer.pack.progress", { count: revealedCount, total: cards.length })}
          </span>
          <button
            type="button"
            disabled={saving || revealedCount !== cards.length}
            onClick={() => void savePack()}
          >
            {saving ? t("hearthstomancer.pack.saving") : t("common.actions.save")}
          </button>
        </>
      ) : undefined}
    >
      {cards.length === 0 ? (
        <div className="hs-packSetup">
          <label htmlFor="hs-pack-set">{t("hearthstomancer.pack.setLabel")}</label>
          <select
            id="hs-pack-set"
            value={selectedSet}
            disabled={loadingSets || opening}
            onChange={(event) => setSelectedSet(event.target.value)}
          >
            <option value="">{loadingSets ? t("common.loading") : t("hearthstomancer.pack.selectSet")}</option>
            {sets.map((cardSet) => (
              <option key={cardSet.code} value={cardSet.code}>
                {cardSet.name} ({cardSet.cardCount})
              </option>
            ))}
          </select>
          <button type="button" disabled={!selectedSet || opening} onClick={() => void confirmSet()}>
            <PackageOpen size={17} aria-hidden="true" />
            {opening ? t("hearthstomancer.pack.opening") : t("hearthstomancer.pack.confirmSet")}
          </button>
        </div>
      ) : (
        <div className="hs-packStage">
          <p>{t("hearthstomancer.pack.revealHelp")}</p>
          <div className="hs-packCards">
            {cards.map((entry, index) => {
              const revealed = entry.status === "revealed";
              return (
                <button
                  type="button"
                  className={`hs-packCard ${revealed ? "is-revealed" : ""}`}
                  key={`${entry.card.id}-${index}`}
                  style={{ "--pack-index": index } as CSSProperties}
                  disabled={entry.status !== "hidden" || saving}
                  aria-label={revealed ? entry.card.name : t("hearthstomancer.pack.revealCard", { index: index + 1 })}
                  onClick={() => revealCard(index)}
                >
                  <span className="hs-packCard__inner">
                    <span className="hs-packCard__face hs-packCard__back">
                      <img src={CLASSIC_CARD_BACK_URL} alt="" />
                    </span>
                    <span className="hs-packCard__face hs-packCard__front">
                      <img src={entry.card.renderUrl} alt={entry.card.name} />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {error && <p className="hs-packModal__error" role="alert">{error}</p>}
    </Modal>
  );
});

export default PackOpeningModal;
