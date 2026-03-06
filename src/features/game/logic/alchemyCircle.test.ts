import { describe, expect, it } from "vitest";
import { transmuteByCircle } from "@/features/game/logic/alchemyCircle";
import { RESOURCE_VALUES } from "@/features/game/data/resourceMeta";
import { createInitialGameState } from "@/features/game/state";
import { createEmptyResources } from "@/features/game/logic/utils";
import type { GameState, ResourceKey, ResourcePool } from "@/features/game/types";

function withResourceState(patch: Partial<GameState>): GameState {
  return {
    ...createInitialGameState(),
    ...patch,
  };
}

function getPoolValue(pool: Partial<ResourcePool>): number {
  return (Object.keys(RESOURCE_VALUES) as ResourceKey[]).reduce((total, key) => {
    return total + (pool[key] ?? 0) * RESOURCE_VALUES[key];
  }, 0);
}

function getInventoryValue(state: GameState): number {
  return getPoolValue(state.resources);
}

describe("alchemyCircle", () => {
  it("returns random equivalent output with the same total value", () => {
    const base = createInitialGameState();
    const result = transmuteByCircle(base, {
      offered: { ash: 2 },
    });

    expect(result.success).toBe(true);
    expect(result.consumedValue).toBe(2);
    expect(result.producedValue).toBe(2);
    expect(getPoolValue(result.producedResources ?? {})).toBe(2);
    expect(getInventoryValue(result.state)).toBe(getInventoryValue(base));
  });

  it("rejects exchange when no material is offered", () => {
    const base = createInitialGameState();
    const result = transmuteByCircle(base, {
      offered: {},
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("请先向魔法阵投入至少一种材料");
    expect(result.state.resources.ash).toBe(base.resources.ash);
    expect(result.state.resources.salt).toBe(base.resources.salt);
  });

  it("guarantees specific output when arcane formula is matched", () => {
    const resources = {
      ...createEmptyResources(),
      sunShard: 2,
      moonDew: 2,
      mercury: 2,
      aetherDust: 1,
    };

    const state = withResourceState({
      rank: "大炼金士",
      resources,
      knowledge: 50,
      mastery: 55,
      reputation: 20,
      actionsLeft: 3,
      completedRecipes: [],
    });

    const result = transmuteByCircle(state, {
      offered: {
        sunShard: 2,
        moonDew: 2,
        mercury: 2,
        aetherDust: 1,
      },
    });

    expect(result.success).toBe(true);
    expect(result.formulaMatched?.id).toBe("great_conjunction");
    expect(result.state.resources.philosopherSeed).toBe(1);
    expect(result.state.completedRecipes).toContain("great_conjunction");
  });

  it("never outputs philosopher-tier items in random exchange", () => {
    const state = withResourceState({
      resources: {
        ...createEmptyResources(),
        aetherDust: 3,
      },
    });

    const result = transmuteByCircle(state, {
      offered: { aetherDust: 1 },
    });

    expect(result.success).toBe(true);
    expect(result.producedResources?.philosopherSeed ?? 0).toBe(0);
    expect(result.producedResources?.philosopherStone ?? 0).toBe(0);
  });

  it("consumes tolerance bonus effect after exchange", () => {
    const state = withResourceState({
      activeEffects: [
        {
          id: "fx1",
          kind: "tolerance_bonus",
          label: "衡律祝福",
          description: "高阶权重 +1",
          value: 1,
          remainingTransmutations: 2,
        },
      ],
    });

    const result = transmuteByCircle(state, {
      offered: { ash: 3 },
    });

    expect(result.success).toBe(true);
    expect(result.state.activeEffects[0]?.remainingTransmutations).toBe(1);
  });

  it("consumes tolerance penalty effect after exchange", () => {
    const state = withResourceState({
      activeEffects: [
        {
          id: "fx2",
          kind: "tolerance_penalty",
          label: "紊乱残渣",
          description: "低阶杂质权重 +1",
          value: 1,
          remainingTransmutations: 2,
        },
      ],
    });

    const result = transmuteByCircle(state, {
      offered: { ash: 2 },
    });

    expect(result.success).toBe(true);
    expect(result.state.activeEffects[0]?.remainingTransmutations).toBe(1);
  });

  it("keeps equivalent value while consuming yield bonus effect", () => {
    const state = withResourceState({
      activeEffects: [
        {
          id: "fx3",
          kind: "yield_bonus",
          label: "丰饶回响",
          description: "细粒产物权重提升",
          value: 1,
          remainingTransmutations: 1,
        },
      ],
    });

    const result = transmuteByCircle(state, {
      offered: { ash: 2 },
    });

    expect(result.success).toBe(true);
    expect(result.producedValue).toBe(2);
    expect(getPoolValue(result.producedResources ?? {})).toBe(2);
    expect(result.state.activeEffects).toHaveLength(0);
  });
});
