import { RESOURCE_LABELS } from "@/features/game/data/resourceMeta";
import { RECIPES } from "@/features/game/data/recipes";
import {
  ARCANE_FORMULAS,
  getNextFormulaGuidance,
  type FormulaGuidance,
} from "@/features/game/logic/alchemyCircle";
import { getNextRankGoal } from "@/features/game/logic/progression";
import type { GameState, Rank, ResourceKey } from "@/features/game/types";

export type GrandWorkFormulaStatus =
  | FormulaGuidance["status"]
  | "ready_to_transmute"
  | "complete";

export interface GrandWorkPhaseSummary {
  eyebrow: string;
  title: string;
  summary: string;
}

export interface GrandWorkActionCue {
  href: "/workshop/story" | "/workshop/alchemy" | "/workshop/journal";
  label: string;
  title: string;
  description: string;
}

export interface GrandWorkStatGoal {
  label: "知识" | "熟练" | "名望";
  current: number;
  target: number;
  remaining: number;
  ready: boolean;
}

export interface GrandWorkRecipeGoal {
  recipeId: string;
  label: string;
  completed: boolean;
}

export interface GrandWorkRankGoal {
  currentRank: Rank;
  targetRank: Rank | null;
  ready: boolean;
  requirements: GrandWorkStatGoal[];
  recipeRequirement: GrandWorkRecipeGoal | null;
}

export interface GrandWorkFormulaIngredientGoal {
  key: ResourceKey;
  label: string;
  current: number;
  required: number;
  remaining: number;
}

export interface GrandWorkFormulaGoal {
  formulaId: string;
  formulaName: string;
  outputLabel: string;
  status: GrandWorkFormulaStatus;
  recommendations: string[];
  ingredients: GrandWorkFormulaIngredientGoal[];
}

export interface GrandWorkPlan {
  phase: GrandWorkPhaseSummary;
  daySignal: string;
  actionCue: GrandWorkActionCue;
  rankGoal: GrandWorkRankGoal;
  formulaGoal: GrandWorkFormulaGoal | null;
}

function resolveGoalLabel(id: string): string {
  const recipe = RECIPES.find((item) => item.id === id);
  if (recipe) {
    return recipe.name;
  }

  const formula = ARCANE_FORMULAS.find((item) => item.id === id);
  if (formula) {
    return formula.name;
  }

  return id;
}

function buildDaySignal(state: GameState): string {
  const vigorPrefix =
    state.vigor <= 3 ? "炉火偏弱" : state.vigor >= 9 ? "炉火正盛" : "炉火平稳";

  if (state.actionsLeft >= 3) {
    return `${vigorPrefix}，今日还有 ${state.actionsLeft} 次行动，适合先探再炼。`;
  }
  if (state.actionsLeft === 2) {
    return `${vigorPrefix}，还剩 2 次行动，可以继续沿着当前线索推进。`;
  }
  if (state.actionsLeft === 1) {
    return `${vigorPrefix}，只剩最后 1 次行动，适合做一次定向操作。`;
  }
  return `${vigorPrefix}，今日行动已尽，先回档案整理收获。`;
}

function buildRankGoal(state: GameState): GrandWorkRankGoal {
  const nextRankGoal = getNextRankGoal(state);
  if (!nextRankGoal) {
    return {
      currentRank: state.rank,
      targetRank: null,
      ready: true,
      requirements: [
        {
          label: "知识",
          current: state.knowledge,
          target: state.knowledge,
          remaining: 0,
          ready: true,
        },
        {
          label: "熟练",
          current: state.mastery,
          target: state.mastery,
          remaining: 0,
          ready: true,
        },
        {
          label: "名望",
          current: state.reputation,
          target: state.reputation,
          remaining: 0,
          ready: true,
        },
      ],
      recipeRequirement: null,
    };
  }

  const requirements: GrandWorkStatGoal[] = [
    {
      label: "知识",
      current: state.knowledge,
      target: nextRankGoal.knowledge,
      remaining: Math.max(0, nextRankGoal.knowledge - state.knowledge),
      ready: state.knowledge >= nextRankGoal.knowledge,
    },
    {
      label: "熟练",
      current: state.mastery,
      target: nextRankGoal.mastery,
      remaining: Math.max(0, nextRankGoal.mastery - state.mastery),
      ready: state.mastery >= nextRankGoal.mastery,
    },
    {
      label: "名望",
      current: state.reputation,
      target: nextRankGoal.reputation,
      remaining: Math.max(0, nextRankGoal.reputation - state.reputation),
      ready: state.reputation >= nextRankGoal.reputation,
    },
  ];

  return {
    currentRank: state.rank,
    targetRank: nextRankGoal.targetRank,
    ready: nextRankGoal.ready,
    requirements,
    recipeRequirement: nextRankGoal.requireRecipe
      ? {
          recipeId: nextRankGoal.requireRecipe,
          label: resolveGoalLabel(nextRankGoal.requireRecipe),
          completed: state.completedRecipes.includes(nextRankGoal.requireRecipe),
        }
      : null,
  };
}

function buildIngredients(
  state: GameState,
  formulaId: string,
): GrandWorkFormulaIngredientGoal[] {
  const formula = ARCANE_FORMULAS.find((item) => item.id === formulaId);
  if (!formula) {
    return [];
  }

  return (Object.keys(formula.ingredients) as ResourceKey[])
    .map((key) => {
      const required = formula.ingredients[key] ?? 0;
      const current = state.resources[key];
      return {
        key,
        label: RESOURCE_LABELS[key],
        current,
        required,
        remaining: Math.max(0, required - current),
      };
    })
    .sort(
      (left, right) =>
        right.remaining - left.remaining ||
        left.label.localeCompare(right.label, "zh-Hans-CN"),
    );
}

