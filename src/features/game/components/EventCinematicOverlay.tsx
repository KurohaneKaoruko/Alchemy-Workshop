"use client";

import { useEffect, useMemo, useState } from "react";
import type { LastEventDigest } from "@/features/game/types";

interface EventCinematicOverlayProps {
  event: LastEventDigest | null;
  onClose: () => void;
}

const TYPING_INTERVAL_MS = 18;

function deriveCompactTitle(content: string): string {
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

function normalizeEventCopy(event: LastEventDigest): { title: string; body: string } {
  const rawTitle = event.title.trim();
  const rawBody = event.body.replace(/\r/g, "").trim();

  const labelled = rawBody.match(/^\s*标题[:：]\s*(.+?)\s*(?:\n+|\r\n+)\s*正文[:：]\s*([\s\S]+)$/);
  if (labelled) {
    return {
      title: labelled[1].trim(),
      body: labelled[2].trim(),
    };
  }

  const inlineBold = rawBody.match(/^\s*\*\*(.+?)\*\*[：:\s-]*([\s\S]*)$/);
  if (inlineBold) {
    const body = inlineBold[2].trim();
    if (body) {
      return {
        title: inlineBold[1].trim(),
        body,
      };
    }
  }

  const lines = rawBody
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 1 && lines[0].length <= 24) {
    return {
      title: lines[0].replace(/^#+\s*/, "").trim(),
      body: lines.slice(1).join("\n\n").trim(),
    };
  }

  const normalizedBody = rawBody.replace(/\s+/g, " ").trim();
  const normalizedTitle = rawTitle.replace(/\s+/g, " ").trim();

  if (normalizedTitle && normalizedBody.startsWith(normalizedTitle)) {
    return {
      title: deriveCompactTitle(rawBody),
      body: rawBody,
    };
  }

  return {
    title: rawTitle || deriveCompactTitle(rawBody),
    body: rawBody,
  };
}

export function EventCinematicOverlay({ event, onClose }: EventCinematicOverlayProps) {
  const [typedLength, setTypedLength] = useState(0);
  const normalizedEvent = useMemo(() => (event ? normalizeEventCopy(event) : null), [event]);

  const fullText = useMemo(() => {
    if (!event || !normalizedEvent) {
      return "";
    }
    return `${normalizedEvent.body}\n\n${event.outcomeSummary}`;
  }, [event, normalizedEvent]);

  useEffect(() => {
    if (!event) {
      return;
    }
    const timer = window.setInterval(() => {
      setTypedLength((current) => {
        if (current >= fullText.length) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, TYPING_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [event, fullText.length]);

  if (!event) {
    return null;
  }

  const isTyping = typedLength < fullText.length;
  const visibleText = isTyping ? fullText.slice(0, typedLength) : fullText;

  return (
    <div className="event-cinematic-overlay">
      <div className="event-cinematic-overlay__backdrop" />
      <div className="event-cinematic-overlay__frame">
        <div className="cinematic-frame__halo" aria-hidden />
        <div className="cinematic-frame__seal" aria-hidden />
        <div className="cinematic-frame__ornament cinematic-frame__ornament--left" aria-hidden />
        <div className="cinematic-frame__ornament cinematic-frame__ornament--right" aria-hidden />
        <p className="event-cinematic-overlay__source">
          {event.source === "ai" ? "AI 异象记录" : "工坊秘录"}
        </p>
        <h3 className="event-cinematic-overlay__title">{normalizedEvent?.title ?? event.title}</h3>
        <p className="event-cinematic-overlay__text">
          {visibleText}
          {isTyping ? <span className="event-cinematic-overlay__cursor">▍</span> : null}
        </p>
        <div className="event-cinematic-overlay__actions">
          {isTyping ? (
            <button
              type="button"
              onClick={() => setTypedLength(fullText.length)}
              className="game-button rounded-lg border border-[#7a6338] bg-[#f0dfb8] px-3 py-1.5 text-sm hover:bg-[#e5cf9f]"
            >
              跳过演出
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="game-button rounded-lg border border-[#7a6338] bg-[#ead8aa] px-3 py-1.5 text-sm hover:bg-[#dcc48d]"
          >
            继续
          </button>
        </div>
      </div>
    </div>
  );
}
