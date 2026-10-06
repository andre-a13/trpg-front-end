import { useCallback, useEffect, useState } from "react";
import { ExternalLink, RotateCcw, Undo2 } from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import hearthstoneDeckService from "../../services/hearthstone-deck.service";
import type { DeckStateDto } from "../../types/api";
import HearthstoneCard from "./HearthstoneCard";
import "./hearthstone-deck.scss";

type Props = { slug: string };

export default function DeckModule({ slug }: Props) {
  const { t } = useTranslation();
  const [deck, setDeck] = useState<DeckStateDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDeck(await hearthstoneDeckService.getDeck(slug));
    } catch {
      setError(t("hearthstomancer.errors.load"));
    } finally {
      setLoading(false);
    }
  }, [slug, t]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function run(action: () => Promise<DeckStateDto>) {
    setBusy(true);
    setError(null);
    try {
      setDeck(await action());
    } catch {
      setError(t("hearthstomancer.errors.action"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="hs-moduleMessage">{t("common.loading")}</p>;
  if (!deck) return <p className="hs-moduleMessage is-error">{error ?? t("hearthstomancer.errors.load")}</p>;

  const canAct = deck.enabled && deck.permissions.canManage;

  return (
    <div className="hs-module">
      <div className="hs-module__summary">
        <span>{t("hearthstomancer.counts.remaining", { count: deck.counts.remaining })}</span>
        <span>{t("hearthstomancer.counts.drawn", { count: deck.counts.drawn })}</span>
        <span className={deck.enabled ? "is-active" : "is-inactive"}>
          {t(`hearthstomancer.state.${deck.enabled ? "active" : "inactive"}`)}
        </span>
      </div>

      {error && <p className="hs-moduleMessage is-error" role="alert">{error}</p>}

      <div className="hs-module__toolbar">
        {canAct && (
          <button type="button" disabled={busy || deck.counts.remaining === 0} onClick={() => run(() => hearthstoneDeckService.draw(slug))}>
            {t("hearthstomancer.actions.draw")}
          </button>
        )}
        {canAct && (
          <button type="button" disabled={busy} onClick={() => run(() => hearthstoneDeckService.reset(slug))}>
            <RotateCcw size={15} aria-hidden="true" /> {t("hearthstomancer.actions.reset")}
          </button>
        )}
        {canAct && deck.undoablePlay && (
          <button type="button" disabled={busy} onClick={() => run(() => hearthstoneDeckService.undoPlay(slug))}>
            <Undo2 size={15} aria-hidden="true" /> {t("hearthstomancer.actions.undoPlay")}
          </button>
        )}
        <Link to={`/characters/${slug}/deck`}>
          <ExternalLink size={15} aria-hidden="true" /> {t("hearthstomancer.actions.openDeck")}
        </Link>
      </div>

      {!deck.enabled && <p className="hs-moduleMessage">{t("hearthstomancer.inactiveHelp")}</p>}

      <div className="hs-module__drawn">
        {deck.drawnCards.length === 0 ? (
          <p className="hs-moduleMessage">{t("hearthstomancer.drawnEmpty")}</p>
        ) : deck.drawnCards.map((card) => (
          <HearthstoneCard
            key={card.copyId}
            definition={card.definition}
            golden={card.isGolden}
            compact
            actions={canAct ? (
              <>
                <button type="button" disabled={busy} onClick={() => run(() => hearthstoneDeckService.discard(slug, card.copyId))}>
                  {t("hearthstomancer.actions.discard")}
                </button>
                {!card.isGolden && (
                  <button type="button" disabled={busy} onClick={() => run(() => hearthstoneDeckService.play(slug, card.copyId))}>
                    {t("hearthstomancer.actions.play")}
                  </button>
                )}
              </>
            ) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
