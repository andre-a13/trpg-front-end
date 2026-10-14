import { useEffect, useState, type ReactNode } from "react";
import { ImageOff, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DeckCardDefinitionDto } from "../../types/api";

type Props = {
  definition: DeckCardDefinitionDto;
  golden?: boolean;
  compact?: boolean;
  actions?: ReactNode;
};

export default function HearthstoneCard({ definition, golden = false, compact = false, actions }: Props) {
  const { t } = useTranslation();
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

  return (
    <article className={`hs-card ${golden ? "is-golden" : ""} ${compact ? "is-compact" : ""}`}>
      <div className="hs-card__visual">
        {!imageFailed && imageUrl ? (
          <img src={imageUrl} alt={definition.name} onError={() => setImageFailed(true)} />
        ) : (
          <div className="hs-card__imageFallback">
            <ImageOff size={28} aria-hidden="true" />
            <span>{definition.name}</span>
          </div>
        )}
        {golden && (
          <span className="hs-card__golden">
            <Sparkles size={13} aria-hidden="true" />
            {t("hearthstomancer.card.golden")}
          </span>
        )}
      </div>
      <div className="hs-card__data">
        <h3>{definition.name}</h3>
        {stats.length > 0 && <p className="hs-card__stats">{stats.join(" · ")}</p>}
        {!compact && definition.text && <p className="hs-card__effect">{definition.text}</p>}
        {!compact && (
          <dl className="hs-card__metadata">
            {definition.cardType && <><dt>{t("hearthstomancer.card.type")}</dt><dd>{definition.cardType}</dd></>}
            {definition.rarity && <><dt>{t("hearthstomancer.card.rarity")}</dt><dd>{definition.rarity}</dd></>}
            {definition.cardClass && <><dt>{t("hearthstomancer.card.class")}</dt><dd>{definition.cardClass}</dd></>}
            {definition.tribe && <><dt>{t("hearthstomancer.card.tribe")}</dt><dd>{definition.tribe}</dd></>}
          </dl>
        )}
        {actions && <div className="hs-card__actions">{actions}</div>}
      </div>
    </article>
  );
}
