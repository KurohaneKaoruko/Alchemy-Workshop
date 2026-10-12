import { describe, expect, it } from "vitest";
import {
  buildSettingsChecklist,
  buildSettingsOverview,
  getConnectionFeedbackTone,
} from "@/features/game/logic/settingsChecklist";
import type { AiRuntimeConfig } from "@/features/game/types";
import { AI_SETTINGS_DEFAULTS } from "@/features/storage/aiConfig";
import { DEFAULT_GAME_PREFERENCES } from "@/features/storage/preferences";

describe("buildSettingsChecklist", () => {
  it("marks missing model and key as attention when ai is enabled", () => {
    const checklist = buildSettingsChecklist(
      {
        ...AI_SETTINGS_DEFAULTS,
        enabled: true,
        model: "",
        apiKey: "",
      },
      DEFAULT_GAME_PREFERENCES,
      null,
    );

    expect(checklist.find((item) => item.id === "ai_mode")?.state).toBe("attention");
    expect(checklist.find((item) => item.id === "model")?.state).toBe("attention");
    expect(checklist.find((item) => item.id === "api_key")?.state).toBe("attention");
  });

  it("marks enabled ai as ready once runtime config is complete", () => {
    const runtime: AiRuntimeConfig = {
      enabled: true,
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
      apiKey: "secret",
    };

    const checklist = buildSettingsChecklist(
      {
        enabled: true,
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4.1-mini",
        apiKey: "secret",
      },
      DEFAULT_GAME_PREFERENCES,
      runtime,
    );

    expect(checklist.every((item) => item.id === "audio" || item.state === "ready")).toBe(true);
    expect(checklist.find((item) => item.id === "audio")?.state).toBe("ready");
  });

  it("keeps optional ai fields in standby when ai is disabled", () => {
    const checklist = buildSettingsChecklist(AI_SETTINGS_DEFAULTS, DEFAULT_GAME_PREFERENCES, null);

    expect(checklist.find((item) => item.id === "ai_mode")?.state).toBe("standby");
    expect(checklist.find((item) => item.id === "model")?.state).toBe("standby");
    expect(checklist.find((item) => item.id === "api_key")?.state).toBe("standby");
  });
});

describe("getConnectionFeedbackTone", () => {
  it("classifies connection status text", () => {
    expect(getConnectionFeedbackTone("")).toBe("neutral");
    expect(getConnectionFeedbackTone("测试连接中...")).toBe("pending");
    expect(getConnectionFeedbackTone("连接成功，可用于随机事件叙事。")).toBe("success");
    expect(getConnectionFeedbackTone("连接失败：403")).toBe("error");
  });
});

describe("buildSettingsOverview", () => {
  it("summarizes standby mode when ai is disabled", () => {
    const checklist = buildSettingsChecklist(AI_SETTINGS_DEFAULTS, DEFAULT_GAME_PREFERENCES, null);

    const overview = buildSettingsOverview(checklist, null, "", {
      aiModeLabel: "回退模式",
      keyStatus: "未录入",
      canTestConnection: false,
    });

    expect(overview.tone).toBe("standby");
    expect(overview.headline).toBe("当前处于回退模式");
    expect(overview.connectionLabel).toBe("待补全");
  });

  it("summarizes attention mode when ai draft is incomplete", () => {
    const checklist = buildSettingsChecklist(
      {
        ...AI_SETTINGS_DEFAULTS,
        enabled: true,
        model: "",
        apiKey: "",
      },
      DEFAULT_GAME_PREFERENCES,
      null,
    );

    const overview = buildSettingsOverview(checklist, null, "", {
      aiModeLabel: "待验证",
      keyStatus: "未录入",
      canTestConnection: false,
    });

    expect(overview.tone).toBe("attention");
    expect(overview.headline).toContain("待补全");
    expect(overview.detail).toContain("AI 异象开关");
  });

  it("summarizes ready mode when runtime ai is active", () => {
    const runtime: AiRuntimeConfig = {
      enabled: true,
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-5.4",
      apiKey: "secret",
    };
    const checklist = buildSettingsChecklist(
      {
        enabled: true,
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-5.4",
        apiKey: "secret",
      },
      DEFAULT_GAME_PREFERENCES,
      runtime,
    );

    const overview = buildSettingsOverview(checklist, runtime, "", {
      aiModeLabel: "实时异象",
      keyStatus: "已录入",
      canTestConnection: true,
    });

    expect(overview.tone).toBe("ready");
    expect(overview.headline).toBe("AI 已接入工坊");
    expect(overview.connectionLabel).toBe("待验证");
  });

  it("prefers explicit connection failures over general readiness", () => {
    const checklist = buildSettingsChecklist(
      {
        enabled: true,
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-5.4",
        apiKey: "secret",
      },
      DEFAULT_GAME_PREFERENCES,
      null,
    );

    const overview = buildSettingsOverview(checklist, null, "连接失败：403", {
      aiModeLabel: "待验证",
      keyStatus: "已录入",
      canTestConnection: true,
    });

    expect(overview.tone).toBe("error");
    expect(overview.headline).toBe("连接验证失败");
    expect(overview.connectionLabel).toBe("连接失败");
  });
});
