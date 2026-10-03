import type {
  CardDraft,
  FlawId,
  ForgeOutcome,
  ForgeResolution,
  GemColor,
  PhaseKey,
  PhaseResult,
  Posture,
  Rarity,
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
  const totalBeforeRetouch = results.reduce((sum, result) => sum + result.score, 0);
  let total = totalBeforeRetouch;
  let retouch: ForgeResolution["retouch"];
  let bestDistance = Math.abs(total - target);
  const desiredAdjustment: -1 | 1 = total > target ? -1 : 1;

  for (const phase of [...PHASE_ORDER].reverse()) {
    if (!draft.masteries[phase]) continue;

    const phaseResult = results.find((result) => result.phase === phase);
    if (!phaseResult || (desiredAdjustment === -1 && phaseResult.score === 0)) continue;

    const candidateTotal = totalBeforeRetouch + desiredAdjustment;
    const candidateDistance = Math.abs(candidateTotal - target);

    if (candidateDistance < bestDistance) {
      total = candidateTotal;
      bestDistance = candidateDistance;
      retouch = { phase, adjustment: desiredAdjustment };
      break;
    }
  }

  return {
    outcome: outcomeFromDelta(total - target),
    total,
    target,
    retouch,
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

