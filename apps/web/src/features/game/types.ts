export const RANK_ORDER = [
  "学徒",
  "炼金士",
  "大炼金士",
  "贤者候补",
  "至高炼金术师",
] as const;

export type Rank = (typeof RANK_ORDER)[number];

export const RESOURCE_KEYS = [
  "ash",
  "ironSand",
  "salt",
  "copperFilings",
  "sulfur",
  "leadIngot",
  "herbEssence",
  "mercury",
  "obsidian",
  "crystalShard",
  "lotusResin",
  "moonDew",
  "sunBloom",
  "nightBloom",
  "silverLeaf",
  "mistPearl",
  "sunShard",
  "voidInk",
  "runeBone",
  "aetherDust",
  "emberCore",
  "goldDust",
  "etherGlass",
  "starlightThread",
  "quicksilverBloom",
  "dragonScale",
  "auricCatalyst",
  "philosopherSeed",
  "philosopherStone",
] as const;

export type ResourceKey = (typeof RESOURCE_KEYS)[number];

export type ResourcePool = Record<ResourceKey, number>;

export type JournalType = "story" | "craft" | "event" | "system";

export interface JournalEntry {
  id: string;
  day: number;
  type: JournalType;
  title: string;
  body: string;
  source?: "ai" | "fallback";
  createdAt: string;
}

export interface LastEventDigest {
  id: string;
  title: string;
  body: string;
  source: "ai" | "fallback";
  outcomeSummary: string;
}

export type ActiveEffectKind = "tolerance_bonus" | "tolerance_penalty" | "yield_bonus";

export interface ActiveEffect {
  id: string;
  kind: ActiveEffectKind;
  label: string;
  description: string;
  value: number;
  remainingTransmutations: number;
}

export interface GameState {
  version: 1;
  day: number;
  actionsLeft: number;
  rank: Rank;
  knowledge: number;
  mastery: number;
  reputation: number;
  vigor: number;
  resources: ResourcePool;
  unlockedRecipes: string[];
  completedRecipes: string[];
  discoveredFormulas: string[];
  activeEffects: ActiveEffect[];
  journal: JournalEntry[];
  ended: boolean;
  ending: "none" | "philosopher_stone";
  lastActionSummary: string;
  lastEvent?: LastEventDigest;
  rngSeed: number;
}

export type ChapterChoiceAction =
  | "study"
  | "gather"
  | "distill"
  | "lecture"
  | "meditate"
  | "emerald_tablet";

export interface ChapterChoice {
  id: string;
  label: string;
  action: ChapterChoiceAction;
  flavorText: string;
}

export interface ChapterData {
  id: string;
  rank: Exclude<Rank, "至高炼金术师">;
  title: string;
  summary: string;
  atmosphere: string;
  choices: ChapterChoice[];
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  minRank: Rank;
  requiredKnowledge: number;
  requiredMastery: number;
  difficulty: number;
  ingredients: Partial<ResourcePool>;
  outputs: Partial<ResourcePool>;
  successLog: string;
}

export interface CraftResult {
  state: GameState;
  success: boolean;
  critical: boolean;
  recipeId: string;
  message: string;
}

export interface EventContext {
  day: number;
  rank: Rank;
  chapterTitle: string;
  trigger: "choice" | "craft";
  lastActionSummary: string;
  mastery: number;
  knowledge: number;
  reputation: number;
}

export interface NarrativeEvent {
  id: string;
  title: string;
  body: string;
  tags: string[];
  source: "ai" | "fallback";
}

export interface EventOutcome {
  success: boolean;
  critical: boolean;
  backlash: boolean;
  summary: string;
  delta: Partial<{
    knowledge: number;
    mastery: number;
    reputation: number;
    vigor: number;
  }> & {
    resources?: Partial<ResourcePool>;
  };
}

export interface TriggeredEvent {
  event: NarrativeEvent;
  outcome: EventOutcome;
}

export interface AiRuntimeConfig {
  enabled: boolean;
  baseUrl?: string;
  model?: string;
  apiKey?: string;
}

export interface SaveDataV1 {
  version: 1;
  state: GameState;
  updatedAt: string;
}
