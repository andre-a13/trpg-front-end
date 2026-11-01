import { beforeEach, describe, expect, it } from "vitest";
import {
  FORGE_SKILLS_STORAGE_KEY,
  FORGE_STORAGE_KEY,
  loadForgeCards,
  loadForgeSkills,
  saveForgeCards,
  saveForgeSkills,
} from "./storage";
import type { StoredForgeCardV1 } from "./types";

const card: StoredForgeCardV1 = {
  id: "card-1",
  name: "Archiviste incandescent",
  illustration: { kind: "fallback" },
  manaCost: 3,
  attack: 2,
  health: 4,
  effect: "Range les étincelles par ordre alphabétique.",
  rarity: "rare",
  gemColor: "blue",
  stability: "stable",
  createdAt: "2026-10-03T12:00:00.000Z",
};

describe("forge collection storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips a versioned collection", () => {
    saveForgeCards([card]);
    expect(loadForgeCards()).toEqual([card]);
  });

  it("ignores malformed and unknown data", () => {
    window.localStorage.setItem(FORGE_STORAGE_KEY, "not-json");
    expect(loadForgeCards()).toEqual([]);

    window.localStorage.setItem(FORGE_STORAGE_KEY, JSON.stringify({ version: 2, cards: [card] }));
    expect(loadForgeCards()).toEqual([]);

    window.localStorage.setItem(FORGE_STORAGE_KEY, JSON.stringify({ version: 1, cards: [{ id: 12 }] }));
    expect(loadForgeCards()).toEqual([]);
  });

  it("surfaces quota failures to the caller", () => {
    const failingStorage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      },
    } as unknown as Storage;

    expect(() => saveForgeCards([card], failingStorage)).toThrow();
  });

  it("remembers the last complete set of skill scores", () => {
    const skills = { runology: 61, artCalligraphy: 52, gemologyEnchantment: 73 };
    saveForgeSkills(skills);

    expect(loadForgeSkills()).toEqual(skills);
    expect(window.localStorage.getItem(FORGE_SKILLS_STORAGE_KEY)).toContain('"runology":61');
  });

  it("ignores incomplete or malformed remembered skills", () => {
    saveForgeSkills({ runology: 50, artCalligraphy: null, gemologyEnchantment: 70 });
    expect(window.localStorage.getItem(FORGE_SKILLS_STORAGE_KEY)).toBeNull();

    window.localStorage.setItem(FORGE_SKILLS_STORAGE_KEY, JSON.stringify({
      version: 1,
      skills: { runology: 120, artCalligraphy: 50, gemologyEnchantment: 70 },
    }));
    expect(loadForgeSkills()).toEqual({ runology: null, artCalligraphy: null, gemologyEnchantment: null });
  });
});

