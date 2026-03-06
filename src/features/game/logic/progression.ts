import { CHAPTERS } from "@/features/game/data/chapters";
import { RANK_ORDER } from "@/features/game/types";
import {
  appendJournal,
  createJournalEntry,
  withRankUnlockedRecipes,
} from "@/features/game/state";
import { chance, clamp, mergeResourceDelta, pickOne } from "@/features/game/logic/utils";
import type {
  ChapterChoice,
  ChapterChoiceAction,
  ChapterData,
  GameState,
  Rank,
  ResourcePool,
} from "@/features/game/types";

const MAX_VIGOR = 12;

type RankRequirement = {
  knowledge: number;
  mastery: number;
  reputation: number;
  requireRecipe?: string;
};

const RANK_REQUIREMENTS: Record<Exclude<Rank, "学徒">, RankRequirement> = {
  炼金士: {
    knowledge: 10,
    mastery: 12,
    reputation: 2,
  },
  大炼金士: {
    knowledge: 24,
    mastery: 28,
    reputation: 8,
  },
  贤者候补: {
    knowledge: 40,
    mastery: 45,
    reputation: 18,
    requireRecipe: "great_conjunction",
  },
  至高炼金术师: {
    knowledge: 60,
    mastery: 60,
    reputation: 30,
    requireRecipe: "philosopher_stone",
  },
};

export type StoryDiscoveryRule = {
  formulaId: string;
  formulaName: string;
  minRank: Rank;
  minKnowledge: number;
  minMastery: number;
  actions: ChapterChoiceAction[];
  chance: number;
  lore: string;
  requireKnown?: string;
};

export const STORY_DISCOVERY_RULES: StoryDiscoveryRule[] = [
  {
    formulaId: "mercurial_ladder",
    formulaName: "汞梯升华",
    minRank: "炼金士",
    minKnowledge: 18,
    minMastery: 16,
    actions: ["study", "distill", "emerald_tablet"],
    chance: 0.42,
    lore: "你在蒸汽与汞珠的相位延迟中，看见了一条垂直升华的阶梯纹路。",
  },
  {
    formulaId: "great_conjunction",
    formulaName: "日月合契",
    minRank: "大炼金士",
    minKnowledge: 34,
    minMastery: 32,
    actions: ["emerald_tablet", "meditate"],
    chance: 0.38,
    lore: "你将《翠玉录》句式映射到阵线后，日月双轨的闭合条件终于显现。",
    requireKnown: "mercurial_ladder",
  },
  {
    formulaId: "philosopher_stone",
    formulaName: "赤红完成",
    minRank: "贤者候补",
    minKnowledge: 54,
    minMastery: 56,
    actions: ["emerald_tablet", "meditate"],
    chance: 0.34,
    lore: "当你让呼吸与炉火同频，赤红终式在脑海中短暂完整地展开。",
    requireKnown: "great_conjunction",
  },
];

export function getStoryDiscoveryRule(formulaId: string): StoryDiscoveryRule | undefined {
  return STORY_DISCOVERY_RULES.find((rule) => rule.formulaId === formulaId);
}

export function rankToIndex(rank: Rank): number {
  return RANK_ORDER.indexOf(rank);
}

export function getCurrentChapter(state: GameState): ChapterData {
  const chapter = CHAPTERS.find((item) => item.rank === state.rank);
  if (chapter) {
    return chapter;
  }
  return CHAPTERS[CHAPTERS.length - 1]!;
}

