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
export type Rarity = "common" | "rare" | "epic" | "legendary";
export type GemColor = "white" | "blue" | "violet" | "orange";
export type ForgeOutcome = "stable" | "unstable" | "undercharged" | "overcharged";
export type FlawId = "noise" | "light" | "incantation" | "recharge" | "temperament" | "condition";

export type Illustration = {
  kind: "url" | "dataUrl" | "fallback";
  value?: string;
};

export type Masteries = Record<PhaseKey, boolean>;

export type CardDraft = {
  name: string;
  illustration: Illustration;
  manaCost: number;
  attack: number;
  health: number;
  effect: string;
  rarity: Rarity;
  masteries: Masteries;
};

export type PhaseResult = {
  phase: PhaseKey;
  posture: Posture;
  roll: number;
  score: number;
};

export type RetouchResult = {
  phase: PhaseKey;
  adjustment: -1 | 1;
};

export type ForgeResolution = {
  outcome: ForgeOutcome;
  total: number;
  target: number;
  retouch?: RetouchResult;
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

