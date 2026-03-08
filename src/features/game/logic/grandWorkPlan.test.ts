import { describe, expect, it } from "vitest";
import { buildGrandWorkPlan } from "@/features/game/logic/grandWorkPlan";
import { createInitialGameState } from "@/features/game/state";
import type { GameState } from "@/features/game/types";

function buildState(patch: Partial<GameState>): GameState {
  return {
    ...createInitialGameState(),
    ...patch,
  };
}

describe("buildGrandWorkPlan", () => {
  it("tracks next rank gaps for the initial apprentice state", () => {
    const plan = buildGrandWorkPlan(createInitialGameState());

    expect(plan.rankGoal.targetRank).toBe("炼金士");
    expect(plan.rankGoal.requirements).toEqual([
      expect.objectContaining({ label: "知识", current: 4, target: 10, remaining: 6 }),
      expect.objectContaining({ label: "熟练", current: 3, target: 12, remaining: 9 }),
      expect.objectContaining({ label: "名望", current: 0, target: 2, remaining: 2 }),
    ]);
    expect(plan.formulaGoal?.status).toBe("locked_rank");
    expect(plan.actionCue.href).toBe("/workshop/story");
  });

  it("switches to story research when the next formula is ready to be discovered", () => {
    const state = buildState({
      rank: "炼金士",
      knowledge: 22,
      mastery: 19,
      reputation: 6,
      discoveredFormulas: ["triad_prime"],
    });

    const plan = buildGrandWorkPlan(state);

    expect(plan.formulaGoal?.formulaId).toBe("mercurial_ladder");
    expect(plan.formulaGoal?.status).toBe("ready_to_research");
    expect(plan.formulaGoal?.ingredients).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "sulfur", remaining: 1 }),
        expect.objectContaining({ key: "mercury", remaining: 1 }),
        expect.objectContaining({ key: "moonDew", remaining: 0 }),
      ]),
    );
    expect(plan.actionCue.href).toBe("/workshop/story");
  });

  it("switches to alchemy when all clues are ready and only the final transmutation remains", () => {
    const state = buildState({
      rank: "贤者候补",
      knowledge: 62,
      mastery: 61,
      reputation: 31,
      discoveredFormulas: [
        "triad_prime",
        "mercurial_ladder",
        "great_conjunction",
        "philosopher_stone",
      ],
      completedRecipes: ["great_conjunction"],
      resources: {
        ...createInitialGameState().resources,
        philosopherSeed: 2,
        aetherDust: 5,
        sunShard: 2,
        moonDew: 2,
      },
    });

    const plan = buildGrandWorkPlan(state);

    expect(plan.rankGoal.targetRank).toBe("至高炼金术师");
    expect(plan.rankGoal.recipeRequirement).toEqual(
      expect.objectContaining({ recipeId: "philosopher_stone", completed: false }),
    );
    expect(plan.formulaGoal?.formulaId).toBe("philosopher_stone");
    expect(plan.formulaGoal?.status).toBe("ready_to_transmute");
    expect(plan.actionCue.href).toBe("/workshop/alchemy");
  });

  it("falls back to archive review after the grand work is complete", () => {
    const state = buildState({
      rank: "至高炼金术师",
      ended: true,
      ending: "philosopher_stone",
      discoveredFormulas: [
        "triad_prime",
        "mercurial_ladder",
        "great_conjunction",
        "philosopher_stone",
      ],
      completedRecipes: ["great_conjunction", "philosopher_stone"],
    });

    const plan = buildGrandWorkPlan(state);

    expect(plan.formulaGoal?.status).toBe("complete");
    expect(plan.actionCue.href).toBe("/workshop/journal");
    expect(plan.phase.title).toContain("贤者之石");
  });
});