function applyStoryActionEffect(
  state: GameState,
  choice: ChapterChoice,
  rng: () => number,
): {
  nextState: GameState;
  message: string;
} {
  const chapterDepth = clamp(rankToIndex(state.rank), 0, 3);
  let knowledgeGain = 0;
  let masteryGain = 0;
  let reputationGain = 0;
  let vigorDelta = 0;
  let resourceDelta: Partial<ResourcePool> = {};

  switch (choice.action) {
    case "study":
      knowledgeGain = 2 + Math.floor(rng() * 3);
      masteryGain = 1 + Math.floor(rng() * 2);
      vigorDelta = -1;
      if (chance(rng, 0.3 + chapterDepth * 0.05)) {
        resourceDelta.aetherDust = (resourceDelta.aetherDust ?? 0) + 1;
      }
      if (chance(rng, 0.24 + chapterDepth * 0.05)) {
        resourceDelta.voidInk = (resourceDelta.voidInk ?? 0) + 1;
      }
      if (chance(rng, 0.18 + chapterDepth * 0.04)) {
        resourceDelta.runeBone = (resourceDelta.runeBone ?? 0) + 1;
      }
      break;
    case "gather":
      resourceDelta = {
        ash: 1 + Math.floor(rng() * 2),
        ironSand: 1 + Math.floor(rng() * 2),
      };
      if (chance(rng, 0.35 + chapterDepth * 0.06)) {
        resourceDelta.moonDew = (resourceDelta.moonDew ?? 0) + 1;
      }
      if (chance(rng, 0.2 + chapterDepth * 0.05)) {
        resourceDelta.sunShard = (resourceDelta.sunShard ?? 0) + 1;
      }
      if (chance(rng, 0.44 + chapterDepth * 0.05)) {
        resourceDelta.herbEssence = (resourceDelta.herbEssence ?? 0) + 1;
      }
      if (chance(rng, 0.28 + chapterDepth * 0.04)) {
        resourceDelta.obsidian = (resourceDelta.obsidian ?? 0) + 1;
      }
      if (chance(rng, 0.26 + chapterDepth * 0.05)) {
        resourceDelta.silverLeaf = (resourceDelta.silverLeaf ?? 0) + 1;
      }
      if (chance(rng, 0.22 + chapterDepth * 0.04)) {
        resourceDelta.mistPearl = (resourceDelta.mistPearl ?? 0) + 1;
      }
      masteryGain = 1;
      vigorDelta = -1;
      break;
    case "distill":
      masteryGain = 2 + Math.floor(rng() * 3);
      knowledgeGain = 1 + Math.floor(rng() * 2);
      vigorDelta = -2;
      if (chance(rng, 0.55 + chapterDepth * 0.05)) {
        resourceDelta = {
          mercury: 1 + Math.floor(rng() * 2),
        };
        if (chance(rng, 0.46 + chapterDepth * 0.04)) {
          resourceDelta.sulfur = (resourceDelta.sulfur ?? 0) + 1;
        }
        if (chance(rng, 0.22 + chapterDepth * 0.05)) {
          resourceDelta.quicksilverBloom = (resourceDelta.quicksilverBloom ?? 0) + 1;
        }
        if (chance(rng, 0.2 + chapterDepth * 0.05)) {
          resourceDelta.etherGlass = (resourceDelta.etherGlass ?? 0) + 1;
        }
      } else {
        resourceDelta = { ash: 1 };
      }
      break;
    case "lecture":
      reputationGain = 2 + Math.floor(rng() * 2);
      knowledgeGain = 1;
      vigorDelta = -1;
      if (chance(rng, 0.25 + chapterDepth * 0.08)) {
        resourceDelta = { sunShard: 1 };
      }
      if (chance(rng, 0.18 + chapterDepth * 0.05)) {
        resourceDelta.goldDust = (resourceDelta.goldDust ?? 0) + 1;
      }
      if (chance(rng, 0.12 + chapterDepth * 0.04)) {
        resourceDelta.dragonScale = (resourceDelta.dragonScale ?? 0) + 1;
      }
      break;
    case "meditate":
      masteryGain = 1 + Math.floor(rng() * 2);
      knowledgeGain = 1;
      vigorDelta = 2;
      if (chance(rng, 0.34 + chapterDepth * 0.05)) {
        resourceDelta.nightBloom = (resourceDelta.nightBloom ?? 0) + 1;
      }
      if (chance(rng, 0.18 + chapterDepth * 0.05)) {
        resourceDelta.starlightThread = (resourceDelta.starlightThread ?? 0) + 1;
      }
      break;
    case "emerald_tablet": {
      const threshold = 10 + chapterDepth * 8;
      if (state.knowledge >= threshold) {
        knowledgeGain = 3 + Math.floor(rng() * 2);
        masteryGain = 2;
        reputationGain = 1;
      } else {
        knowledgeGain = 1;
        vigorDelta = -1;
      }
      if (chance(rng, 0.4)) {
        resourceDelta = { aetherDust: 1 };
      }
      if (chance(rng, 0.22 + chapterDepth * 0.04)) {
        resourceDelta.runeBone = (resourceDelta.runeBone ?? 0) + 1;
      }
      break;
    }
    default:
      break;
  }

  const tentative = {
    ...state,
    knowledge: Math.max(0, state.knowledge + knowledgeGain),
    mastery: Math.max(0, state.mastery + masteryGain),
    reputation: Math.max(0, state.reputation + reputationGain),
    vigor: clamp(state.vigor + vigorDelta, 0, MAX_VIGOR),
    resources: mergeResourceDelta(state.resources, resourceDelta),
    actionsLeft: Math.max(0, state.actionsLeft - 1),
    lastActionSummary: `${choice.label}：${choice.flavorText}`,
  };

  const statFragments = [
    knowledgeGain !== 0 ? `知识 ${knowledgeGain >= 0 ? "+" : ""}${knowledgeGain}` : "",
    masteryGain !== 0 ? `熟练 ${masteryGain >= 0 ? "+" : ""}${masteryGain}` : "",
    reputationGain !== 0 ? `名望 ${reputationGain >= 0 ? "+" : ""}${reputationGain}` : "",
    vigorDelta !== 0 ? `精力 ${vigorDelta >= 0 ? "+" : ""}${vigorDelta}` : "",
  ].filter(Boolean);
  const deltaText = statFragments.length > 0 ? statFragments.join(" / ") : "状态稳定";
  const message = `${choice.flavorText}（${deltaText}）`;

  return { nextState: tentative, message };
}

