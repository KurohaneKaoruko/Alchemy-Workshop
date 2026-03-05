"use client";

import Link from "next/link";
import { useWorkshopGame } from "@/features/game/logic/useWorkshopGame";

function meterWidth(value: number, max = 100): string {
  const safe = Math.max(0, Math.min(max, value));
  return `${(safe / max) * 100}%`;
}

export default function WorkshopPage() {
  const { game, statusText, runtimeAiConfig, resetGame } = useWorkshopGame();

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="game-panel reveal-up rounded-2xl border border-[#6f5a31]/40 bg-[#f9f2df]/92 p-5 shadow-[0_8px_18px_rgba(70,48,16,0.18)]">
        <h2 className="text-2xl font-semibold">工坊总览</h2>
        <p className="mt-2 text-sm leading-7 opacity-85">
          当前进度：第 {game.day} 日，{game.rank}。你可以在不同工作台之间切换，不再把所有操作堆在一页。
        </p>
        <p className="mt-3 rounded-lg border border-[#7f704e]/40 bg-[#fff8e8] p-3 text-sm leading-7">
          {statusText}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            href="/workshop/story"
            className="game-action-card rounded-xl border border-[#6b5b37]/55 bg-[#fff8e6] p-3 hover:bg-[#f0e0bc]"
          >
            <p className="font-semibold">剧情探索</p>
            <p className="mt-1 text-sm opacity-80">推进章节、触发随机事件并提升境界。</p>
          </Link>
          <Link
            href="/workshop/alchemy"
            className="game-action-card rounded-xl border border-[#6b5b37]/55 bg-[#fff8e6] p-3 hover:bg-[#f0e0bc]"
          >
            <p className="font-semibold">魔法阵炼金</p>
            <p className="mt-1 text-sm opacity-80">自由投料，阵纹会自动显化同价值产物。</p>
          </Link>
          <Link
            href="/workshop/journal"
            className="game-action-card rounded-xl border border-[#6b5b37]/55 bg-[#fff8e6] p-3 hover:bg-[#f0e0bc]"
          >
            <p className="font-semibold">炼金档案</p>
            <p className="mt-1 text-sm opacity-80">查看库存、属性、近期事件与日志。</p>
          </Link>
          <Link
            href="/workshop/settings"
            className="game-action-card rounded-xl border border-[#6b5b37]/55 bg-[#fff8e6] p-3 hover:bg-[#f0e0bc]"
          >
            <p className="font-semibold">AI 设置</p>
            <p className="mt-1 text-sm opacity-80">配置模型；失败时自动回退内置事件。</p>
          </Link>
        </div>
      </section>

      <aside className="space-y-4 reveal-up reveal-delay-2">
        <section className="game-panel rounded-2xl border border-[#6f5a31]/40 bg-[#f9f2df]/92 p-4 shadow-[0_8px_18px_rgba(70,48,16,0.16)]">
          <h3 className="text-lg font-semibold">角色快照</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <dt>知识</dt>
                <dd>{game.knowledge}</dd>
              </div>
              <div className="stat-meter h-2">
                <div className="stat-meter__fill bg-[#6f8c4a]" style={{ width: meterWidth(game.knowledge) }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <dt>熟练</dt>
                <dd>{game.mastery}</dd>
              </div>
              <div className="stat-meter h-2">
                <div className="stat-meter__fill bg-[#4b7d86]" style={{ width: meterWidth(game.mastery) }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <dt>名望</dt>
                <dd>{game.reputation}</dd>
              </div>
              <div className="stat-meter h-2">
                <div className="stat-meter__fill bg-[#9b6f45]" style={{ width: meterWidth(game.reputation) }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <dt>精力</dt>
                <dd>{game.vigor}/12</dd>
              </div>
              <div className="stat-meter h-2">
                <div className="stat-meter__fill bg-[#a15b47]" style={{ width: meterWidth(game.vigor, 12) }} />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <dt>行动点</dt>
              <dd className="flex items-center gap-1.5">
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
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs opacity-75">
            AI 随机事件：{runtimeAiConfig ? `已启用（${runtimeAiConfig.model}）` : "未启用（内置模式）"}
          </p>
        </section>

        <section className="game-panel rounded-2xl border border-[#6f5a31]/40 bg-[#f9f2df]/92 p-4 shadow-[0_8px_18px_rgba(70,48,16,0.16)]">
          <h3 className="text-lg font-semibold">快速操作</h3>
          <button
            type="button"
            onClick={resetGame}
            className="game-button mt-3 w-full rounded-lg border border-[#6b5b37] bg-[#ead8aa] px-3 py-2 text-sm hover:bg-[#dfc993]"
          >
            重开工坊
          </button>
          <p className="mt-2 text-xs leading-6 opacity-75">会清除当前存档，重新从学徒开始。</p>
        </section>
      </aside>
    </div>
  );
}
