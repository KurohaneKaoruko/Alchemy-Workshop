import { getRecipeById } from "@/features/game/data/recipes";
import { evaluateRankProgression } from "@/features/game/logic/progression";
import {
  appendJournal,
  createJournalEntry,
  withRankUnlockedRecipes,
} from "@/features/game/state";
import { clamp, consumeResources, hasEnoughResources, mergeResourceDelta } from "./utils";
import { RANK_ORDER, type CraftResult, type GameState, type Rank } from "@/features/game/types";

const MAX_VIGOR = 12;

export function canCraft(
  state: GameState,
  recipeId: string,
): {
  ok: boolean;
  reason?: string;
} {
  const recipe = getRecipeById(recipeId);
  if (!recipe) {
    return { ok: false, reason: "未知配方。" };
  }

  if (!state.unlockedRecipes.includes(recipe.id)) {
    return { ok: false, reason: "尚未解锁该配方。" };
  }

  if (state.knowledge < recipe.requiredKnowledge) {
    return { ok: false, reason: `知识不足（需 ${recipe.requiredKnowledge}）。` };
  }

  if (state.mastery < recipe.requiredMastery) {
    return { ok: false, reason: `熟练度不足（需 ${recipe.requiredMastery}）。` };
  }

  if (!hasEnoughResources(state.resources, recipe.ingredients)) {
    return { ok: false, reason: "材料不足。" };
  }

  if (state.actionsLeft <= 0) {
    return { ok: false, reason: "今日行动次数已耗尽。" };
  }

  return { ok: true };
}

function settleActionTurn(state: GameState): GameState {
  if (state.actionsLeft > 0) {
    return state;
  }

  const withEntry = appendJournal(
    state,
    createJournalEntry({
      day: state.day,
      type: "system",
      title: "炉火休止",
      body: "你在黎明前收起器具，为新一天保留炉温。",
    }),
  );

  return {
    ...withEntry,
    day: withEntry.day + 1,
    actionsLeft: 3,
    vigor: clamp(withEntry.vigor + 2, 0, MAX_VIGOR),
  };
}

function rankToIndex(rank: Rank): number {
  return RANK_ORDER.indexOf(rank);
}

export function craftRecipe(
  state: GameState,
  recipeId: string,
  rng = Math.random,
): CraftResult {
  const check = canCraft(state, recipeId);
  if (!check.ok) {
    return {
      state,
      success: false,
      critical: false,
      recipeId,
      message: check.reason ?? "无法炼成。",
    };
  }

  const recipe = getRecipeById(recipeId)!;
  const baseAfterCost = {
    ...state,
    actionsLeft: Math.max(0, state.actionsLeft - 1),
    resources: consumeResources(state.resources, recipe.ingredients),
  };

  const rankDepth = rankToIndex(state.rank);
  const successRate = clamp(
    0.42 + state.mastery * 0.005 + state.knowledge * 0.0025 - recipe.difficulty * 0.06 - rankDepth * 0.01,
    0.1,
    0.92,
  );
  const roll = rng();
  const success = roll < successRate;
  const critical = success && rng() < 0.15;

  let nextState = baseAfterCost;
  let message = "";

  if (success) {
    const outputDelta = { ...recipe.outputs };
    if (critical) {
      for (const key of Object.keys(outputDelta) as Array<keyof typeof outputDelta>) {
        outputDelta[key] = (outputDelta[key] ?? 0) + 1;
      }
    }

    nextState = {
      ...nextState,
      resources: mergeResourceDelta(nextState.resources, outputDelta),
      mastery: nextState.mastery + 2 + recipe.difficulty,
      knowledge: nextState.knowledge + 1 + Math.ceil(recipe.difficulty / 2),
      reputation: nextState.reputation + Math.floor(recipe.difficulty / 3),
      vigor: clamp(nextState.vigor - 1, 0, MAX_VIGOR),
      completedRecipes: nextState.completedRecipes.includes(recipe.id)
        ? nextState.completedRecipes
        : [...nextState.completedRecipes, recipe.id],
      lastActionSummary: `${recipe.name}炼成成功`,
    };

    message = critical
      ? `${recipe.successLog} 你在关键时刻完成了临界调相，产出额外提升。`
      : recipe.successLog;

    if (recipe.id === "philosopher_stone") {
      nextState = withRankUnlockedRecipes(
        {
          ...nextState,
          rank: "至高炼金术师",
          ended: true,
          ending: "philosopher_stone",
        },
        "至高炼金术师",
      );
      message = "赤红晶核彻底稳定，你炼出了贤者之石，成为至高炼金术师。";
    }
  } else {
    nextState = {
      ...nextState,
      mastery: Math.max(0, nextState.mastery + 1),
      knowledge: Math.max(0, nextState.knowledge + 1),
      vigor: clamp(nextState.vigor - 2, 0, MAX_VIGOR),
      lastActionSummary: `${recipe.name}炼成失败`,
    };

    if (rng() > 0.7) {
      nextState = {
        ...nextState,
        resources: mergeResourceDelta(nextState.resources, {
          ash: 1,
        }),
      };
    }

    message = "配方未能稳定，坩埚中只留下焦黑残渣。你记录下了失败参数。";
  }

  nextState = appendJournal(
    nextState,
    createJournalEntry({
      day: nextState.day,
      type: "craft",
      title: recipe.name,
      body: message,
    }),
  );

  if (!nextState.ended) {
    nextState = evaluateRankProgression(nextState).state;
  }
  nextState = settleActionTurn(nextState);

  return {
    state: nextState,
    success,
    critical,
    recipeId: recipe.id,
    message,
  };
}
