import { describe, expect, it } from "vitest";
import { buildJournalPreview, buildWorkshopOverview } from "@/features/game/logic/workshopOverview";
import { createInitialGameState } from "@/features/game/state";

describe("buildJournalPreview", () => {
  it("prefers the first sentence when it is already concise", () => {
    expect(buildJournalPreview("炉心重新亮起。随后你记录下残留回声。"))
      .toBe("炉心重新亮起。");
  });

  it("truncates long paragraphs without punctuation", () => {
    expect(buildJournalPreview("这是一段没有句号但是会超过默认长度的长描述用于测试概览页的日志预览是否会被正确截断", 18)).toBe(
      "这是一段没有句号但是会超过默认长度…",
    );
  });
});

describe("buildWorkshopOverview", () => {
  it("collects compact highlights for the overview page", () => {
    const game = createInitialGameState();
    game.resources = Object.fromEntries(
      Object.keys(game.resources).map((key) => [key, 0]),
    ) as typeof game.resources;
    game.resources.mercury = 9;
    game.resources.salt = 12;
    game.resources.herbEssence = 6;
    game.resources.ash = 3;
    game.resources.sunShard = 1;
    game.journal = [
      {
        id: "story-1",
        day: 4,
        type: "story",
        title: "工坊回响",
        body: "你在炉边听见新的定式低语。余烬在指尖慢慢冷却。",
        createdAt: "2026-03-08T10:00:00.000Z",
      },
      {
        id: "event-1",
        day: 3,
        type: "event",
        title: "汞梯碎影",
        body: "镜面雾气缓缓上升并覆盖整个阵盘",
        createdAt: "2026-03-07T10:00:00.000Z",
      },
      {
        id: "system-1",
        day: 2,
        type: "system",
        title: "旧档案归位",
        body: "前一日的实验记录已经装订完毕。",
        createdAt: "2026-03-06T10:00:00.000Z",
      },
    ];

    const summary = buildWorkshopOverview(game);

    expect(summary.reserveHighlights.map((item) => item.key)).toEqual([
      "salt",
      "mercury",
      "herbEssence",
      "ash",
    ]);
    expect(summary.totalResourceKinds).toBe(5);
    expect(summary.totalResourceUnits).toBe(31);
    expect(summary.recentEntries).toEqual([
      expect.objectContaining({ id: "story-1", preview: "你在炉边听见新的定式低语。" }),
      expect.objectContaining({ id: "event-1", preview: expect.stringContaining("镜面雾气") }),
    ]);
  });
});
