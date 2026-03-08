import { NextRequest, NextResponse } from "next/server";
import type { AiEventRequestBody } from "@/features/ai/types";

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

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as AiEventRequestBody;
    const model = payload?.config?.model?.trim();
    const apiKey = payload?.config?.apiKey?.trim();
    const baseUrl = normalizeBaseUrl(payload?.config?.baseUrl);

    if (!model || !apiKey) {
      return NextResponse.json(
        {
          error: "模型或 API Key 缺失。",
        },
        { status: 400 },
      );
    }

    const userPrompt = [
      `日期: 第${payload.context.day}日`,
      `境界: ${payload.context.rank}`,
      `章节: ${payload.context.chapterTitle}`,
      `触发来源: ${payload.context.trigger}`,
      `上一动作: ${payload.context.lastActionSummary}`,
      `当前状态: 知识${payload.context.knowledge} 熟练${payload.context.mastery} 名望${payload.context.reputation}`,
      "请生成一个可直接展示给玩家的随机事件正文。",
    ].join("\n");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.95,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: `AI 请求失败（${response.status}）：${errorText.slice(0, 200)}`,
        },
        { status: 502 },
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const rawContent = data.choices?.[0]?.message?.content ?? "";
    const parsed = parseNarrativeContent(rawContent);
    const body = parsed.body;

    if (!body) {
      return NextResponse.json(
        {
          error: "AI 返回内容为空。",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      title: parsed.title,
      body,
      tags: ["ai", "alchemy"],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      {
        error: `AI 事件生成异常：${message}`,
      },
      { status: 500 },
    );
  }
}