function settleDayTurn(state: GameState): GameState {
  if (state.actionsLeft > 0) {
    return state;
  }

  const withJournal = appendJournal(
    state,
    createJournalEntry({
      day: state.day,
      type: "system",
      title: "昼夜交替",
      body: "工坊钟声敲过午夜，你整理炉台并记录了当日结果。",
    }),
  );

  return {
    ...withJournal,
    day: state.day + 1,
    actionsLeft: 3,
    vigor: clamp(withJournal.vigor + 2, 0, MAX_VIGOR),
  };
}

function canRankUp(state: GameState, targetRank: Rank): boolean {
  if (targetRank === "学徒") {
    return false;
  }

  const req = RANK_REQUIREMENTS[targetRank];
  if (!req) {
    return false;
  }

  if (
    state.knowledge < req.knowledge ||
    state.mastery < req.mastery ||
    state.reputation < req.reputation
  ) {
    return false;
  }

  if (req.requireRecipe && !state.completedRecipes.includes(req.requireRecipe)) {
    return false;
  }

  return true;
}

function maybeDiscoverFormulaByStory(
  state: GameState,
  choice: ChapterChoice,
  rng: () => number,
): {
  state: GameState;
  message?: string;
} {
  for (const rule of STORY_DISCOVERY_RULES) {
    if (state.discoveredFormulas.includes(rule.formulaId)) {
      continue;
    }
    if (rule.requireKnown && !state.discoveredFormulas.includes(rule.requireKnown)) {
      continue;
    }
    if (rankToIndex(state.rank) < rankToIndex(rule.minRank)) {
      continue;
    }
    if (!rule.actions.includes(choice.action)) {
      continue;
    }
    if (state.knowledge < rule.minKnowledge || state.mastery < rule.minMastery) {
      continue;
    }
    if (!chance(rng, rule.chance)) {
      continue;
    }

    const next = appendJournal(
      {
        ...state,
        discoveredFormulas: [...state.discoveredFormulas, rule.formulaId],
      },
      createJournalEntry({
        day: state.day,
        type: "system",
        title: `定式线索：${rule.formulaName}`,
        body: rule.lore,
      }),
    );

    return {
      state: next,
      message: `你通过剧情推演破译了「${rule.formulaName}」的线索。`,
    };
  }

  return { state };
}

export function evaluateRankProgression(
  state: GameState,
): { state: GameState; messages: string[] } {
  let nextState = state;
  const messages: string[] = [];

  while (true) {
    const currentIndex = rankToIndex(nextState.rank);
    const target = RANK_ORDER[currentIndex + 1];
    if (!target) {
      break;
    }

    if (target === "至高炼金术师") {
      break;
    }

    if (!canRankUp(nextState, target)) {
      break;
    }

    nextState = withRankUnlockedRecipes(
      {
        ...nextState,
        rank: target,
      },
      target,
    );

    nextState = appendJournal(
      nextState,
      createJournalEntry({
        day: nextState.day,
        type: "system",
        title: `境界突破：${target}`,
        body: `你跨入「${target}」阶段，新的配方与风险同时向你展开。`,
      }),
    );

    messages.push(`你已晋升为${target}。`);
  }

  return { state: nextState, messages };
}

export function applyChapterChoice(
  state: GameState,
  choiceId: string,
  rng = Math.random,
): { state: GameState; message: string } {
  if (state.ended) {
    return { state, message: "贤者之石已成，工坊归于寂静。" };
  }

  const chapter = getCurrentChapter(state);
  const choice = chapter.choices.find((item) => item.id === choiceId);
  if (!choice) {
    const fallbackChoice = pickOne(chapter.choices, rng);
    return applyChapterChoice(state, fallbackChoice.id, rng);
  }

  const effectResult = applyStoryActionEffect(state, choice, rng);
  let next = appendJournal(
    effectResult.nextState,
    createJournalEntry({
      day: effectResult.nextState.day,
      type: "story",
      title: chapter.title,
      body: effectResult.message,
    }),
  );

  const discovery = maybeDiscoverFormulaByStory(next, choice, rng);
  next = discovery.state;

  const progression = evaluateRankProgression(next);
  next = progression.state;
  const extraMessages = [discovery.message, ...progression.messages].filter(
    (item): item is string => Boolean(item),
  );
  const finalMessage =
    extraMessages.length > 0
      ? `${effectResult.message} ${extraMessages.join(" ")}`
      : effectResult.message;

  next = {
    ...next,
    lastActionSummary: finalMessage,
  };

  next = settleDayTurn(next);
  return { state: next, message: finalMessage };
}
