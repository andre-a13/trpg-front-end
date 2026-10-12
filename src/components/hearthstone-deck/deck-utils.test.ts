import { describe, expect, it } from "vitest";
import type { DeckCardDefinitionDto } from "../../types/api";
import {
  filterDeckDefinitions,
  getDeckFilterOptions,
  getDeckInsights,
  getRarityEffectClass,
} from "./deck-utils";

function definition(overrides: Partial<DeckCardDefinitionDto>): DeckCardDefinitionDto {
  return {
    id: 1,
    sourceCardId: "TEST_001",
    name: "Carte test",
    cost: 2,
    attack: 2,
    health: 3,
    durability: null,
    text: "Effet",
    cardType: "MINION",
    rarity: "COMMON",
    cardClass: "NEUTRAL",
    tribe: null,
    spellSchool: null,
    cardSet: "CORE",
    cardSetName: "Fondamental",
    illustrationUrl: "https://example.test/card.webp",
    renderUrl: "https://example.test/card.png",
    originalIllustrationUrl: "https://example.test/card.webp",
    isVariant: false,
    normalCount: 1,
    goldenCount: 0,
    remainingNormalCount: 1,
    remainingGoldenCount: 0,
    ...overrides,
  };
}

describe("deck utilities", () => {
  const cards = [
    definition({ id: 1, name: "Acolyte", cost: 1, normalCount: 2, remainingNormalCount: 1 }),
    definition({ id: 2, name: "Dragon doré", cost: 8, rarity: "LEGENDARY", cardType: "MINION", cardClass: "MAGE", normalCount: 0, goldenCount: 1, remainingNormalCount: 0, remainingGoldenCount: 1 }),
    definition({ id: 3, name: "Explosion", cost: 4, rarity: "EPIC", cardType: "SPELL", cardClass: "MAGE", normalCount: 1, goldenCount: 0, remainingNormalCount: 1, remainingGoldenCount: 0 }),
  ];

  it("builds totals, average mana, rarity counts and the 7+ bucket", () => {
    const insights = getDeckInsights(cards);
    expect(insights).toMatchObject({ total: 4, normal: 3, golden: 1, averageCost: 3.5 });
    expect(insights.curve[1].count).toBe(2);
    expect(insights.curve[7].count).toBe(1);
    expect(insights.rarities).toContainEqual({ name: "LEGENDARY", count: 1 });
  });

  it("filters editions without reintroducing drawn copies and sorts by cost", () => {
    const result = filterDeckDefinitions(cards, {
      query: "",
      rarity: "",
      cardType: "",
      cardClass: "",
      edition: "golden",
      sort: "cost",
    });
    expect(result.map((card) => card.name)).toEqual(["Dragon doré"]);
  });

  it("searches names and metadata and exposes distinct filter values", () => {
    expect(filterDeckDefinitions(cards, {
      query: "explosion",
      rarity: "",
      cardType: "",
      cardClass: "MAGE",
      edition: "all",
      sort: "name",
    }).map((card) => card.id)).toEqual([3]);
    expect(getDeckFilterOptions(cards)).toMatchObject({
      cardTypes: ["MINION", "SPELL"],
      cardClasses: ["MAGE", "NEUTRAL"],
    });
  });

  it("maps localized rarities to visual effect classes", () => {
    expect(getRarityEffectClass("Épique")).toBe("is-epic");
    expect(getRarityEffectClass("LEGENDARY")).toBe("is-legendary");
    expect(getRarityEffectClass("COMMON")).toBe("is-common");
  });
});
