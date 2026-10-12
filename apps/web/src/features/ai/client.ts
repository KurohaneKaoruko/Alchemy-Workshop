import type { AiEventRequestBody, AiEventResponseBody } from "@/features/ai/types";
import type { AiRuntimeConfig, EventContext, NarrativeEvent } from "@/features/game/types";

export async function generateNarrativeFromApi(
  context: EventContext,
  config: AiRuntimeConfig | null,
): Promise<NarrativeEvent> {
  if (!config?.enabled || !config.model || !config.apiKey) {
    throw new Error("AI 未启用或配置不完整。");
  }

  const payload: AiEventRequestBody = {
    context,
    config: {
      baseUrl: config.baseUrl,
      model: config.model,
      apiKey: config.apiKey,
    },
  };

  const response = await fetch("/api/ai/event", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "AI 事件生成失败。");
  }

  const data = (await response.json()) as AiEventResponseBody;
  const title = (data.title || "未知异象").trim().slice(0, 40);
  const body = (data.body || "你经历了一段难以言说的炼金波动。").trim().slice(0, 260);
  const tags = data.tags?.slice(0, 6) ?? [];

  return {
    id: `ai_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`,
    title,
    body,
    tags,
    source: "ai",
  };
}
