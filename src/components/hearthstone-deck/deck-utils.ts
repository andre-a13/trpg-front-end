import type { DeckCardDefinitionDto } from "../../types/api";

export type DeckEditionFilter = "all" | "normal" | "golden";
export type DeckSort = "cost" | "name" | "rarity";

export type DeckFilters = {
  query: string;
  rarity: string;
  cardType: string;
  cardClass: string;
  edition: DeckEditionFilter;
  sort: DeckSort;
};

export type ManaCurveBucket = {
  label: string;
  count: number;
};

export type DeckInsights = {
  total: number;
  normal: number;
  golden: number;
  averageCost: number;
  curve: ManaCurveBucket[];
  rarities: Array<{ name: string; count: number }>;
};

const RARITY_ORDER = ["FREE", "COMMON", "RARE", "EPIC", "LEGENDARY"];

function normalize(value?: string | null) {
  return (value ?? "").trim().toLocaleLowerCase("fr");
}

function definitionCount(definition: DeckCardDefinitionDto) {
  return definition.normalCount + definition.goldenCount;
}

export function getDeckInsights(definitions: DeckCardDefinitionDto[]): DeckInsights {
  const curve = Array.from({ length: 8 }, (_, index) => ({
    label: index === 7 ? "7+" : String(index),
    count: 0,
  }));
  const rarityCounts = new Map<string, number>();
  let total = 0;
  let normal = 0;
  let golden = 0;
  let totalCost = 0;
  let costedCards = 0;

  definitions.forEach((definition) => {
    const count = definitionCount(definition);
    total += count;
    normal += definition.normalCount;
    golden += definition.goldenCount;

    if (definition.cost != null) {
      const bucket = Math.min(7, Math.max(0, Math.floor(definition.cost)));
      curve[bucket].count += count;
      totalCost += definition.cost * count;
      costedCards += count;
    }

    const rarity = definition.rarity?.trim();
    if (rarity) rarityCounts.set(rarity, (rarityCounts.get(rarity) ?? 0) + count);
  });

  return {
    total,
    normal,
    golden,
    averageCost: costedCards > 0 ? totalCost / costedCards : 0,
    curve,
    rarities: [...rarityCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => {
        const leftIndex = RARITY_ORDER.indexOf(left.name.toUpperCase());
        const rightIndex = RARITY_ORDER.indexOf(right.name.toUpperCase());
        return (leftIndex < 0 ? 99 : leftIndex) - (rightIndex < 0 ? 99 : rightIndex)
          || left.name.localeCompare(right.name, "fr");
      }),
  };
}

export function getDeckFilterOptions(definitions: DeckCardDefinitionDto[]) {
  const unique = (values: Array<string | null | undefined>) => [...new Set(
    values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)),
  )].sort((left, right) => left.localeCompare(right, "fr"));

  return {
    rarities: unique(definitions.map((definition) => definition.rarity)),
    cardTypes: unique(definitions.map((definition) => definition.cardType)),
    cardClasses: unique(definitions.map((definition) => definition.cardClass)),
  };
}

export function filterDeckDefinitions(
  definitions: DeckCardDefinitionDto[],
  filters: DeckFilters,
) {
  const query = normalize(filters.query);
  const filtered = definitions.filter((definition) => {
    const matchesQuery = !query || [
      definition.name,
      definition.text,
      definition.cardSet,
      definition.cardSetName,
    ].some((value) => normalize(value).includes(query));
    const matchesRarity = !filters.rarity || definition.rarity === filters.rarity;
    const matchesType = !filters.cardType || definition.cardType === filters.cardType;
    const matchesClass = !filters.cardClass || definition.cardClass === filters.cardClass;
    const matchesEdition = filters.edition === "all"
      || (filters.edition === "normal" && definition.remainingNormalCount > 0)
      || (filters.edition === "golden" && definition.remainingGoldenCount > 0);
    return matchesQuery && matchesRarity && matchesType && matchesClass && matchesEdition;
  });

  return [...filtered].sort((left, right) => {
    if (filters.sort === "name") return left.name.localeCompare(right.name, "fr");
    if (filters.sort === "rarity") {
      const leftIndex = RARITY_ORDER.indexOf((left.rarity ?? "").toUpperCase());
      const rightIndex = RARITY_ORDER.indexOf((right.rarity ?? "").toUpperCase());
      return (leftIndex < 0 ? 99 : leftIndex) - (rightIndex < 0 ? 99 : rightIndex)
        || left.name.localeCompare(right.name, "fr");
    }
    return (left.cost ?? Number.MAX_SAFE_INTEGER) - (right.cost ?? Number.MAX_SAFE_INTEGER)
      || left.name.localeCompare(right.name, "fr");
  });
}

export function getRarityEffectClass(rarity?: string | null) {
  const normalized = normalize(rarity);
  if (normalized.includes("legend")) return "is-legendary";
  if (normalized.includes("epic") || normalized.includes("épique")) return "is-epic";
  if (normalized.includes("rare")) return "is-rare";
  return "is-common";
}
