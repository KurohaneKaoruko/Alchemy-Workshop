"use client";

import { useEffect, useMemo, useState } from "react";

export interface EndingRitualPayload {
  id: string;
  day: number;
  ending: "philosopher_stone";
}

interface EndingRitualOverlayProps {
  ending: EndingRitualPayload | null;
  onClose: () => void;
}

const STAGE_INTERVAL_MS = 1300;

export function EndingRitualOverlay({ ending, onClose }: EndingRitualOverlayProps) {
  const lines = useMemo(() => {
    if (!ending) {
      return [];
    }
    return [
      "火、盐、硫、汞在阵心重叠。",
      "《翠玉录》的句式与你的呼吸完全一致。",
      "赤红光核凝固，贤者之石在你掌中稳定。",
      `第 ${ending.day} 日，工坊记录你的终式：最强炼金术师。`,
    ];
  }, [ending]);

  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!ending) {
      return;
    }
    const timer = window.setInterval(() => {
      setStage((current) => Math.min(lines.length, current + 1));
    }, STAGE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [ending, lines.length]);

  if (!ending) {
    return null;
  }

  const finished = stage >= lines.length;

  return (
    <div className="ending-ritual-overlay">
      <div className="ending-ritual-overlay__backdrop" />
      <div className="ending-ritual-overlay__frame">
        <p className="ending-ritual-overlay__label">Grand Work</p>
        <h2 className="ending-ritual-overlay__title">贤者之石完成</h2>
        <div className="ending-ritual-overlay__lines">
          {lines.slice(0, stage).map((line) => (
            <p key={line}>{line}</p>
          ))}
          {!finished ? <p className="ending-ritual-overlay__cursor">▋</p> : null}
        </div>
        <div className="ending-ritual-overlay__actions">
          {!finished ? (
            <button
              type="button"
              onClick={() => setStage(lines.length)}
              className="game-button rounded-lg border border-[#7a6338] bg-[#f0dfb8] px-3 py-1.5 text-sm hover:bg-[#e5cf9f]"
            >
              快进仪式
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="game-button rounded-lg border border-[#7a6338] bg-[#ead8aa] px-3 py-1.5 text-sm hover:bg-[#dcc48d]"
          >
            回到工坊
          </button>
        </div>
      </div>
    </div>
  );
}
