"use client";

import { useWorkshopGame } from "@/features/game/logic/useWorkshopGame";

export function WorkshopStatusMarquee() {
  const { game } = useWorkshopGame();

  return (
    <div className="workshop-status-marquee">
      <div className="workshop-status-marquee__item">
        <span className="workshop-status-marquee__label">日程</span>
        <strong className="workshop-status-marquee__value">第 {game.day} 日</strong>
      </div>
      <div className="workshop-status-marquee__item">
        <span className="workshop-status-marquee__label">境界</span>
        <strong className="workshop-status-marquee__value">{game.rank}</strong>
      </div>
      <div className="workshop-status-marquee__item">
        <span className="workshop-status-marquee__label">行动</span>
        <strong className="workshop-status-marquee__value">{game.actionsLeft}/3</strong>
      </div>
    </div>
  );
}
