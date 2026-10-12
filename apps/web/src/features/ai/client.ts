import type { ChatCompletionResponse } from "@/features/ai/types";
import type { AiRuntimeConfig, EventContext, NarrativeEvent } from "@/features/game/types";

const REQUEST_TIMEOUT_MS = 12_000;

const SYSTEM_PROMPT = [
  "你是炼金术题材文字冒险事件生成器。",
  "请使用庄重神秘的中文文风。",
  "不要使用列表，不要解释规则，不要出现JSON。",
  "文本长度控制在60到180字，必须包含炼金术意象（火候、坩埚、封印、翠玉录等任意元素）。",
  "避免现代互联网术语。",
  "严格按以下格式输出：",
  "标题：不超过16字，不要与正文首句完全重复。",
  "正文：一段到两段连续叙述。",
].join("\n");

/** 是否运行在 Tauri 桌面外壳内。 */
function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * 桌面端（Tauri）里请求由 Rust 后端发出，不受浏览器 CORS 限制，因此优先走插件 fetch；
 * 插件不可用或被 scope 拒绝时回退原生 fetch。浏览器里始终走原生 fetch。
 */
async function performRequest(url: string, init: RequestInit): Promise<Response> {
  if (isTauriRuntime()) {
    try {
      const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");
      return await tauriFetch(url, init);
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      try {
        return await fetch(url, init);
      } catch {
        throw error;
      }
    }
  }
  return await fetch(url, init);
}

function normalizeBaseUrl(baseUrl?: string): string {
  if (!baseUrl) {
    return "https://api.openai.com/v1";
  }
  return baseUrl.trim().replace(/\/+$/, "");
}

function deriveTitle(content: string): string {
  const sentence = content
    .replace(/\s+/g, " ")
    .trim()
    .split(/[。！？!?.]/)
    .find(Boolean);
  if (!sentence) {
    return "炼金异象";
  }

  const clauses = sentence
    .split(/[，、；：,:]/)
    .map((part) => part.trim())
    .filter(Boolean);

  const preferred = clauses.find((part) => part.length >= 4 && part.length <= 16);
  if (preferred) {
    return preferred;
  }

  const fallback = clauses.find((part) => part.length >= 4) ?? sentence.trim();
  return fallback.slice(0, 18);
}

function sanitizeContent(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\r/g, "")
    .trim()
    .slice(0, 260);
}

function parseNarrativeContent(rawContent: string): { title: string; body: string } {
  const cleaned = sanitizeContent(rawContent);
  if (!cleaned) {
    return {
      title: "炼金异象",
      body: "",
    };
  }

  const labelled = cleaned.match(/^\s*标题[:：]\s*(.+?)\s*(?:\n+|\r\n+)\s*正文[:：]\s*([\s\S]+)$/);
  if (labelled) {
    return {
      title: labelled[1].trim().slice(0, 40),
      body: labelled[2].trim(),
    };
  }

  const inlineBold = cleaned.match(/^\s*\*\*(.+?)\*\*[：:\s-]*([\s\S]*)$/);
  if (inlineBold) {
    const body = inlineBold[2].trim();
    if (body) {
      return {
        title: inlineBold[1].trim().slice(0, 40),
        body,
      };
    }
  }

  const lines = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 1 && lines[0].length <= 24) {
    return {
      title: lines[0].replace(/^#+\s*/, "").trim().slice(0, 40),
      body: lines.slice(1).join("\n\n").trim(),
    };
  }

  return {
    title: deriveTitle(cleaned),
    body: cleaned,
  };
}

function buildUserPrompt(context: EventContext): string {
  return [
    `日期: 第${context.day}日`,
    `境界: ${context.rank}`,
    `章节: ${context.chapterTitle}`,
    `触发来源: ${context.trigger}`,
    `上一动作: ${context.lastActionSummary}`,
    `当前状态: 知识${context.knowledge} 熟练${context.mastery} 名望${context.reputation}`,
    "请生成一个可直接展示给玩家的随机事件正文。",
  ].join("\n");
}

/**
 * 静态部署下没有服务端代理，请求由浏览器直连用户配置的接口。
 * 连接失败最常见的原因是目标接口未开放跨域（CORS），这里给出可读提示。
 */
function describeRequestFailure(error: unknown, baseUrl: string): string {
  if (isAbortError(error)) {
    return `AI 请求超时（${REQUEST_TIMEOUT_MS / 1000} 秒）。`;
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "当前设备处于离线状态，无法访问 AI 接口。";
  }
  if (isTauriRuntime()) {
    return `无法访问 ${baseUrl}：请检查接口地址、网络连通性与密钥是否正确。`;
  }
  return `无法访问 ${baseUrl}：浏览器直连被拒绝，通常是该接口未开放跨域（CORS）访问。可改用支持跨域的兼容网关，或关闭 AI 异象、使用内置事件。`;
}

export async function generateNarrativeFromApi(
  context: EventContext,
  config: AiRuntimeConfig | null,
): Promise<NarrativeEvent> {
  if (!config?.enabled || !config.model || !config.apiKey) {
    throw new Error("AI 未启用或配置不完整。");
  }

  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await performRequest(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.95,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: buildUserPrompt(context),
          },
        ],
      }),
      signal: controller.signal,
    });
  } catch (error) {
    throw new Error(describeRequestFailure(error, baseUrl));
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`AI 请求失败（${response.status}）：${errorText.slice(0, 200)}`);
  }

  const data = (await response.json().catch(() => ({}))) as ChatCompletionResponse;
  const rawContent = data.choices?.[0]?.message?.content ?? "";
  const parsed = parseNarrativeContent(rawContent);

  if (!parsed.body) {
    throw new Error("AI 返回内容为空。");
  }

  return {
    id: `ai_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`,
    title: (parsed.title || "未知异象").trim().slice(0, 40),
    body: parsed.body.trim().slice(0, 260),
    tags: ["ai", "alchemy"],
    source: "ai",
  };
}
