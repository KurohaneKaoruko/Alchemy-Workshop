export type CinematicArchiveKind =
  | "event"
  | "chapter_intro"
  | "rank_ascension"
  | "ending";

export interface CinematicArchiveEntry {
  id: string;
  kind: CinematicArchiveKind;
  title: string;
  subtitle?: string;
  body: string;
  day: number;
  source?: "ai" | "fallback" | "system";
  createdAt: string;
  payload?: Record<string, unknown>;
}

const ARCHIVE_STORAGE_KEY = "alchemy-workshop-cinematic-archive-v1";

function normalizeEntry(value: unknown): CinematicArchiveEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const entry = value as Partial<CinematicArchiveEntry>;
  if (
    typeof entry.id !== "string" ||
    typeof entry.kind !== "string" ||
    typeof entry.title !== "string" ||
    typeof entry.body !== "string" ||
    typeof entry.day !== "number" ||
    typeof entry.createdAt !== "string"
  ) {
    return null;
  }
  return {
    id: entry.id,
    kind: entry.kind as CinematicArchiveKind,
    title: entry.title,
    subtitle: typeof entry.subtitle === "string" ? entry.subtitle : undefined,
    body: entry.body,
    day: entry.day,
    source:
      entry.source === "ai" || entry.source === "fallback" || entry.source === "system"
        ? entry.source
        : undefined,
    createdAt: entry.createdAt,
    payload:
      entry.payload && typeof entry.payload === "object"
        ? (entry.payload as Record<string, unknown>)
        : undefined,
  };
}

export function loadCinematicArchive(): CinematicArchiveEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ARCHIVE_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry) => normalizeEntry(entry))
      .filter((entry): entry is CinematicArchiveEntry => Boolean(entry))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } catch {
    return [];
  }
}

export function saveCinematicArchive(entries: CinematicArchiveEntry[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(entries.slice(0, 200)));
}

export function addCinematicArchiveEntry(
  input: Omit<CinematicArchiveEntry, "createdAt"> & { createdAt?: string },
): CinematicArchiveEntry[] {
  const current = loadCinematicArchive();
  if (current.some((entry) => entry.id === input.id)) {
    return current;
  }
  const next: CinematicArchiveEntry = {
    ...input,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  const merged = [next, ...current].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  saveCinematicArchive(merged);
  return merged;
}

export function clearCinematicArchive(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(ARCHIVE_STORAGE_KEY);
}
