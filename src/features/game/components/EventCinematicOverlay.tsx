"use client";

import { useEffect, useMemo, useState } from "react";
import type { LastEventDigest } from "@/features/game/types";

interface EventCinematicOverlayProps {
  event: LastEventDigest | null;
  onClose: () => void;
}

const TYPING_INTERVAL_MS = 18;

export function EventCinematicOverlay({ event, onClose }: EventCinematicOverlayProps) {
  const [typedLength, setTypedLength] = useState(0);

  const fullText = useMemo(() => {
    if (!event) {
      return "";
    }
    return `${event.body}\n\n${event.outcomeSummary}`;
  }, [event]);

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
        <h3 className="event-cinematic-overlay__title">{event.title}</h3>
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
