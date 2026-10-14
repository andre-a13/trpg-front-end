import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sword } from "lucide-react";
import { GEM_RULES } from "./game";
import type { CardDraft, StoredForgeCardV1 } from "./types";

type PreviewCard = Pick<
  CardDraft,
  "name" | "illustration" | "manaCost" | "attack" | "health" | "effect" | "rarity"
> &
  { minionType?: string } &
  Partial<Pick<StoredForgeCardV1, "gemColor" | "stability" | "unstableMode" | "flaw">>;

type CardPreviewProps = {
  card: PreviewCard;
  compact?: boolean;
};

const FALLBACK_ILLUSTRATION = "/assets/hearthstone-forge-placeholder.svg";
const EFFECT_KEYWORDS = new Set([
  "bouclier divin",
  "camouflage",
  "charge",
  "cri de guerre",
  "découverte",
  "furie des vents",
  "provocation",
  "râle d'agonie",
  "ruée",
  "toxicité",
  "vol de vie",
]);
const EFFECT_KEYWORD_PATTERN = /(Bouclier divin|Camouflage|Charge|Cri de guerre|Découverte|Furie des vents|Provocation|Râle d'agonie|Ruée|Toxicité|Vol de vie)/gi;

function renderEffectText(effect: string) {
  return effect.split(EFFECT_KEYWORD_PATTERN).map((part, index) => (
    EFFECT_KEYWORDS.has(part.toLocaleLowerCase("fr"))
      ? <strong key={`${part}-${index}`}>{part}</strong>
      : part
  ));
}

export default function CardPreview({ card, compact = false }: CardPreviewProps) {
  const { t } = useTranslation();
  const [imageFailed, setImageFailed] = useState(false);
  const gemColor = card.gemColor ?? GEM_RULES[card.rarity].color;
  const displayName = card.name.trim() || t("hearthstoneForge.card.unnamed");
  const displayEffect = card.effect.trim() || t("hearthstoneForge.card.noEffect");
  const displayMinionType = card.minionType?.trim();
  const rarityLabel = t(`hearthstoneForge.rarities.${card.rarity}`);
  const densityClass = displayEffect.length > 190
    ? "forge-card__text--very-dense"
    : displayEffect.length > 120
      ? "forge-card__text--dense"
      : "";
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
      aria-label={t("hearthstoneForge.card.previewLabel", { name: displayName })}
    >
      <div className="forge-card__frame" aria-hidden="true">
        <span className="forge-card__frame-crown" />
        <span className="forge-card__frame-flourish forge-card__frame-flourish--left" />
        <span className="forge-card__frame-flourish forge-card__frame-flourish--right" />
      </div>
      <div className="forge-card__mana" aria-label={t("hearthstoneForge.card.manaValue", { value: card.manaCost })}>
        <span>{card.manaCost}</span>
      </div>
      <div className="forge-card__art">
        <img src={imageSource} alt={card.name ? t("hearthstoneForge.card.illustrationAlt", { name: card.name }) : ""} onError={() => setImageFailed(true)} />
      </div>
      <div className="forge-card__plaque">
        <h2>{displayName}</h2>
      </div>
      <div
        className="forge-card__gem"
        aria-label={t("hearthstoneForge.card.rarityValue", { rarity: rarityLabel })}
        title={rarityLabel}
      >
        <span aria-hidden="true" />
      </div>
      <div className={`forge-card__text ${densityClass}`}>
        <p>{renderEffectText(displayEffect)}</p>
      </div>
      {displayMinionType && (
        <div className="forge-card__type">
          <span>{displayMinionType}</span>
        </div>
      )}
      <div className="forge-card__attack" aria-label={t("hearthstoneForge.card.attackValue", { value: card.attack })}>
        <Sword className="forge-card__attack-icon" aria-hidden="true" />
        <span>{card.attack}</span>
      </div>
      <div className="forge-card__health" aria-label={t("hearthstoneForge.card.healthValue", { value: card.health })}>
        <span>{card.health}</span>
      </div>
      {card.stability && (
        <div className={`forge-card__seal forge-card__seal--${card.stability}`}>
          {t(`hearthstoneForge.result.seals.${card.stability}`)}
        </div>
      )}
    </article>
  );
}

