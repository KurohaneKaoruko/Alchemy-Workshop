"use client";

import Link from "next/link";
import { GrandWorkAgenda } from "@/features/game/components/GrandWorkAgenda";
import { RESOURCE_LABELS } from "@/features/game/data/resourceMeta";
import { useWorkshopGame } from "@/features/game/logic/useWorkshopGame";

function meterWidth(value: number, max = 100): string {
  const safe = Math.max(0, Math.min(max, value));
  return `${(safe / max) * 100}%`;
}

const STATIONS = [
  {
    href: "/workshop/story",
    eyebrow: "Chapter Desk",
    tone: "story",
    sigil: "叙",
    title: "剧情探索",
    description: "推进章节、触发异象，并在叙事中捕捉新的定式线索。",
    footer: "适合提升知识、名望与剧情进度。",
  },
  {
    href: "/workshop/alchemy",
    eyebrow: "Circle Hall",
    tone: "alchemy",
    sigil: "阵",
    title: "魔法阵炼金",
    description: "拖拽材料进入阵位，按等价交换规则显化产物，命中定式时稳定炼成。",
    footer: "今天想要赌一把高阶成果，就去这里。",
  },
  {
    href: "/workshop/journal",
    eyebrow: "Archive Vault",
    tone: "journal",
    sigil: "录",
    title: "炼金档案",
    description: "整理库存、回看日志与过场，把分散的线索重新编织成工坊知识。",
    footer: "适合复盘与确认下一步目标。",
  },
  {
    href: "/workshop/settings",
    eyebrow: "Control Desk",
    tone: "settings",
    sigil: "律",
    title: "工坊设置",
    description: "管理 AI 异象来源与仪式音效，让工坊在不同设备上保持稳定体验。",
    footer: "默认可完全离线游玩，只把 AI 作为叙事增强。",
  },
] as const;

export default function WorkshopPage() {
  const { game, statusText, runtimeAiConfig, resetGame } = useWorkshopGame();

  const reserveHighlights = Object.entries(game.resources)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4);
  const recentEntries = game.journal.slice(0, 3);

  return (
    <div className="workshop-page">
      <section className="workshop-hero-card reveal-up">
        <p className="workshop-hero-card__eyebrow">Today&apos;s Atelier</p>
        <h2 className="workshop-hero-card__title">今日工坊总览</h2>
        <p className="workshop-hero-card__lead">
          第 {game.day} 日的仪式已经展开。你可以在不同工作台之间切换，把探索、炼成与归档
          分配到同一张炼金日程里。
        </p>
        <div className="workshop-hero-card__meta">
          <span className="workshop-pill">当前境界：{game.rank}</span>
          <span className="workshop-pill">今日行动：{game.actionsLeft}/3</span>
          <span className="workshop-pill">精力：{game.vigor}/12</span>
          <span className="workshop-pill">
            {runtimeAiConfig ? `AI 异象：${runtimeAiConfig.model}` : "AI 异象：内置模式"}
          </span>
        </div>
        <div className="ritual-chip-row mt-4">
          <span className="ritual-chip">推荐工序：{game.actionsLeft > 1 ? "先探索，再炼成" : "优先确认今日产出"}</span>
          <span className="ritual-chip">已记录条目：{game.journal.length}</span>
        </div>
        <p className="ritual-note">{statusText}</p>
      </section>

      <GrandWorkAgenda game={game} currentRoute="overview" />

      <div className="workshop-page__grid xl:grid-cols-[minmax(0,1.15fr)_22rem]">
        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {STATIONS.map((station) => (
              <Link
                key={station.href}
                href={station.href}
                className={`ritual-link-card ritual-link-card--${station.tone} reveal-up reveal-delay-1`}
              >
                <span className="ritual-link-card__seal" aria-hidden>
                  {station.sigil}
                </span>
                <p className="ritual-link-card__eyebrow">{station.eyebrow}</p>
                <h3 className="ritual-link-card__title">{station.title}</h3>
                <p className="ritual-link-card__copy">{station.description}</p>
                <p className="ritual-link-card__footer">{station.footer}</p>
              </Link>
            ))}
          </div>

          <article className="ritual-card reveal-up reveal-delay-2 rounded-2xl p-5">
            <p className="ritual-card__eyebrow">Workshop Ledger</p>
            <h3 className="ritual-card__title">最近的工坊记录</h3>
            <div className="ritual-log-list mt-4">
              {recentEntries.map((entry) => (
                <div key={entry.id} className="ritual-log-item">
                  <p className="text-sm font-semibold text-[#3e2c14]">
                    第 {entry.day} 日 · {entry.title}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[#5a4220]/85">{entry.body}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <aside className="workshop-page__sidebar reveal-up reveal-delay-2">
          <section className="ritual-card rounded-2xl p-4">
            <p className="ritual-card__eyebrow">Character Snapshot</p>
            <h3 className="ritual-card__title">角色快照</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <dt>知识</dt>
                  <dd>{game.knowledge}</dd>
                </div>
                <div className="ritual-meter h-2">
                  <div className="ritual-meter__fill bg-[#6f8c4a]" style={{ width: meterWidth(game.knowledge) }} />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <dt>熟练</dt>
                  <dd>{game.mastery}</dd>
                </div>
                <div className="ritual-meter h-2">
                  <div className="ritual-meter__fill bg-[#4b7d86]" style={{ width: meterWidth(game.mastery) }} />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <dt>名望</dt>
                  <dd>{game.reputation}</dd>
                </div>
                <div className="ritual-meter h-2">
                  <div className="ritual-meter__fill bg-[#9b6f45]" style={{ width: meterWidth(game.reputation) }} />
                </div>
              </div>
            </dl>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span>行动点</span>
              <span className="flex items-center gap-1.5">
                {Array.from({ length: 3 }).map((_, index) => (
                  <span
                    key={`action-dot-${index}`}
                    className={`inline-block h-2.5 w-2.5 rounded-full ${
                      index < game.actionsLeft
                        ? "bg-[#6f8c4a] shadow-[0_0_8px_rgba(111,140,74,0.58)]"
                        : "bg-[#cabf9f]"
                    }`}
                  />
                ))}
              </span>
            </div>
          </section>

          <section className="ritual-card rounded-2xl p-4">
            <p className="ritual-card__eyebrow">Reserve Shelf</p>
            <h3 className="ritual-card__title">库存概览</h3>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {reserveHighlights.map(([key, value]) => (
                <div key={key} className="ritual-list__item flex items-center justify-between">
                  <span className="text-sm text-[#4d381c]">{RESOURCE_LABELS[key as keyof typeof game.resources]}</span>
                  <strong className="text-[#2e2111]">{value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="ritual-card rounded-2xl p-4">
            <p className="ritual-card__eyebrow">Workshop Control</p>
            <h3 className="ritual-card__title">快速操作</h3>
            <p className="ritual-card__copy">如果你想从头重新安排整个炼金日程，可以在这里重启工坊。</p>
            <button
              type="button"
              onClick={resetGame}
              className="game-button mt-4 w-full rounded-lg border border-[#6b5b37] bg-[#ead8aa] px-3 py-2 text-sm hover:bg-[#dfc993]"
            >
              重开工坊
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
