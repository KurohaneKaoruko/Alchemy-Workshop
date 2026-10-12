"use client";

import { useEffect } from "react";
import type { Rank } from "@/features/game/types";

export interface RankAscensionPayload {
  id: string;
  from: Rank;
  to: Rank;
  day: number;
}

interface RankAscensionOverlayProps {
  ascension: RankAscensionPayload | null;
  onClose: () => void;
}

const AUTO_CLOSE_MS = 2600;

const ASCENSION_QUOTES: Record<Rank, string> = {
  学徒: "火焰只是起点。",
  炼金士: "你已听见汞与硫的回声。",
  大炼金士: "炉环与你同频，秩序开始臣服。",
  贤者候补: "赤红之门已在你面前开启。",
  至高炼金术师: "贤者之石与你同名。",
};

export function RankAscensionOverlay({ ascension, onClose }: RankAscensionOverlayProps) {
  useEffect(() => {
    if (!ascension) {
      return;
    }
    const timer = window.setTimeout(() => {
      onClose();
    }, AUTO_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [ascension, onClose]);

  if (!ascension) {
    return null;
  }

  return (
    <div className="rank-ascension-overlay">
      <div className="rank-ascension-overlay__backdrop" />
      <div className="rank-ascension-overlay__frame">
        <div className="cinematic-frame__halo" aria-hidden />
        <div className="cinematic-frame__seal" aria-hidden />
        <div className="cinematic-frame__ornament cinematic-frame__ornament--left" aria-hidden />
        <div className="cinematic-frame__ornament cinematic-frame__ornament--right" aria-hidden />
        <p className="rank-ascension-overlay__label">Ascension</p>
        <h3 className="rank-ascension-overlay__to">{ascension.to}</h3>
        <p className="rank-ascension-overlay__path">
          {ascension.from} → {ascension.to}
        </p>
        <p className="rank-ascension-overlay__quote">{ASCENSION_QUOTES[ascension.to]}</p>
        <p className="rank-ascension-overlay__day">第 {ascension.day} 日</p>
        <button
          type="button"
          onClick={onClose}
          className="game-button mt-3 rounded-lg border border-[#7a6338] bg-[#f0dfb8] px-3 py-1.5 text-sm hover:bg-[#e5cf9f]"
        >
          继续
        </button>
      </div>
    </div>
  );
}
