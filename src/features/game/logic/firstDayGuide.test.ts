import { describe, expect, it } from "vitest";
import { createInitialGameState, createJournalEntry } from "@/features/game/state";
import { buildFirstDayGuide } from "@/features/game/logic/firstDayGuide";

describe("buildFirstDayGuide", () => {
  it("shows story as the first active step for a fresh apprentice", () => {
    const guide = buildFirstDayGuide(createInitialGameState());

    expect(guide?.currentStepId).toBe("story");
    expect(guide?.currentHref).toBe("/workshop/story");
    expect(guide?.milestone).toBeNull();
    expect(guide?.steps.map((step) => step.status)).toEqual(["active", "pending", "pending"]);
  });

  it("switches to alchemy after first story progress is recorded", () => {
    const game = createInitialGameState();
    game.knowledge = 7;
    game.actionsLeft = 2;
    game.journal = [
      createJournalEntry({
        day: 1,
        type: "story",
        title: "塔下拾级",
        body: "你在裂纹旁读到第一段可用的定式注记。",
      }),
      ...game.journal,
    ];

    const guide = buildFirstDayGuide(game);

    expect(guide?.currentStepId).toBe("alchemy");
    expect(guide?.milestone).toEqual(
      expect.objectContaining({ id: "story_complete", nextHref: "/workshop/alchemy" }),
    );
    expect(guide?.steps.map((step) => step.status)).toEqual(["done", "active", "pending"]);
  });

  it("switches to archive review after first crafting progress exists", () => {
    const game = createInitialGameState();
    game.knowledge = 7;
    game.actionsLeft = 2;
    game.completedRecipes = ["triad_prime"];
    game.journal = [
      createJournalEntry({
        day: 1,
        type: "craft",
        title: "三元初衡",
        body: "阵盘第一次稳定回应，盐光在中央收束。",
      }),
      ...game.journal,
    ];

    const guide = buildFirstDayGuide(game);

    expect(guide?.currentStepId).toBe("journal");
    expect(guide?.milestone).toEqual(
      expect.objectContaining({ id: "alchemy_complete", nextHref: "/workshop/journal" }),
    );
    expect(guide?.steps.map((step) => step.status)).toEqual(["done", "done", "active"]);
  });
});
