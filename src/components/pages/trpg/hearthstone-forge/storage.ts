import type { FlawId, GemColor, Illustration, Rarity, SkillScores, StoredForgeCardV1 } from "./types";

export const FORGE_STORAGE_KEY = "trpg.hearthstoneForge.cards.v1";
export const FORGE_SKILLS_STORAGE_KEY = "trpg.hearthstoneForge.skills.v1";

type StoredEnvelopeV1 = {
  version: 1;
  cards: StoredForgeCardV1[];
};

const rarities = new Set<Rarity>(["common", "rare", "epic", "legendary"]);
const gemColors = new Set<GemColor>(["white", "blue", "violet", "orange"]);
const flaws = new Set<FlawId>(["noise", "light", "incantation", "recharge", "temperament", "condition"]);

function isIntegerInRange(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum;
}

function isIllustration(value: unknown): value is Illustration {
  if (!value || typeof value !== "object") return false;
  const illustration = value as Partial<Illustration>;
  if (!illustration.kind || !["url", "dataUrl", "fallback"].includes(illustration.kind)) return false;
  return illustration.kind === "fallback" || typeof illustration.value === "string";
}

function isStoredCard(value: unknown): value is StoredForgeCardV1 {
  if (!value || typeof value !== "object") return false;
  const card = value as Partial<StoredForgeCardV1>;

  return (
    typeof card.id === "string" &&
    typeof card.name === "string" && card.name.trim().length >= 1 && card.name.length <= 80 &&
    (card.minionType === undefined || (typeof card.minionType === "string" && card.minionType.length <= 40)) &&
    isIllustration(card.illustration) &&
    isIntegerInRange(card.manaCost, 0, 20) &&
    isIntegerInRange(card.attack, 0, 99) &&
    isIntegerInRange(card.health, 1, 99) &&
    typeof card.effect === "string" && card.effect.trim().length >= 1 && card.effect.length <= 300 &&
    rarities.has(card.rarity as Rarity) &&
    gemColors.has(card.gemColor as GemColor) &&
    (card.stability === "stable" || card.stability === "unstable") &&
    (card.unstableMode === undefined || card.unstableMode === "singleUse" || card.unstableMode === "flawed") &&
    (card.flaw === undefined || flaws.has(card.flaw)) &&
    typeof card.createdAt === "string" && !Number.isNaN(Date.parse(card.createdAt))
  );
}

export function loadForgeCards(storage: Storage = window.localStorage): StoredForgeCardV1[] {
  try {
    const raw = storage.getItem(FORGE_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as Partial<StoredEnvelopeV1>;
    if (parsed.version !== 1 || !Array.isArray(parsed.cards)) return [];

    return parsed.cards.filter(isStoredCard).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export function saveForgeCards(cards: StoredForgeCardV1[], storage: Storage = window.localStorage): void {
  const envelope: StoredEnvelopeV1 = { version: 1, cards };
  storage.setItem(FORGE_STORAGE_KEY, JSON.stringify(envelope));
}

export function loadForgeSkills(storage: Storage = window.localStorage): SkillScores {
  const empty: SkillScores = { runology: null, artCalligraphy: null, gemologyEnchantment: null };

  try {
    const raw = storage.getItem(FORGE_SKILLS_STORAGE_KEY);
    if (!raw) return empty;

    const parsed = JSON.parse(raw) as { version?: unknown; skills?: Partial<SkillScores> };
    if (parsed.version !== 1 || !parsed.skills) return empty;

    const { runology, artCalligraphy, gemologyEnchantment } = parsed.skills;
    if (
      !isIntegerInRange(runology, 0, 100) ||
      !isIntegerInRange(artCalligraphy, 0, 100) ||
      !isIntegerInRange(gemologyEnchantment, 0, 100)
    ) return empty;

    return { runology, artCalligraphy, gemologyEnchantment };
  } catch {
    return empty;
  }
}

export function saveForgeSkills(skills: SkillScores, storage: Storage = window.localStorage): void {
  if (Object.values(skills).some((score) => !isIntegerInRange(score, 0, 100))) return;
  storage.setItem(FORGE_SKILLS_STORAGE_KEY, JSON.stringify({ version: 1, skills }));
}

