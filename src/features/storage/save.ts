import type { GameState, SaveDataV1 } from "@/features/game/types";

const SAVE_STORAGE_KEY = "alchemy-workshop-save-v1";

export function saveGameState(state: GameState): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload: SaveDataV1 = {
    version: 1,
    state,
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
}

function isGameStateLike(value: unknown): value is GameState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<GameState>;
  return (
    candidate.version === 1 &&
    typeof candidate.day === "number" &&
    typeof candidate.actionsLeft === "number" &&
    typeof candidate.rank === "string" &&
    typeof candidate.knowledge === "number" &&
    typeof candidate.mastery === "number" &&
    typeof candidate.reputation === "number" &&
    typeof candidate.vigor === "number" &&
    typeof candidate.resources === "object" &&
    Array.isArray(candidate.unlockedRecipes) &&
    (candidate.discoveredFormulas === undefined ||
      Array.isArray(candidate.discoveredFormulas)) &&
    (candidate.activeEffects === undefined || Array.isArray(candidate.activeEffects)) &&
    Array.isArray(candidate.journal)
  );
}

function normalizeGameState(state: GameState): GameState {
  const discoveredFormulas = Array.isArray(state.discoveredFormulas)
    ? state.discoveredFormulas
    : ["triad_prime"];
  const activeEffects = Array.isArray(state.activeEffects)
    ? state.activeEffects.filter((effect) => {
        return (
          effect &&
          typeof effect === "object" &&
          typeof effect.id === "string" &&
          typeof effect.kind === "string" &&
          typeof effect.label === "string" &&
          typeof effect.description === "string" &&
          typeof effect.value === "number" &&
          typeof effect.remainingTransmutations === "number"
        );
      })
    : [];
  const lastEvent =
    state.lastEvent &&
    typeof state.lastEvent.title === "string" &&
    typeof state.lastEvent.body === "string" &&
    typeof state.lastEvent.source === "string" &&
    typeof state.lastEvent.outcomeSummary === "string"
      ? {
          id:
            typeof state.lastEvent.id === "string" && state.lastEvent.id.length > 0
              ? state.lastEvent.id
              : `legacy_event_${Date.now()}`,
          title: state.lastEvent.title,
          body: state.lastEvent.body,
          source: state.lastEvent.source,
          outcomeSummary: state.lastEvent.outcomeSummary,
        }
      : undefined;

  return {
    ...state,
    discoveredFormulas,
    activeEffects,
    lastEvent,
  };
}

export function loadGameState(): GameState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as SaveDataV1;
    if (parsed.version !== 1) {
      return null;
    }
    return isGameStateLike(parsed.state) ? normalizeGameState(parsed.state) : null;
  } catch {
    return null;
  }
}

export function clearGameState(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(SAVE_STORAGE_KEY);
}
