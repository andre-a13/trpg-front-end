import { ImageOff, Play, Shuffle, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { DeckCardCopyDto, DeckCardDefinitionDto } from "../../types/api";

type Props = {
  definitions: DeckCardDefinitionDto[];
  canAct: boolean;
  disabled: boolean;
  onRemove: (definition: DeckCardDefinitionDto, isGolden: boolean) => void;
};

type MinimalEntry = {
  key: string;
  definition: DeckCardDefinitionDto;
  isGolden: boolean;
  count: number;
};

function compareEntries(left: MinimalEntry, right: MinimalEntry) {
  const leftCost = left.definition.cost ?? Number.MAX_SAFE_INTEGER;
  const rightCost = right.definition.cost ?? Number.MAX_SAFE_INTEGER;
  return leftCost - rightCost || left.definition.name.localeCompare(right.definition.name, "fr");
}

function MinimalDeckEntry({
  entry,
  actions,
  quickActions,
}: {
  entry: MinimalEntry;
  actions?: ReactNode;
  quickActions?: ReactNode;
}) {
  const { t } = useTranslation();
  const { definition, isGolden, count } = entry;
  const imageUrl = definition.isVariant
    ? definition.illustrationUrl
    : (definition.renderUrl ?? definition.illustrationUrl);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => setImageFailed(false), [imageUrl]);

  const stats = [
    definition.cost != null ? `${t("hearthstomancer.card.cost")} ${definition.cost}` : null,
    definition.attack != null ? `${t("hearthstomancer.card.attack")} ${definition.attack}` : null,
    definition.health != null ? `${t("hearthstomancer.card.health")} ${definition.health}` : null,
    definition.durability != null ? `${t("hearthstomancer.card.durability")} ${definition.durability}` : null,
  ].filter(Boolean);

  const metadata = [
    definition.cardType,
    definition.rarity,
    definition.cardClass,
    definition.tribe,
    definition.spellSchool,
    definition.cardSet,
  ].filter(Boolean);

  return (
    <article
      className={`hs-minimalCard ${isGolden ? "is-golden" : ""}`}
      role="listitem"
      tabIndex={0}
    >
      <div className="hs-minimalCard__summary">
        <span className="hs-minimalCard__identity">
          {definition.cost != null && <span className="hs-minimalCard__cost">{definition.cost}</span>}
          <strong>{definition.name}</strong>
          {isGolden && <Sparkles className="hs-minimalCard__goldIcon" size={14} aria-label={t("hearthstomancer.card.golden")} />}
        </span>
        <span className="hs-minimalCard__trailing">
          <span className="hs-minimalCard__copies">{count}×</span>
          {quickActions && <span className="hs-minimalCard__quickActions">{quickActions}</span>}
        </span>
      </div>

      <div className="hs-minimalCard__details" role="tooltip">
        <div className="hs-minimalCard__visual">
          {!imageFailed && imageUrl ? (
            <img src={imageUrl} alt={definition.name} onError={() => setImageFailed(true)} />
          ) : (
            <div className="hs-minimalCard__imageFallback">
              <ImageOff size={26} aria-hidden="true" />
              <span>{definition.name}</span>
            </div>
          )}
          {isGolden && (
            <span className="hs-minimalCard__goldenBadge">
              <Sparkles size={12} aria-hidden="true" /> {t("hearthstomancer.card.golden")}
            </span>
          )}
        </div>
        <div className="hs-minimalCard__information">
          <strong>{definition.name}</strong>
          {stats.length > 0 && <p className="hs-minimalCard__stats">{stats.join(" · ")}</p>}
          {definition.text && <p>{definition.text}</p>}
          {metadata.length > 0 && <p className="hs-minimalCard__metadata">{metadata.join(" · ")}</p>}
          {actions && <div className="hs-minimalCard__actions">{actions}</div>}
        </div>
      </div>
    </article>
  );
}

export default function MinimalDeckList({ definitions, canAct, disabled, onRemove }: Props) {
  const { t } = useTranslation();
  const groups = useMemo(() => {
    const normal: MinimalEntry[] = [];
    const golden: MinimalEntry[] = [];

    definitions.forEach((definition) => {
      if (definition.remainingNormalCount > 0) {
        normal.push({
          key: `normal-${definition.id}`,
          definition,
          isGolden: false,
          count: definition.remainingNormalCount,
        });
      }
      if (definition.remainingGoldenCount > 0) {
        golden.push({
          key: `golden-${definition.id}`,
          definition,
          isGolden: true,
          count: definition.remainingGoldenCount,
        });
      }
    });

    normal.sort(compareEntries);
    golden.sort(compareEntries);
    return { normal, golden };
  }, [definitions]);

  if (groups.normal.length === 0 && groups.golden.length === 0) {
    return <p>{t("hearthstomancer.compositionEmpty")}</p>;
  }

  return (
    <div className="hs-minimalGroups">
      {groups.normal.length > 0 && (
        <section className="hs-minimalGroup">
          <h3>{t("hearthstomancer.view.normalCards")}</h3>
          <div className="hs-minimalList" role="list">
            {groups.normal.map((entry) => (
              <MinimalDeckEntry
                key={entry.key}
                entry={entry}
                actions={canAct ? (
                  <button type="button" className="is-danger" disabled={disabled} onClick={() => onRemove(entry.definition, false)}>
                    <Trash2 size={14} aria-hidden="true" /> {t("hearthstomancer.actions.remove")}
                  </button>
                ) : undefined}
              />
            ))}
          </div>
        </section>
      )}

      {groups.golden.length > 0 && (
        <section className="hs-minimalGroup is-golden">
          <h3><Sparkles size={15} aria-hidden="true" /> {t("hearthstomancer.view.goldenCards")}</h3>
          <div className="hs-minimalList" role="list">
            {groups.golden.map((entry) => (
              <MinimalDeckEntry
                key={entry.key}
                entry={entry}
                actions={canAct ? (
                  <button type="button" className="is-danger" disabled={disabled} onClick={() => onRemove(entry.definition, true)}>
                    <Sparkles size={14} aria-hidden="true" /> {t("hearthstomancer.actions.remove")}
                  </button>
                ) : undefined}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

type DrawnProps = {
  cards: DeckCardCopyDto[];
  canAct: boolean;
  disabled: boolean;
  onDiscard: (card: DeckCardCopyDto) => void;
  onPlay: (card: DeckCardCopyDto) => void;
};

export function MinimalDrawnList({ cards, canAct, disabled, onDiscard, onPlay }: DrawnProps) {
  const { t } = useTranslation();
  const entries = useMemo(() => cards.map((card) => ({
    key: `drawn-${card.copyId}`,
    definition: card.definition,
    isGolden: card.isGolden,
    count: 1,
    card,
  })).sort(compareEntries), [cards]);

  return (
    <div className="hs-minimalList" role="list">
      {entries.map((entry) => (
        <MinimalDeckEntry
          key={entry.key}
          entry={entry}
          quickActions={canAct ? (
            <>
              {!entry.isGolden && (
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={t("hearthstomancer.actions.play")}
                  title={t("hearthstomancer.actions.play")}
                  onClick={() => onPlay(entry.card)}
                >
                  <Play size={15} aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                disabled={disabled}
                aria-label={t("hearthstomancer.actions.discard")}
                title={t("hearthstomancer.actions.discard")}
                onClick={() => onDiscard(entry.card)}
              >
                <Shuffle size={15} aria-hidden="true" />
              </button>
            </>
          ) : undefined}
        />
      ))}
    </div>
  );
}
