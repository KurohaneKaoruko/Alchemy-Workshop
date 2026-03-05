export interface GamePreferences {
  sfxEnabled: boolean;
  sfxVolume: number;
}

export const DEFAULT_GAME_PREFERENCES: GamePreferences = {
  sfxEnabled: true,
  sfxVolume: 0.7,
};

const PREFS_STORAGE_KEY = "alchemy-workshop-preferences-v1";

function clampVolume(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function loadGamePreferences(): GamePreferences {
  if (typeof window === "undefined") {
    return DEFAULT_GAME_PREFERENCES;
  }

  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_GAME_PREFERENCES;
    }
    const parsed = JSON.parse(raw) as Partial<GamePreferences>;
    return {
      sfxEnabled:
        typeof parsed.sfxEnabled === "boolean"
          ? parsed.sfxEnabled
          : DEFAULT_GAME_PREFERENCES.sfxEnabled,
      sfxVolume:
        typeof parsed.sfxVolume === "number"
          ? clampVolume(parsed.sfxVolume)
          : DEFAULT_GAME_PREFERENCES.sfxVolume,
    };
  } catch {
    return DEFAULT_GAME_PREFERENCES;
  }
}

export function saveGamePreferences(preferences: GamePreferences): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalized: GamePreferences = {
    sfxEnabled: preferences.sfxEnabled,
    sfxVolume: clampVolume(preferences.sfxVolume),
  };
  window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(normalized));
}
