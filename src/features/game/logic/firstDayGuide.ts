import { RESOURCE_LABELS } from "@/features/game/data/resourceMeta";
import { ARCANE_FORMULAS } from "@/features/game/logic/alchemyCircle";
import type { GameState } from "@/features/game/types";

export type FirstDayGuideStepId = "story" | "alchemy" | "journal";

const STEP_ACTION_LABELS: Record<FirstDayGuideStepId, string> = {
  story: "前往剧情探索",
  alchemy: "前往魔法阵炼金",
  journal: "前往炼金档案",
};

export interface FirstDayGuideStep {
  id: FirstDayGuideStepId;
  title: string;
  description: string;
  href: "/workshop/story" | "/workshop/alchemy" | "/workshop/journal";
  status: "pending" | "active" | "done";
}

export interface FirstDayGuide {
  headline: string;
  summary: string;
  currentStepId: FirstDayGuideStepId;
  currentHref: "/workshop/story" | "/workshop/alchemy" | "/workshop/journal";
  currentActionLabel: string;
  milestone:
    | {
        id: "story_complete" | "alchemy_complete";
        title: string;
        summary: string;
        nextHref: "/workshop/alchemy" | "/workshop/journal";
        nextActionLabel: string;
      }
    | null;
  steps: FirstDayGuideStep[];
}

const FIRST_FORMULA = ARCANE_FORMULAS.find((formula) => formula.id === "triad_prime");

function buildFirstFormulaHint(): string {
  if (!FIRST_FORMULA) {
    return "用现有材料试一次基础炼成，熟悉阵盘与投料手感。";
  }

  const ingredients = Object.entries(FIRST_FORMULA.ingredients)
    .map(([key, amount]) => `${RESOURCE_LABELS[key as keyof typeof RESOURCE_LABELS]}×${amount}`)
    .join("、");

  return `优先尝试「${FIRST_FORMULA.name}」：${ingredients}。`;
}

export function buildFirstDayGuide(game: GameState): FirstDayGuide | null {
  if (game.day !== 1 || game.rank !== "学徒") {
    return null;
  }

  const hasStoryProgress =
    game.knowledge > 4 || game.reputation > 0 || game.journal.some((entry) => entry.type === "story" || entry.type === "event");
  const hasAlchemyProgress = game.completedRecipes.length > 0 || game.journal.some((entry) => entry.type === "craft");
  const hasArchiveReview = game.journal.length >= 3 || game.actionsLeft <= 1;

  const currentStepId: FirstDayGuideStepId = !hasStoryProgress
    ? "story"
    : !hasAlchemyProgress
      ? "alchemy"
      : hasArchiveReview
        ? "journal"
        : "journal";

  const steps: FirstDayGuideStep[] = [
    {
      id: "story",
      title: "先做一次剧情探索",
      description: "优先拿到第一条线索与属性增长，熟悉今日节奏。",
      href: "/workshop/story",
      status: hasStoryProgress ? "done" : "active",
    },
    {
      id: "alchemy",
      title: "再试一次基础炼成",
      description: buildFirstFormulaHint(),
      href: "/workshop/alchemy",
      status: hasAlchemyProgress ? "done" : hasStoryProgress ? "active" : "pending",
    },
    {
      id: "journal",
      title: "最后回档案确认收获",
      description: "看一眼日志、过场与库存变化，决定明天先补哪一步。",
      href: "/workshop/journal",
      status: hasAlchemyProgress ? (hasArchiveReview ? "done" : "active") : "pending",
    },
  ];

  const currentStep = steps.find((step) => step.id === currentStepId) ?? steps[0];
  const milestone = hasStoryProgress && !hasAlchemyProgress
    ? {
        id: "story_complete" as const,
        title: "第一步完成：你已经拿到第一条线索",
        summary: "接下来把注意力转到魔法阵，试一次基础炼成，让首日循环真正跑起来。",
        nextHref: "/workshop/alchemy" as const,
        nextActionLabel: STEP_ACTION_LABELS.alchemy,
      }
    : hasAlchemyProgress && !hasArchiveReview
      ? {
          id: "alchemy_complete" as const,
          title: "第二步完成：第一次炼成已经达成",
          summary: "现在回档案页看日志、库存与回放，你就能完整收束首日收获。",
          nextHref: "/workshop/journal" as const,
          nextActionLabel: STEP_ACTION_LABELS.journal,
        }
      : null;

  return {
    headline: "学徒首日路线",
    summary: "首日不需要记住所有系统，只要先探索、再炼成、最后回看档案即可。",
    currentStepId,
    currentHref: currentStep.href,
    currentActionLabel: STEP_ACTION_LABELS[currentStep.id],
    milestone,
    steps,
  };
}
