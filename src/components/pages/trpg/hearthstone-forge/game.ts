import type {
  CardDraft,
  CriticalAdjustment,
  FlawId,
  ForgeOutcome,
  ForgeResolution,
  GemColor,
  PhaseKey,
  PhaseResult,
  Posture,
  Rarity,
  RetouchAdjustment,
  RetouchAttempt,
  SkillKey,
  StoredForgeCardV1,
} from "./types";

export const PHASE_ORDER: PhaseKey[] = ["ink", "paint", "gem"];

export const GEM_RULES: Record<Rarity, { color: GemColor; target: number }> = {
  common: { color: "white", target: 10 },
  rare: { color: "blue", target: 7 },
  epic: { color: "violet", target: 4 },
  legendary: { color: "orange", target: 1 },
};

export const POSTURE_SCORES: Record<Posture, readonly [number, number, number]> = {
  precise: [0, 1, 2],
  steady: [1, 2, 4],
  forced: [2, 4, 6],
};

export const SKILL_BY_PHASE: Record<PhaseKey, SkillKey> = {
  ink: "runology",
  paint: "artCalligraphy",
  gem: "gemologyEnchantment",
};

export const RETOUCH_PENALTIES: Record<1 | 2 | 3, number> = {
  1: 0,
  2: 20,
  3: 40,
};

export const FLAWS: FlawId[] = ["noise", "light", "incantation", "recharge", "temperament", "condition"];

export type RandomByteSource = (buffer: Uint8Array) => Uint8Array;

const defaultRandomByteSource: RandomByteSource = (buffer) => crypto.getRandomValues(buffer);

export function rollD6(source: RandomByteSource = defaultRandomByteSource): number {
  const bytes = new Uint8Array(1);

  do {
    source(bytes);
  } while (bytes[0] >= 252);

  return (bytes[0] % 6) + 1;
}

export function rollD100(source: RandomByteSource = defaultRandomByteSource): number {
  const bytes = new Uint8Array(1);

  do {
    source(bytes);
  } while (bytes[0] >= 200);

  return (bytes[0] % 100) + 1;
}

export function scorePhase(posture: Posture, roll: number): number {
  if (!Number.isInteger(roll) || roll < 1 || roll > 6) {
    throw new RangeError("A phase roll must be an integer between 1 and 6.");
  }

  const tier = roll <= 2 ? 0 : roll <= 4 ? 1 : 2;
  return POSTURE_SCORES[posture][tier];
}

export function pickFlaw(roller: () => number = rollD6): FlawId {
  const roll = roller();
  if (!Number.isInteger(roll) || roll < 1 || roll > 6) {
    throw new RangeError("A flaw roll must be an integer between 1 and 6.");
  }
  return FLAWS[roll - 1];
}

export function getRetouchThreshold(skillScore: number, adjustment: RetouchAdjustment): number {
  if (!Number.isInteger(skillScore) || skillScore < 0 || skillScore > 100) {
    throw new RangeError("A skill score must be an integer between 0 and 100.");
  }

  const magnitude = Math.abs(adjustment) as 1 | 2 | 3;
  return Math.max(0, skillScore - RETOUCH_PENALTIES[magnitude]);
}

function adjustedScore(score: number, adjustment: number): { score: number; appliedAdjustment: number } {
  const nextScore = Math.max(0, score + adjustment);
  return { score: nextScore, appliedAdjustment: nextScore - score };
}

export function evaluateRetouch(
  score: number,
  skill: SkillKey,
  skillScore: number,
  requestedAdjustment: RetouchAdjustment,
  roll: number,
  criticalFailureDirection: -1 | 1 = 1,
): { score: number; attempt: RetouchAttempt } {
  if (!Number.isInteger(score) || score < 0) {
    throw new RangeError("A phase score must be a non-negative integer.");
  }
  if (!Number.isInteger(roll) || roll < 1 || roll > 100) {
    throw new RangeError("A skill roll must be an integer between 1 and 100.");
  }

  const threshold = getRetouchThreshold(skillScore, requestedAdjustment);
  let outcome: RetouchAttempt["outcome"];
  let resolved = { score, appliedAdjustment: 0 };

  if (roll <= 5) {
    outcome = "criticalSuccess";
  } else if (roll >= 96) {
    outcome = "criticalFailure";
    resolved = adjustedScore(score, criticalFailureDirection * 3);
  } else if (roll <= threshold) {
    outcome = "success";
    resolved = adjustedScore(score, requestedAdjustment);
  } else {
    outcome = "failure";
  }

  return {
    score: resolved.score,
    attempt: {
      skill,
      skillScore,
      requestedAdjustment,
      roll,
      threshold,
      outcome,
      appliedAdjustment: resolved.appliedAdjustment,
    },
  };
}

export function applyCriticalRetouch(score: number, adjustment: CriticalAdjustment): { score: number; appliedAdjustment: number } {
  if (!Number.isInteger(adjustment) || adjustment < -3 || adjustment > 3) {
    throw new RangeError("A critical retouch must be between -3 and 3.");
  }
  return adjustedScore(score, adjustment);
}

function outcomeFromDelta(delta: number): ForgeOutcome {
  if (delta === 0) return "stable";
  if (Math.abs(delta) === 1) return "unstable";
  return delta < 0 ? "undercharged" : "overcharged";
}

export function resolveForge(draft: CardDraft, results: PhaseResult[]): ForgeResolution {
  if (results.length !== PHASE_ORDER.length || PHASE_ORDER.some((phase) => !results.some((result) => result.phase === phase))) {
    throw new Error("All three forge phases are required before resolution.");
  }

  const target = GEM_RULES[draft.rarity].target;
  const total = results.reduce((sum, result) => sum + result.score, 0);

  return {
    outcome: outcomeFromDelta(total - target),
    total,
    target,
  };
}

export function createStoredCard(
  draft: CardDraft,
  stability: StoredForgeCardV1["stability"],
  options: Pick<StoredForgeCardV1, "unstableMode" | "flaw"> = {},
): StoredForgeCardV1 {
  return {
    id: crypto.randomUUID(),
    name: draft.name.trim(),
    ...(draft.minionType.trim() ? { minionType: draft.minionType.trim() } : {}),
    illustration: draft.illustration,
    manaCost: draft.manaCost,
    attack: draft.attack,
    health: draft.health,
    effect: draft.effect.trim(),
    rarity: draft.rarity,
    gemColor: GEM_RULES[draft.rarity].color,
    stability,
    ...options,
    createdAt: new Date().toISOString(),
  };
}

