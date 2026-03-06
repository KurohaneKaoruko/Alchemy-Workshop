import { getRecipesUnlockedByRank } from "@/features/game/data/recipes";
import {
  createEmptyResources,
  createEntryId,
  mergeResourceDelta,
} from "@/features/game/logic/utils";
import type {
  ActiveEffect,
  GameState,
  JournalEntry,
  JournalType,
  Rank,
  ResourcePool,
} from "@/features/game/types";

export function createInitialGameState(): GameState {
  const baseResources = createEmptyResources();
  const seededResources: Partial<ResourcePool> = {
    ash: 4,
    ironSand: 4,
    salt: 2,
    copperFilings: 2,
    sulfur: 1,
    herbEssence: 2,
    mercury: 1,
    moonDew: 2,
    obsidian: 1,
    crystalShard: 1,
    lotusResin: 1,
  };

  return {
    version: 1,
    day: 1,
    actionsLeft: 3,
    rank: "学徒",
    knowledge: 4,
    mastery: 3,
    reputation: 0,
    vigor: 8,
    resources: mergeResourceDelta(baseResources, seededResources),
    unlockedRecipes: getRecipesUnlockedByRank("学徒"),
    completedRecipes: [],
    discoveredFormulas: ["triad_prime"],
    activeEffects: [],
    journal: [
      createJournalEntry({
        day: 1,
        type: "system",
        title: "工坊启程",
        body: "你接过师傅留下的铜钥匙，第一炉火在地窖中被点亮。",
      }),
    ],
    ended: false,
    ending: "none",
    lastActionSummary: "你在黑土与火之间立下誓言，成为学徒。",
    rngSeed: Date.now(),
  };
}

export function createJournalEntry(input: {
  day: number;
  type: JournalType;
  title: string;
  body: string;
  source?: "ai" | "fallback";
}): JournalEntry {
  return {
    id: createEntryId(input.type),
    day: input.day,
    type: input.type,
    title: input.title,
    body: input.body,
    source: input.source,
    createdAt: new Date().toISOString(),
  };
}

export function appendJournal(state: GameState, entry: JournalEntry): GameState {
  return {
    ...state,
    journal: [entry, ...state.journal].slice(0, 80),
  };
}

export function withRankUnlockedRecipes(state: GameState, rank: Rank): GameState {
  const merged = new Set([...state.unlockedRecipes, ...getRecipesUnlockedByRank(rank)]);
  return {
    ...state,
    unlockedRecipes: [...merged],
  };
}

export function addOrRefreshEffect(
  state: GameState,
  effect: Omit<ActiveEffect, "id">,
): GameState {
  const existingIndex = state.activeEffects.findIndex(
    (item) => item.kind === effect.kind && item.label === effect.label,
  );

  if (existingIndex < 0) {
    return {
      ...state,
      activeEffects: [
        ...state.activeEffects,
        {
          ...effect,
          id: createEntryId("effect"),
        },
      ],
    };
  }

  const nextEffects = [...state.activeEffects];
  const current = nextEffects[existingIndex]!;
  nextEffects[existingIndex] = {
    ...current,
    value: Math.max(current.value, effect.value),
    remainingTransmutations: Math.max(
      current.remainingTransmutations,
      effect.remainingTransmutations,
    ),
    description: effect.description,
  };

  return {
    ...state,
    activeEffects: nextEffects,
  };
}

export function consumeTransmutationEffects(state: GameState): GameState {
  if (state.activeEffects.length === 0) {
    return state;
  }

  const expired: ActiveEffect[] = [];
  const remained = state.activeEffects
    .map((effect) => ({
      ...effect,
      remainingTransmutations: effect.remainingTransmutations - 1,
    }))
    .filter((effect) => {
      if (effect.remainingTransmutations > 0) {
        return true;
      }
      expired.push(effect);
      return false;
    });

  if (expired.length === 0) {
    return {
      ...state,
      activeEffects: remained,
    };
  }

  const note = expired.map((item) => `「${item.label}」`).join("、");
  return appendJournal(
    {
      ...state,
      activeEffects: remained,
    },
    createJournalEntry({
      day: state.day,
      type: "system",
      title: "临时效应消散",
      body: `${note} 的影响已经消退。`,
    }),
  );
}
