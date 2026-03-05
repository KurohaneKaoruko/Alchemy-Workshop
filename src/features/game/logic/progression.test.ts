import { describe, expect, it } from "vitest";
import { applyChapterChoice } from "@/features/game/logic/progression";
import { createInitialGameState } from "@/features/game/state";
import type { GameState } from "@/features/game/types";

function buildState(patch: Partial<GameState>): GameState {
  return {
    ...createInitialGameState(),
    ...patch,
  };
}

describe("story formula discovery", () => {
  it("discovers mercurial_ladder from story action when requirements are met", () => {
    const state = buildState({
      rank: "炼金士",
      knowledge: 22,
      mastery: 19,
      reputation: 6,
      discoveredFormulas: ["triad_prime"],
      actionsLeft: 3,
    });

    const result = applyChapterChoice(state, "alchemist-tablet", () => 0);
    expect(result.state.discoveredFormulas).toContain("mercurial_ladder");
    expect(result.message).toContain("汞梯升华");
  });

  it("does not discover great_conjunction when prerequisite formula is missing", () => {
    const state = buildState({
      rank: "贤者候补",
      knowledge: 55,
      mastery: 55,
      reputation: 25,
      discoveredFormulas: ["triad_prime"],
      actionsLeft: 3,
    });

    const result = applyChapterChoice(state, "candidate-emerald", () => 0);
    expect(result.state.discoveredFormulas).not.toContain("great_conjunction");
  });

  it("discovers great_conjunction when prerequisite formula exists", () => {
    const state = buildState({
      rank: "贤者候补",
      knowledge: 58,
      mastery: 56,
      reputation: 26,
      discoveredFormulas: ["triad_prime", "mercurial_ladder"],
      actionsLeft: 3,
    });

    const result = applyChapterChoice(state, "candidate-emerald", () => 0);
    expect(result.state.discoveredFormulas).toContain("great_conjunction");
  });

  it("discovers philosopher_stone clue only after great_conjunction", () => {
    const state = buildState({
      rank: "贤者候补",
      knowledge: 63,
      mastery: 60,
      reputation: 28,
      discoveredFormulas: ["triad_prime", "mercurial_ladder", "great_conjunction"],
      actionsLeft: 3,
    });

    const result = applyChapterChoice(state, "candidate-meditate", () => 0);
    expect(result.state.discoveredFormulas).toContain("philosopher_stone");
    expect(result.message).toContain("赤红完成");
  });
});
