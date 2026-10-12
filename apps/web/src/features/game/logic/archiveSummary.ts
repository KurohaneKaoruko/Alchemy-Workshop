import { RESOURCE_LABELS } from "@/features/game/data/resourceMeta";
import type { GameState, JournalType, ResourceKey } from "@/features/game/types";
import type { CinematicArchiveEntry, CinematicArchiveKind } from "@/features/storage/cinematicArchive";

export interface ArchiveResourceHighlight {
  key: ResourceKey;
  label: string;
  amount: number;
}

export interface ArchiveSummary {
  journalCounts: Record<JournalType, number>;
  archiveCounts: Record<CinematicArchiveKind, number>;
  totalResourceUnits: number;
  topResources: ArchiveResourceHighlight[];
  latestJournalEntry: GameState["journal"][number] | null;
  latestArchiveEntry: CinematicArchiveEntry | null;
}

export function buildArchiveSummary(game: GameState, entries: CinematicArchiveEntry[]): ArchiveSummary {
  const journalCounts = game.journal.reduce<Record<JournalType, number>>(
    (acc, entry) => {
      acc[entry.type] += 1;
      return acc;
    },
    {
      story: 0,
      craft: 0,
      event: 0,
      system: 0,
    },
  );

  const archiveCounts = entries.reduce<Record<CinematicArchiveKind, number>>(
    (acc, entry) => {
      acc[entry.kind] += 1;
      return acc;
    },
    {
      chapter_intro: 0,
      event: 0,
      rank_ascension: 0,
      ending: 0,
    },
  );

  const topResources = (Object.entries(game.resources) as Array<[ResourceKey, number]>)
    .filter(([, amount]) => amount > 0)
    .sort((left, right) => {
      return right[1] - left[1] || RESOURCE_LABELS[left[0]].localeCompare(RESOURCE_LABELS[right[0]], "zh-Hans-CN");
    })
    .slice(0, 4)
    .map(([key, amount]) => ({
      key,
      label: RESOURCE_LABELS[key],
      amount,
    }));

  const totalResourceUnits = Object.values(game.resources).reduce((sum, amount) => sum + amount, 0);

  return {
    journalCounts,
    archiveCounts,
    totalResourceUnits,
    topResources,
    latestJournalEntry: game.journal[0] ?? null,
    latestArchiveEntry: entries[0] ?? null,
  };
}
