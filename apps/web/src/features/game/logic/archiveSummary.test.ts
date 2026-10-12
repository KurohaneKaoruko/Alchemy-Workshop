import { describe, expect, it } from "vitest";
import { createInitialGameState } from "@/features/game/state";
import { buildArchiveSummary } from "@/features/game/logic/archiveSummary";
import type { CinematicArchiveEntry } from "@/features/storage/cinematicArchive";

describe("buildArchiveSummary", () => {
  it("summarizes journal, archive, and resource highlights", () => {
    const game = createInitialGameState();
    game.journal = [
      {
        id: "event-1",
        day: 3,
        type: "event",
        title: "异象记录",
        body: "炉心出现回响。",
        createdAt: "2026-03-08T10:00:00.000Z",
      },
      {
        id: "story-1",
        day: 2,
        type: "story",
        title: "章节推进",
        body: "你在塔下发现裂隙。",
        createdAt: "2026-03-07T10:00:00.000Z",
      },
      {
        id: "system-1",
        day: 1,
        type: "system",
        title: "工坊启程",
        body: "第一炉火被点亮。",
        createdAt: "2026-03-06T10:00:00.000Z",
      },
    ];
    game.resources.herbEssence = 9;
    game.resources.salt = 12;
    game.resources.copperFilings = 7;
    game.resources.mercury = 5;
    game.resources.ash = 3;

    const archiveEntries: CinematicArchiveEntry[] = [
      {
        id: "replay-1",
        kind: "event",
        title: "铜镜倒映",
        body: "镜面返照出另一道火纹。",
        day: 3,
        createdAt: "2026-03-08T11:00:00.000Z",
      },
      {
        id: "replay-2",
        kind: "chapter_intro",
        title: "序章",
        body: "雾中塔楼苏醒。",
        day: 1,
        createdAt: "2026-03-06T09:00:00.000Z",
      },
    ];

    const summary = buildArchiveSummary(game, archiveEntries);

    expect(summary.journalCounts).toEqual({
      story: 1,
      craft: 0,
      event: 1,
      system: 1,
    });
    expect(summary.archiveCounts).toEqual({
      chapter_intro: 1,
      event: 1,
      rank_ascension: 0,
      ending: 0,
    });
    expect(summary.totalResourceUnits).toBeGreaterThan(30);
    expect(summary.topResources.map((item) => item.key)).toEqual(["salt", "herbEssence", "copperFilings", "mercury"]);
    expect(summary.latestJournalEntry?.id).toBe("event-1");
    expect(summary.latestArchiveEntry?.id).toBe("replay-1");
  });
});
