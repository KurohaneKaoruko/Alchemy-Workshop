import { describe, expect, it } from "vitest";
import { createInitialGameState } from "@/features/game/state";
import { getNextFormulaGuidance } from "@/features/game/logic/alchemyCircle";
import type { GameState } from "@/features/game/types";

function buildState(patch: Partial<GameState>): GameState {
  return {
    ...createInitialGameState(),
    ...patch,
  };
}

describe("formula guidance", () => {
  it("returns locked_rank guidance when rank is not enough", () => {
    const state = buildState({
      discoveredFormulas: ["triad_prime"],
      rank: "学徒",
    });

    const guidance = getNextFormulaGuidance(state);
    expect(guidance?.formulaId).toBe("mercurial_ladder");
    expect(guidance?.status).toBe("locked_rank");
  });

  it("returns missing_prerequisite when dependency is absent", () => {
    const state = buildState({
      rank: "贤者候补",
      knowledge: 60,
      mastery: 60,
      discoveredFormulas: ["triad_prime"],
    });

    const guidance = getNextFormulaGuidance(state);
    expect(guidance?.formulaId).toBe("mercurial_ladder");
  });

  it("returns ready_to_research when stats and prerequisites are satisfied", () => {
    const state = buildState({
      rank: "贤者候补",
      knowledge: 60,
      mastery: 60,
      discoveredFormulas: ["triad_prime", "mercurial_ladder", "great_conjunction"],
    });

    const guidance = getNextFormulaGuidance(state);
    expect(guidance?.formulaId).toBe("philosopher_stone");
    expect(guidance?.status).toBe("ready_to_research");
  });
});
