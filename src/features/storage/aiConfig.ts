import { decryptFromLocalStorage, encryptForLocalStorage } from "./crypto";
import type { AiRuntimeConfig } from "@/features/game/types";

const AI_CONFIG_STORAGE_KEY = "alchemy-workshop-ai-config-v1";

export interface AiSettingsForm {
  enabled: boolean;
  baseUrl: string;
  model: string;
  apiKey: string;
}

interface PersistedAiSettings {
  enabled: boolean;
  baseUrl?: string;
  model?: string;
  apiKeyCipher?: string;
}

export const AI_SETTINGS_DEFAULTS: AiSettingsForm = {
  enabled: false,
  baseUrl: "https://api.openai.com/v1",
  model: "",
  apiKey: "",
};

export async function loadAiSettings(): Promise<AiSettingsForm> {
  if (typeof window === "undefined") {
    return AI_SETTINGS_DEFAULTS;
  }

  try {
    const raw = window.localStorage.getItem(AI_CONFIG_STORAGE_KEY);
    if (!raw) {
      return AI_SETTINGS_DEFAULTS;
    }

    const parsed = JSON.parse(raw) as PersistedAiSettings;
    let apiKey = "";
    if (parsed.apiKeyCipher) {
      try {
        apiKey = await decryptFromLocalStorage(parsed.apiKeyCipher);
      } catch {
        apiKey = "";
      }
    }

    return {
      enabled: Boolean(parsed.enabled),
      baseUrl: parsed.baseUrl ?? AI_SETTINGS_DEFAULTS.baseUrl,
      model: parsed.model ?? "",
      apiKey,
    };
  } catch {
    return AI_SETTINGS_DEFAULTS;
  }
}

export async function saveAiSettings(settings: AiSettingsForm): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const payload: PersistedAiSettings = {
    enabled: settings.enabled,
    baseUrl: settings.baseUrl.trim() || AI_SETTINGS_DEFAULTS.baseUrl,
    model: settings.model.trim(),
  };

  const key = settings.apiKey.trim();
  if (key) {
    payload.apiKeyCipher = await encryptForLocalStorage(key);
  }

  window.localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(payload));
}

export function toRuntimeConfig(settings: AiSettingsForm): AiRuntimeConfig | null {
  if (!settings.enabled) {
    return null;
  }

  const model = settings.model.trim();
  const apiKey = settings.apiKey.trim();
  if (!model || !apiKey) {
    return null;
  }

  return {
    enabled: true,
    baseUrl: settings.baseUrl.trim() || AI_SETTINGS_DEFAULTS.baseUrl,
    model,
    apiKey,
  };
}
