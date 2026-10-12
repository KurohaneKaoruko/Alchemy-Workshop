import type { AiRuntimeConfig } from "@/features/game/types";
import type { AiSettingsForm } from "@/features/storage/aiConfig";
import type { GamePreferences } from "@/features/storage/preferences";

export type SettingsChecklistState = "ready" | "attention" | "standby";
export type ConnectionFeedbackTone = "neutral" | "pending" | "success" | "error";
export type SettingsOverviewTone = "ready" | "attention" | "standby" | "pending" | "success" | "error";

export interface SettingsChecklistItem {
  id: "ai_mode" | "base_url" | "model" | "api_key" | "audio";
  label: string;
  state: SettingsChecklistState;
  detail: string;
}

export interface SettingsOverviewSummary {
  readinessCount: number;
  totalCount: number;
  headline: string;
  detail: string;
  tone: SettingsOverviewTone;
  modeLabel: string;
  keyLabel: string;
  connectionLabel: string;
}

export function buildSettingsChecklist(
  draft: AiSettingsForm,
  preferences: GamePreferences,
  runtimeAiConfig: AiRuntimeConfig | null,
): SettingsChecklistItem[] {
  const aiEnabled = draft.enabled;
  const baseUrl = draft.baseUrl.trim();
  const model = draft.model.trim();
  const apiKey = draft.apiKey.trim();

  return [
    {
      id: "ai_mode",
      label: "AI 异象开关",
      state: runtimeAiConfig ? "ready" : aiEnabled ? "attention" : "standby",
      detail: runtimeAiConfig
        ? `当前已生效，模型为 ${runtimeAiConfig.model ?? "未命名模型"}。`
        : aiEnabled
          ? "已启用草稿，但仍缺少生效条件。"
          : "当前关闭，系统会稳定回退到内置事件。",
    },
    {
      id: "base_url",
      label: "Base URL",
      state: baseUrl ? "ready" : aiEnabled ? "attention" : "standby",
      detail: baseUrl ? baseUrl : aiEnabled ? "启用 AI 前需要填写兼容接口地址。" : "保持空白也不会影响离线模式。",
    },
    {
      id: "model",
      label: "模型名称",
      state: model ? "ready" : aiEnabled ? "attention" : "standby",
      detail: model ? `将用于生成随机异象文本：${model}` : aiEnabled ? "启用 AI 后必须填写模型名称。" : "AI 未启用，模型字段当前可稍后再填。",
    },
    {
      id: "api_key",
      label: "API Key",
      state: apiKey ? "ready" : aiEnabled ? "attention" : "standby",
      detail: apiKey ? "已录入本地草稿，可在保存后用于连接测试。" : aiEnabled ? "启用 AI 后必须录入密钥。" : "AI 未启用，当前无需录入密钥。",
    },
    {
      id: "audio",
      label: "仪式音效",
      state: preferences.sfxEnabled ? "ready" : "standby",
      detail: preferences.sfxEnabled
        ? `当前开启，音量 ${Math.round(preferences.sfxVolume * 100)}%。`
        : "当前关闭，所有按钮与炼成反馈都会静音。",
    },
  ];
}

export function getConnectionFeedbackTone(status: string): ConnectionFeedbackTone {
  if (!status) {
    return "neutral";
  }
  if (status.startsWith("测试连接中")) {
    return "pending";
  }
  if (status.startsWith("连接成功")) {
    return "success";
  }
  if (status.startsWith("连接失败")) {
    return "error";
  }
  return "neutral";
}

export function buildSettingsOverview(
  checklist: SettingsChecklistItem[],
  runtimeAiConfig: AiRuntimeConfig | null,
  status: string,
  options: {
    aiModeLabel: string;
    keyStatus: string;
    canTestConnection: boolean;
  },
): SettingsOverviewSummary {
  const readinessCount = checklist.filter((item) => item.state === "ready").length;
  const totalCount = checklist.length;
  const attentionItems = checklist.filter((item) => item.state === "attention");
  const connectionTone = getConnectionFeedbackTone(status);

  let headline: string;
  let detail: string;
  let tone: SettingsOverviewTone;

  if (connectionTone === "error") {
    headline = "连接验证失败";
    detail = status;
    tone = "error";
  } else if (connectionTone === "success") {
    headline = "连接验证成功";
    detail = status;
    tone = "success";
  } else if (connectionTone === "pending") {
    headline = "连接测试进行中";
    detail = status;
    tone = "pending";
  } else if (runtimeAiConfig) {
    headline = "AI 已接入工坊";
    detail = `当前模型为 ${runtimeAiConfig.model ?? "未命名模型"}，外部叙事能力已可用。`;
    tone = "ready";
  } else if (attentionItems.length > 0) {
    headline = `还有 ${attentionItems.length} 项待补全`;
    detail = `优先检查：${attentionItems.slice(0, 2).map((item) => item.label).join("、")}。`;
    tone = "attention";
  } else {
    headline = "当前处于回退模式";
    detail = "未启用 AI 也能稳定游玩，随机异象会自动回退到内置模板。";
    tone = "standby";
  }

  let connectionLabel: string;
  if (connectionTone === "success") {
    connectionLabel = "连接通过";
  } else if (connectionTone === "error") {
    connectionLabel = "连接失败";
  } else if (connectionTone === "pending") {
    connectionLabel = "测试中";
  } else if (options.canTestConnection) {
    connectionLabel = "待验证";
  } else {
    connectionLabel = "待补全";
  }

  return {
    readinessCount,
    totalCount,
    headline,
    detail,
    tone,
    modeLabel: options.aiModeLabel,
    keyLabel: options.keyStatus,
    connectionLabel,
  };
}