function buildFormulaGoal(
  state: GameState,
  rankGoal: GrandWorkRankGoal,
): GrandWorkFormulaGoal | null {
  if (state.ended) {
    return {
      formulaId: "philosopher_stone",
      formulaName: "贤者之石",
      outputLabel: RESOURCE_LABELS.philosopherStone,
      status: "complete",
      recommendations: ["大工已经完成，现在只需要回顾日志与过场记录。"],
      ingredients: [],
    };
  }

  const guidance = getNextFormulaGuidance(state);
  if (guidance) {
    return {
      formulaId: guidance.formulaId,
      formulaName: guidance.formulaName,
      outputLabel: guidance.outputLabel,
      status: guidance.status,
      recommendations: guidance.recommendations,
      ingredients: buildIngredients(state, guidance.formulaId),
    };
  }

  if (rankGoal.recipeRequirement && !rankGoal.recipeRequirement.completed) {
    const formula = ARCANE_FORMULAS.find(
      (item) => item.id === rankGoal.recipeRequirement?.recipeId,
    );
    return {
      formulaId: rankGoal.recipeRequirement.recipeId,
      formulaName: formula?.name ?? rankGoal.recipeRequirement.label,
      outputLabel: formula ? RESOURCE_LABELS[formula.output.resource] : rankGoal.recipeRequirement.label,
      status: "ready_to_transmute",
      recommendations: [
        `下一次精确投料可以直接冲击「${rankGoal.recipeRequirement.label}」。`,
        "回到魔法阵炼金页，按照定式逐项校准材料与数量。",
      ],
      ingredients: buildIngredients(state, rankGoal.recipeRequirement.recipeId),
    };
  }

  return null;
}

function buildPhase(
  state: GameState,
  rankGoal: GrandWorkRankGoal,
  formulaGoal: GrandWorkFormulaGoal | null,
): GrandWorkPhaseSummary {
  if (state.ended) {
    return {
      eyebrow: "Grand Work Complete",
      title: "贤者之石已成",
      summary: "终局已经完成，工坊现在更适合回看档案、整理日志，并复盘整条大工路径。",
    };
  }

  switch (formulaGoal?.status) {
    case "ready_to_transmute":
      return {
        eyebrow: "Final Mixture",
        title: `回阵执行「${formulaGoal.formulaName}」`,
        summary: "线索已经齐全，下一步不是继续摸索，而是按定式精确投料并完成最终显化。",
      };
    case "ready_to_research":
      return {
        eyebrow: "Research Window",
        title: `准备破译「${formulaGoal.formulaName}」`,
        summary: "当前属性和前置都已到位，继续推进剧情探索，就有机会把下一条定式显性化。",
      };
    case "missing_stats":
      return {
        eyebrow: "Rank Conditioning",
        title: `补足属性后再破译「${formulaGoal.formulaName}」`,
        summary: "境界已经允许接触下一条线索，但知识与熟练还不够稳，需要先把基础值抬上去。",
      };
    case "missing_prerequisite":
      return {
        eyebrow: "Previous Formula",
        title: `先补齐前置定式，再追「${formulaGoal.formulaName}」`,
        summary: "更高阶的仪式还被前一条定式锁住，当前最有效的推进方式是补完旧线索。",
      };
    case "locked_rank":
      return {
        eyebrow: "Ascension Gate",
        title: `先迈向「${rankGoal.targetRank ?? state.rank}」`,
        summary: "下一条定式所在的工序尚未解锁，先通过剧情推进和常规炼成冲击更高境界。",
      };
    case "complete":
      return {
        eyebrow: "Archive Review",
        title: "大工终局已封存",
        summary: "你已经走完这轮炼金旅程，可以转去档案页重放过场和整理结果。",
      };
    default:
      if (rankGoal.targetRank) {
        return {
          eyebrow: "Rank Progress",
          title: `迈向「${rankGoal.targetRank}」`,
          summary: "当前没有新的定式门槛，但境界成长仍然会决定后续工坊的开放范围。",
        };
      }
      return {
        eyebrow: "Workshop Flow",
        title: "工坊节律稳定",
        summary: "当前没有新的阻塞项，可以按自己的节奏探索、炼成与归档。",
      };
  }
}

function buildActionCue(
  state: GameState,
  formulaGoal: GrandWorkFormulaGoal | null,
): GrandWorkActionCue {
  if (state.ended) {
    return {
      href: "/workshop/journal",
      label: "回看炼金档案",
      title: "整理整轮大工记录",
      description: "贤者之石已经完成，接下来更适合回看过场、日志与库存轨迹。",
    };
  }

  if (formulaGoal?.status === "ready_to_transmute") {
    return {
      href: "/workshop/alchemy",
      label: "返回魔法阵炼金",
      title: "执行精确投料",
      description: "当前目标已经非常明确，直接去阵盘完成定向炼成的收益最高。",
    };
  }

  return {
    href: "/workshop/story",
    label: "推进剧情探索",
    title: "继续追线索与属性",
    description: "这一阶段仍以章节选择、线索破译和属性积累为主要推进方式。",
  };
}

export function buildGrandWorkPlan(state: GameState): GrandWorkPlan {
  const rankGoal = buildRankGoal(state);
  const formulaGoal = buildFormulaGoal(state, rankGoal);

  return {
    phase: buildPhase(state, rankGoal, formulaGoal),
    daySignal: buildDaySignal(state),
    actionCue: buildActionCue(state, formulaGoal),
    rankGoal,
    formulaGoal,
  };
}
