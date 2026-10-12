import type { GameState, JournalEntry, ResourceKey } from "@/features/game/types";

export interface WorkshopOverviewResourceHighlight {
  key: ResourceKey;
  value: number;
}

export interface WorkshopOverviewJournalPreview {
  id: string;
  day: number;
  title: string;
  type: JournalEntry["type"];
  preview: string;
}

export interface WorkshopOverviewSummary {
  reserveHighlights: WorkshopOverviewResourceHighlight[];
  recentEntries: WorkshopOverviewJournalPreview[];
  totalResourceKinds: number;
  totalResourceUnits: number;
}

interface WorkshopOverviewOptions {
  entryLimit?: number;
  resourceLimit?: number;
}

export function buildJournalPreview(body: string, maxLength = 56): string {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "暂无记录摘要。";
  }

  const firstSentence = normalized.split(/[。！？!?]/).find((segment) => segment.trim().length > 0)?.trim();
  if (firstSentence && firstSentence.length <= maxLength - 1) {
    return `${firstSentence}。`;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(1, maxLength - 1)).trim()}…`;
}

export function buildWorkshopOverview(
  game: GameState,
  options: WorkshopOverviewOptions = {},
): WorkshopOverviewSummary {
  const { entryLimit = 2, resourceLimit = 4 } = options;

  const reserveHighlights = (Object.entries(game.resources) as Array<[ResourceKey, number]>)
    .filter(([, value]) => value > 0)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "zh-Hans-CN"))
    .slice(0, resourceLimit)
    .map(([key, value]) => ({ key, value }));

  const totalResourceKinds = Object.values(game.resources).filter((value) => value > 0).length;
  const totalResourceUnits = Object.values(game.resources).reduce((sum, value) => sum + value, 0);

  const recentEntries = game.journal.slice(0, entryLimit).map((entry) => ({
    id: entry.id,
    day: entry.day,
    title: entry.title,
    type: entry.type,
    preview: buildJournalPreview(entry.body),
  }));

  return {
    reserveHighlights,
    recentEntries,
    totalResourceKinds,
    totalResourceUnits,
  };
}
