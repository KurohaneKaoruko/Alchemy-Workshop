"use client";

import Link from "next/link";
import { RESOURCE_LABELS } from "@/features/game/data/resourceMeta";
import { buildFirstDayGuide } from "@/features/game/logic/firstDayGuide";
import { buildGrandWorkPlan } from "@/features/game/logic/grandWorkPlan";
import { buildWorkshopOverview } from "@/features/game/logic/workshopOverview";
import { useWorkshopGame } from "@/features/game/logic/useWorkshopGame";

function meterWidth(value: number, max = 100): string {
  const safe = Math.max(0, Math.min(max, value));
  return `${(safe / max) * 100}%`;
}

const STATIONS = [
  {
    href: "/workshop/story",
    eyebrow: "剧情工位",
    tone: "story",
    sigil: "叙",
    title: "剧情探索",
    description: "推进章节、触发异象，并在叙事中捕捉新的定式线索。",
    footer: "适合提升知识、名望与剧情进度。",
  },
  {
    href: "/workshop/alchemy",
    eyebrow: "炼金圆厅",
    tone: "alchemy",
    sigil: "阵",
    title: "魔法阵炼金",
    description: "拖拽材料进入阵位，按等价交换规则显化产物，命中定式时稳定炼成。",
    footer: "今天想要赌一把高阶成果，就去这里。",
  },
  {
    href: "/workshop/journal",
    eyebrow: "档案库",
    tone: "journal",
    sigil: "录",
    title: "炼金档案",
    description: "整理库存、回看日志与过场，把分散的线索重新编织成工坊知识。",
    footer: "适合复盘与确认下一步目标。",
  },
  {
    href: "/workshop/settings",
    eyebrow: "控制台",
    tone: "settings",
    sigil: "律",
    title: "工坊设置",
    description: "管理 AI 异象来源与仪式音效，让工坊在不同设备上保持稳定体验。",
    footer: "默认可完全离线游玩，只把 AI 作为叙事增强。",
  },
] as const;

const FORMULA_STATUS_LABELS = {
  locked_rank: "先晋升",
  missing_prerequisite: "补前置",
  missing_stats: "补属性",
  ready_to_research: "可破译",
  ready_to_transmute: "可炼成",
  complete: "已完成",
} as const;

const ENTRY_TYPE_LABELS = {
  story: "剧情",
  craft: "炼成",
  event: "异象",
  system: "系统",
} as const;

