import { describe, expect, it } from "vitest";
import { resolveForge, rollD6, scorePhase } from "./game";
import type { CardDraft, PhaseResult } from "./types";

function draft(overrides: Partial<CardDraft> = {}): CardDraft {
  return {
    name: "Sujet de test",
    illustration: { kind: "fallback" },
    manaCost: 2,
    attack: 2,
    health: 3,
    effect: "Produit un résultat vérifiable.",
    rarity: "rare",
    masteries: { ink: false, paint: false, gem: false },
    ...overrides,
  };
}

function results(scores: [number, number, number]): PhaseResult[] {
  return [
    { phase: "ink", posture: "steady", roll: 3, score: scores[0] },
    { phase: "paint", posture: "steady", roll: 3, score: scores[1] },
    { phase: "gem", posture: "steady", roll: 3, score: scores[2] },
  ];
}

describe("forge game engine", () => {
  it("maps each posture and die tier to its hidden score", () => {
    expect([1, 3, 5].map((roll) => scorePhase("precise", roll))).toEqual([0, 1, 2]);
    expect([1, 3, 5].map((roll) => scorePhase("steady", roll))).toEqual([1, 2, 4]);
    expect([1, 3, 5].map((roll) => scorePhase("forced", roll))).toEqual([2, 4, 6]);
  });

  it("uses rejection sampling for an unbiased d6", () => {
    const bytes = [255, 251];
    const roll = rollD6((buffer) => {
      buffer[0] = bytes.shift() ?? 0;
      return buffer;
    });

    expect(roll).toBe(6);
    expect(bytes).toHaveLength(0);
  });

  it("applies the single retouch to the latest mastered phase", () => {
    const resolution = resolveForge(
      draft({ masteries: { ink: false, paint: true, gem: true } }),
      results([2, 2, 4]),
    );

    expect(resolution).toMatchObject({
      outcome: "stable",
      total: 7,
      target: 7,
      retouch: { phase: "gem", adjustment: -1 },
    });
  });

  it("does not spend a retouch unless it improves the result", () => {
    const resolution = resolveForge(
      draft({ masteries: { ink: true, paint: true, gem: true } }),
      results([2, 2, 3]),
    );

    expect(resolution.outcome).toBe("stable");
    expect(resolution.retouch).toBeUndefined();
  });

  it("distinguishes unstable, undercharged and overcharged results", () => {
    expect(resolveForge(draft(), results([2, 2, 2])).outcome).toBe("unstable");
    expect(resolveForge(draft(), results([1, 1, 1])).outcome).toBe("undercharged");
    expect(resolveForge(draft(), results([4, 4, 4])).outcome).toBe("overcharged");
  });
});

