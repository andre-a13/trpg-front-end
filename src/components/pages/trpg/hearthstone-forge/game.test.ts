import { describe, expect, it } from "vitest";
import {
  applyCriticalRetouch,
  evaluateRetouch,
  getRetouchThreshold,
  resolveForge,
  rollD100,
  rollD6,
  scorePhase,
} from "./game";
import type { CardDraft, PhaseResult } from "./types";

function draft(overrides: Partial<CardDraft> = {}): CardDraft {
  return {
    name: "Sujet de test",
    minionType: "Méca",
    illustration: { kind: "fallback" },
    manaCost: 2,
    attack: 2,
    health: 3,
    effect: "Produit un résultat vérifiable.",
    rarity: "rare",
    skills: { runology: 60, artCalligraphy: 60, gemologyEnchantment: 60 },
    ...overrides,
  };
}

function results(scores: [number, number, number]): PhaseResult[] {
  return [
    { phase: "ink", posture: "steady", roll: 3, baseScore: scores[0], score: scores[0] },
    { phase: "paint", posture: "steady", roll: 3, baseScore: scores[1], score: scores[1] },
    { phase: "gem", posture: "steady", roll: 3, baseScore: scores[2], score: scores[2] },
  ];
}

describe("forge game engine", () => {
  it("maps each posture and die tier to its phase score", () => {
    expect([1, 3, 5].map((roll) => scorePhase("precise", roll))).toEqual([0, 1, 2]);
    expect([1, 3, 5].map((roll) => scorePhase("steady", roll))).toEqual([1, 2, 4]);
    expect([1, 3, 5].map((roll) => scorePhase("forced", roll))).toEqual([2, 4, 6]);
  });

  it("uses rejection sampling for deterministic d6 and d100 rolls", () => {
    const d6Bytes = [255, 251];
    expect(rollD6((buffer) => {
      buffer[0] = d6Bytes.shift() ?? 0;
      return buffer;
    })).toBe(6);

    const d100Bytes = [255, 199];
    expect(rollD100((buffer) => {
      buffer[0] = d100Bytes.shift() ?? 0;
      return buffer;
    })).toBe(100);
  });

  it("uses skill, skill minus 20 and skill minus 40 as retouch thresholds", () => {
    expect(getRetouchThreshold(68, 1)).toBe(68);
    expect(getRetouchThreshold(68, -2)).toBe(48);
    expect(getRetouchThreshold(68, 3)).toBe(28);
    expect(getRetouchThreshold(25, -3)).toBe(0);
  });

  it("applies a successful retouch and leaves the score unchanged on an ordinary failure", () => {
    expect(evaluateRetouch(2, "runology", 60, 2, 40).score).toBe(4);
    expect(evaluateRetouch(2, "runology", 60, 2, 41)).toMatchObject({
      score: 2,
      attempt: { outcome: "failure", threshold: 40, appliedAdjustment: 0 },
    });
  });

  it("treats 01 to 05 as critical successes with a freely chosen correction", () => {
    const evaluation = evaluateRetouch(2, "runology", 0, 3, 5);
    expect(evaluation).toMatchObject({ score: 2, attempt: { outcome: "criticalSuccess", threshold: 0 } });
    expect(applyCriticalRetouch(evaluation.score, -2)).toEqual({ score: 0, appliedAdjustment: -2 });
  });

  it("treats 96 to 100 as critical failures and changes the score randomly by three", () => {
    expect(evaluateRetouch(4, "runology", 100, -1, 96, 1)).toMatchObject({
      score: 7,
      attempt: { outcome: "criticalFailure", appliedAdjustment: 3 },
    });
    expect(evaluateRetouch(1, "runology", 100, 1, 100, -1)).toMatchObject({
      score: 0,
      attempt: { outcome: "criticalFailure", appliedAdjustment: -1 },
    });
  });

  it("distinguishes stable, unstable, undercharged and overcharged results after retouches", () => {
    expect(resolveForge(draft(), results([2, 2, 3])).outcome).toBe("stable");
    expect(resolveForge(draft(), results([2, 2, 2])).outcome).toBe("unstable");
    expect(resolveForge(draft(), results([1, 1, 1])).outcome).toBe("undercharged");
    expect(resolveForge(draft(), results([4, 4, 4])).outcome).toBe("overcharged");
  });
});
