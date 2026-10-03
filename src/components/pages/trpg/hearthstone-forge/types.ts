export type ForgeView =
  | "landing"
  | "design"
  | "ink"
  | "paint"
  | "gem"
  | "resolving"
  | "unstableChoice"
  | "result"
  | "collection";

export type PhaseKey = "ink" | "paint" | "gem";
export type Posture = "precise" | "steady" | "forced";
export type SkillKey = "runology" | "artCalligraphy" | "gemologyEnchantment";
export type SkillScores = Record<SkillKey, number | null>;
export type RetouchAdjustment = -3 | -2 | -1 | 1 | 2 | 3;
export type CriticalAdjustment = RetouchAdjustment | 0;
export type RetouchOutcome = "success" | "failure" | "criticalSuccess" | "criticalFailure";
export type Rarity = "common" | "rare" | "epic" | "legendary";
export type GemColor = "white" | "blue" | "violet" | "orange";
export type ForgeOutcome = "stable" | "unstable" | "undercharged" | "overcharged";
export type FlawId = "noise" | "light" | "incantation" | "recharge" | "temperament" | "condition";

export type Illustration = {
  kind: "url" | "dataUrl" | "fallback";
  value?: string;
};

export type CardDraft = {
  name: string;
  illustration: Illustration;
  manaCost: number;
  attack: number;
  health: number;
  effect: string;
  rarity: Rarity;
  skills: SkillScores;
};

export type RetouchAttempt = {
  skill: SkillKey;
  skillScore: number;
  requestedAdjustment: RetouchAdjustment;
  roll: number;
  threshold: number;
  outcome: RetouchOutcome;
  appliedAdjustment: number;
};

export type PhaseResult = {
  phase: PhaseKey;
  posture: Posture;
  roll: number;
  baseScore: number;
  score: number;
  retouch?: RetouchAttempt;
};

export type ForgeResolution = {
  outcome: ForgeOutcome;
  total: number;
  target: number;
};

export type StoredForgeCardV1 = {
  id: string;
  name: string;
  illustration: Illustration;
  manaCost: number;
  attack: number;
  health: number;
  effect: string;
  rarity: Rarity;
  gemColor: GemColor;
  stability: "stable" | "unstable";
  unstableMode?: "singleUse" | "flawed";
  flaw?: FlawId;
  createdAt: string;
};