export default function WorkshopPage() {
  const { game, runtimeAiConfig, resetGame } = useWorkshopGame();
  const plan = buildGrandWorkPlan(game);
  const overview = buildWorkshopOverview(game);
  const firstDayGuide = buildFirstDayGuide(game);
  const readyRankSteps = plan.rankGoal.requirements.filter((item) => item.ready).length;
  const formulaIngredientsReady = plan.formulaGoal?.ingredients.filter((item) => item.remaining === 0).length ?? 0;
  const formulaIngredientsTotal = plan.formulaGoal?.ingredients.length ?? 0;
  const recommendedStationHref = plan.actionCue.href;
  const recommendedStation = STATIONS.find((station) => station.href === recommendedStationHref);

  const workshopStats = [
    {
      label: "精力",
      value: `${game.vigor}/12`,
      note: game.vigor <= 3 ? "适合收束整理" : game.vigor >= 9 ? "适合连续推进" : "节律平稳",
    },
    {
      label: "定式",
      value: String(game.discoveredFormulas.length),
      note: plan.formulaGoal ? `下一条：${plan.formulaGoal.formulaName}` : "当前无阻塞",
    },
    {
      label: "成品",
      value: String(game.completedRecipes.length),
      note: `${game.unlockedRecipes.length} 条配方已解锁`,
    },
    {
      label: "库存种类",
      value: String(overview.totalResourceKinds),
      note: `合计 ${overview.totalResourceUnits} 份材料`,
    },
  ] as const;

  const snapshotMeters = [
    {
      label: "知识",
      value: game.knowledge,
      tone: "bg-[#6f8c4a]",
      note:
        plan.rankGoal.requirements.find((item) => item.label === "知识")?.ready === true
          ? "晋升要求已达标"
          : "仍可继续补足",
    },
    {
      label: "熟练",
      value: game.mastery,
      tone: "bg-[#4b7d86]",
      note:
        plan.rankGoal.requirements.find((item) => item.label === "熟练")?.ready === true
          ? "阵式控制稳定"
          : "建议再做几次定向炼成",
    },
    {
      label: "名望",
      value: game.reputation,
      tone: "bg-[#9b6f45]",
      note:
        plan.rankGoal.requirements.find((item) => item.label === "名望")?.ready === true
          ? "外界认可已足够"
          : "剧情推进仍有收益",
    },
  ] as const;

  return (
    <div className="workshop-page">
      <section className="workshop-hero-card workshop-overview__hero reveal-up">
        <p className="workshop-hero-card__eyebrow">今日工坊</p>
        <div className="workshop-overview__hero-layout">
          <div className="workshop-overview__hero-copy">
            <h2 className="workshop-hero-card__title">今日工坊</h2>
            <p className="workshop-hero-card__lead">
              概览页现在只负责两件事：告诉你今天的大工重心，以及把你送到正确的工作台。更细的路线、库存和记录都收束到各自的页面里。
            </p>
            <div className="ritual-chip-row mt-4">
              <span className="ritual-chip">当前阶段：{plan.phase.eyebrow}</span>
              <span className="ritual-chip">
                {runtimeAiConfig ? `AI 异象：${runtimeAiConfig.model}` : "AI 异象：内置模式"}
              </span>
            </div>

            <div className="workshop-overview__focus-callout">
              <span className="workshop-overview__focus-label">今日主线</span>
              <strong className="workshop-overview__focus-title">{plan.phase.title}</strong>
              <p className="workshop-overview__focus-copy">{plan.daySignal}</p>
              <Link
                href={recommendedStationHref}
                className="game-button workshop-overview__focus-button inline-flex items-center justify-center rounded-xl border border-[#6b5b37] bg-[#ead8aa] px-4 py-2 text-sm font-semibold text-[#3f2d16] hover:bg-[#dfc993]"
              >
                {plan.actionCue.label}
              </Link>
            </div>
          </div>

          <div className="workshop-overview__hero-rail">
            <div className="workshop-overview__hero-stats">
              {workshopStats.map((item) => (
                <div key={item.label} className="workshop-overview__hero-stat">
                  <span className="workshop-overview__hero-stat-label">{item.label}</span>
                  <strong className="workshop-overview__hero-stat-value">{item.value}</strong>
                  <span className="workshop-overview__hero-stat-note">{item.note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="ritual-card reveal-up reveal-delay-1 rounded-2xl p-5">
        <div className="workshop-overview__section-head">
          <div className="min-w-0 flex-1">
            <p className="ritual-card__eyebrow">大工焦点</p>
            <h3 className="ritual-card__title">大工焦点</h3>
            <p className="ritual-card__copy">{plan.phase.summary}</p>
          </div>
          <div className="ritual-chip-row">
            <span className="ritual-chip">
              晋升准备：{readyRankSteps}/{plan.rankGoal.requirements.length}
            </span>
            <span className="ritual-chip">
              {plan.formulaGoal
                ? `定式状态：${FORMULA_STATUS_LABELS[plan.formulaGoal.status]}`
                : "定式状态：当前无阻塞"}
            </span>
          </div>
        </div>

        <div className="workshop-overview__focus-grid mt-4">
          <div className="workshop-overview__focus-item">
            <span className="workshop-overview__focus-item-label">推荐工作台</span>
            <strong className="workshop-overview__focus-item-value">
              {recommendedStation?.title ?? plan.actionCue.label}
            </strong>
            <p className="workshop-overview__focus-item-copy">{plan.actionCue.description}</p>
          </div>
          <div className="workshop-overview__focus-item">
            <span className="workshop-overview__focus-item-label">下一次晋升</span>
            <strong className="workshop-overview__focus-item-value">
              {plan.rankGoal.targetRank ? `${plan.rankGoal.currentRank} → ${plan.rankGoal.targetRank}` : "当前已封顶"}
            </strong>
            <p className="workshop-overview__focus-item-copy">
              {plan.rankGoal.targetRank ? `已有 ${readyRankSteps} 项条件就位。` : "现在更适合炼成与归档复盘。"}
            </p>
          </div>
          <div className="workshop-overview__focus-item workshop-overview__focus-item--wide">
            <span className="workshop-overview__focus-item-label">定式追踪</span>
            <strong className="workshop-overview__focus-item-value">
              {plan.formulaGoal ? plan.formulaGoal.formulaName : "当前没有新的定式阻塞"}
            </strong>
            <p className="workshop-overview__focus-item-copy">
              {plan.formulaGoal
                ? formulaIngredientsTotal > 0
                  ? `材料已就位 ${formulaIngredientsReady}/${formulaIngredientsTotal} 项，目标产物：${plan.formulaGoal.outputLabel}。`
                  : `当前状态：${FORMULA_STATUS_LABELS[plan.formulaGoal.status]}。`
                : "可以按自己的节奏推进探索、炼成或档案整理。"}
            </p>
          </div>
        </div>
      </section>

      {firstDayGuide ? (
        <section className="ritual-card reveal-up reveal-delay-1 rounded-2xl p-5">
          <div className="workshop-overview__section-head">
            <div className="min-w-0 flex-1">
              <p className="ritual-card__eyebrow">首日引导</p>
              <h3 className="ritual-card__title">{firstDayGuide.headline}</h3>
              <p className="ritual-card__copy">{firstDayGuide.summary}</p>
            </div>
            <Link
              href={firstDayGuide.currentHref}
              className="game-button inline-flex min-h-10 items-center justify-center rounded-xl border border-[#6b5b37] bg-[#ead8aa] px-4 py-2 text-sm font-semibold text-[#3f2d16] hover:bg-[#dfc993]"
            >
              {firstDayGuide.currentActionLabel}
            </Link>
          </div>

          <div className="workshop-overview__focus-grid mt-4">
            {firstDayGuide.milestone ? (
              <article className="workshop-overview__focus-item workshop-overview__focus-item--wide">
                <span className="workshop-overview__focus-item-label">阶段完成反馈</span>
                <strong className="workshop-overview__focus-item-value">{firstDayGuide.milestone.title}</strong>
                <p className="workshop-overview__focus-item-copy">{firstDayGuide.milestone.summary}</p>
              </article>
            ) : null}
            {firstDayGuide.steps.map((step) => (
              <article key={step.id} className="workshop-overview__focus-item">
                <span className="workshop-overview__focus-item-label">{step.status === "done" ? "已完成" : step.status === "active" ? "当前步骤" : "待执行"}</span>
                <strong className="workshop-overview__focus-item-value">{step.title}</strong>
                <p className="workshop-overview__focus-item-copy">{step.description}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="ritual-card reveal-up reveal-delay-2 rounded-2xl p-5">
        <div className="workshop-overview__section-head">
          <div className="min-w-0 flex-1">
            <p className="ritual-card__eyebrow">工作台入口</p>
            <h3 className="ritual-card__title">选择工作台</h3>
            <p className="ritual-card__copy">概览页只保留入口，不再在这里重复每个子页面已经会展示的细节。</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {STATIONS.map((station) => {
            const isRecommended = station.href === recommendedStationHref;

            return (
              <Link
                key={station.href}
                href={station.href}
                className={`ritual-link-card ritual-link-card--${station.tone} workshop-overview__station ${
                  isRecommended ? "workshop-overview__station--recommended" : ""
                }`}
              >
                <span className="ritual-link-card__seal" aria-hidden>
                  {station.sigil}
                </span>
                <p className="ritual-link-card__eyebrow">{station.eyebrow}</p>
                <h3 className="ritual-link-card__title">{station.title}</h3>
                <p className="ritual-link-card__copy">{station.description}</p>
                <div className="workshop-overview__station-tags">
                  {isRecommended ? <span className="workshop-overview__badge">推荐</span> : null}
                  <span className="workshop-overview__station-hint">
                    {isRecommended ? plan.actionCue.title : station.footer}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="workshop-page__grid xl:grid-cols-[minmax(0,1.08fr)_22rem]">
        <section className="space-y-4">
          <article className="ritual-card reveal-up reveal-delay-2 rounded-2xl p-5">
            <div className="workshop-overview__section-head">
              <div className="min-w-0 flex-1">
                <p className="ritual-card__eyebrow">工坊记录</p>
                <h3 className="ritual-card__title">最近记录</h3>
                <p className="ritual-card__copy">只保留最近两条，完整日志与过场回放放到档案页查看。</p>
              </div>
              <Link
                href="/workshop/journal"
                className="game-button inline-flex min-h-10 items-center justify-center rounded-xl border border-[#8f7448]/20 bg-[rgba(255,252,245,0.82)] px-4 py-2 text-sm font-semibold text-[#4f3a1c] hover:bg-[rgba(246,237,214,0.92)]"
              >
                前往炼金档案
              </Link>
            </div>

            <div className="ritual-log-list mt-4">
              {overview.recentEntries.length > 0 ? (
                overview.recentEntries.map((entry) => (
                  <div key={entry.id} className="ritual-log-item">
                    <div className="workshop-overview__entry-head">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#3e2c14]">
                          第 {entry.day} 日 · {entry.title}
                        </p>
                        <p className="workshop-overview__entry-meta">{ENTRY_TYPE_LABELS[entry.type]}</p>
                      </div>
                      <span className="workshop-overview__entry-tag">摘要</span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-[#5a4220]/85">{entry.preview}</p>
                  </div>
                ))
              ) : (
                <div className="workshop-overview__empty-state">还没有新的工坊记录，先去推进一次剧情或炼成吧。</div>
              )}
            </div>
          </article>
        </section>

        <aside className="workshop-page__sidebar reveal-up reveal-delay-3">
          <section className="ritual-card rounded-2xl p-4">
            <p className="ritual-card__eyebrow">工坊状态</p>
            <h3 className="ritual-card__title">工坊状态</h3>
            <div className="workshop-overview__meter-list mt-4">
              {snapshotMeters.map((item) => (
                <div key={item.label} className="workshop-overview__meter-card">
                  <div className="workshop-overview__meter-head">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                  <div className="ritual-meter mt-2 h-2">
                    <div className={`ritual-meter__fill ${item.tone}`} style={{ width: meterWidth(item.value) }} />
                  </div>
                  <p className="workshop-overview__meter-note">{item.note}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="ritual-card rounded-2xl p-4">
            <p className="ritual-card__eyebrow">材料总览</p>
            <h3 className="ritual-card__title">库存与控制</h3>
            <div className="ritual-list mt-4">
              {overview.reserveHighlights.map(({ key, value }) => (
                <div key={key} className="ritual-list__item flex items-center justify-between gap-3">
                  <span className="text-sm text-[#4d381c]">{RESOURCE_LABELS[key]}</span>
                  <strong className="text-[#2e2111]">{value}</strong>
                </div>
              ))}
            </div>
            <p className="workshop-overview__resource-note">
              当前共有 {overview.totalResourceKinds} 种材料，总量 {overview.totalResourceUnits}。如需完整整理，请前往档案页。
            </p>
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
