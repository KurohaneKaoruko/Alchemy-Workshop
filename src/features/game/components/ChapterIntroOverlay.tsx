"use client";

import { useEffect } from "react";

export interface ChapterIntroPayload {
  id: string;
  title: string;
  summary: string;
  rank: string;
}

interface ChapterIntroOverlayProps {
  intro: ChapterIntroPayload | null;
  onClose: () => void;
}

const AUTO_CLOSE_MS = 2800;

export function ChapterIntroOverlay({ intro, onClose }: ChapterIntroOverlayProps) {
  useEffect(() => {
    if (!intro) {
      return;
    }
    const timer = window.setTimeout(() => {
      onClose();
    }, AUTO_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [intro, onClose]);

  if (!intro) {
    return null;
  }

  return (
    <div className="chapter-intro-overlay">
      <div className="chapter-intro-overlay__backdrop" />
      <div className="chapter-intro-overlay__frame">
        <p className="chapter-intro-overlay__label">Chapter Entry</p>
        <h2 className="chapter-intro-overlay__title">{intro.title}</h2>
        <p className="chapter-intro-overlay__rank">{intro.rank}</p>
        <p className="chapter-intro-overlay__summary">{intro.summary}</p>
        <button
          type="button"
          onClick={onClose}
          className="game-button mt-3 rounded-lg border border-[#7a6338] bg-[#f0dfb8] px-3 py-1.5 text-sm hover:bg-[#e5cf9f]"
        >
          跳过
        </button>
      </div>
    </div>
  );
}
