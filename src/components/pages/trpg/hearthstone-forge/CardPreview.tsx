import { useEffect, useState } from "react";
import { Gem, Shield, Sparkles, Swords } from "lucide-react";
import { useTranslation } from "react-i18next";
import { GEM_RULES } from "./game";
import type { CardDraft, StoredForgeCardV1 } from "./types";

type PreviewCard = Pick<
  CardDraft,
  "name" | "illustration" | "manaCost" | "attack" | "health" | "effect" | "rarity"
> &
  Partial<Pick<StoredForgeCardV1, "gemColor" | "stability" | "unstableMode" | "flaw">>;

type CardPreviewProps = {
  card: PreviewCard;
  compact?: boolean;
};

const FALLBACK_ILLUSTRATION = "/assets/hearthstone-forge-placeholder.svg";

export default function CardPreview({ card, compact = false }: CardPreviewProps) {
  const { t } = useTranslation();
  const [imageFailed, setImageFailed] = useState(false);
  const gemColor = card.gemColor ?? GEM_RULES[card.rarity].color;
  const imageSource = imageFailed || card.illustration.kind === "fallback"
    ? FALLBACK_ILLUSTRATION
    : card.illustration.value || FALLBACK_ILLUSTRATION;

  useEffect(() => {
    setImageFailed(false);
  }, [card.illustration.kind, card.illustration.value]);

  return (
    <article
      className={`forge-card forge-card--${gemColor} ${compact ? "forge-card--compact" : ""}`}
      data-rarity={card.rarity}
      aria-label={t("hearthstoneForge.card.previewLabel", { name: card.name || t("hearthstoneForge.card.unnamed") })}
    >
      <div className="forge-card__mana" aria-label={t("hearthstoneForge.card.manaValue", { value: card.manaCost })}>
        {card.manaCost}
      </div>
      <div className="forge-card__gem" aria-hidden="true">
        <Gem size={18} strokeWidth={2.5} />
      </div>
      <div className="forge-card__art">
        <img src={imageSource} alt={card.name ? t("hearthstoneForge.card.illustrationAlt", { name: card.name }) : ""} onError={() => setImageFailed(true)} />
      </div>
      <div className="forge-card__plaque">
        <h2>{card.name.trim() || t("hearthstoneForge.card.unnamed")}</h2>
      </div>
      <div className="forge-card__text">
        <Sparkles size={16} aria-hidden="true" />
        <p>{card.effect.trim() || t("hearthstoneForge.card.noEffect")}</p>
      </div>
      <div className="forge-card__stats">
        <span aria-label={t("hearthstoneForge.card.attackValue", { value: card.attack })}>
          <Swords size={16} aria-hidden="true" />
          {card.attack}
        </span>
        <span aria-label={t("hearthstoneForge.card.healthValue", { value: card.health })}>
          <Shield size={16} aria-hidden="true" />
          {card.health}
        </span>
      </div>
      {card.stability && (
        <div className={`forge-card__seal forge-card__seal--${card.stability}`}>
          {t(`hearthstoneForge.result.seals.${card.stability}`)}
        </div>
      )}
    </article>
  );
}

