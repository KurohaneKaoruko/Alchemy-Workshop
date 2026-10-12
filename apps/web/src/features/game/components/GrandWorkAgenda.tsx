"use client";

import Link from "next/link";
import { buildGrandWorkPlan } from "@/features/game/logic/grandWorkPlan";
import type { GameState } from "@/features/game/types";

type AgendaRoute = "overview" | "story" | "alchemy" | "journal" | "settings";

interface GrandWorkAgendaProps {
  game: GameState;
  currentRoute: AgendaRoute;
  mobileVariant?: "default" | "compact";
  desktopVariant?: "default" | "collapsed";
}

const STATUS_LABELS = {
  locked_rank: "需先晋升",
  missing_prerequisite: "缺前置",
  missing_stats: "补属性",
  ready_to_research: "可破译",
  ready_to_transmute: "可炼成",
  complete: "已完成",
} as const;

const ROUTE_LINKS: Array<{
  id: Exclude<AgendaRoute, "overview">;
  href: "/workshop/story" | "/workshop/alchemy" | "/workshop/journal" | "/workshop/settings";
  label: string;
  hint: string;
}> = [
  {
    id: "story",
    href: "/workshop/story",
    label: "剧情探索",
    hint: "追线索与属性",
  },
  {
    id: "alchemy",
    href: "/workshop/alchemy",
    label: "魔法阵炼金",
    hint: "定向投料与显化",
  },
  {
    id: "journal",
    href: "/workshop/journal",
    label: "炼金档案",
    hint: "复盘日志与过场",
  },
  {
    id: "settings",
    href: "/workshop/settings",
    label: "工坊设置",
    hint: "校准 AI 与音效",
  },
];

function getMeterWidth(current: number, target: number): string {
  if (target <= 0) {
    return "100%";
  }

  const ratio = Math.max(0, Math.min(1, current / target));
  if (ratio === 0) {
    return "0%";
  }

  return `${Math.max(ratio * 100, 12)}%`;
}

function getStatusTone(status: keyof typeof STATUS_LABELS): string {
  switch (status) {
    case "ready_to_research":
    case "ready_to_transmute":
    case "complete":
      return "border-[#6f8c4a]/35 bg-[#eef4dd] text-[#405c20]";
    case "missing_stats":
    case "missing_prerequisite":
      return "border-[#b48d54]/35 bg-[#fbf0d8] text-[#7a5220]";
    case "locked_rank":
    default:
      return "border-[#8d7a54]/35 bg-[#f4ead2] text-[#6a5432]";
  }
}

export function GrandWorkAgenda({
  game,
  currentRoute,
  mobileVariant = "default",
  desktopVariant = "default",
}: GrandWorkAgendaProps) {
  const plan = buildGrandWorkPlan(game);
  const rankReadyCount = plan.rankGoal.requirements.filter((item) => item.ready).length;
  const formulaIngredientCount = plan.formulaGoal?.ingredients.length ?? 0;
  const formulaIngredientsReadyCount =
    plan.formulaGoal?.ingredients.filter((item) => item.remaining === 0).length ?? 0;
  const useCompactMobile = mobileVariant === "compact";
  const useCollapsedDesktop = desktopVariant === "collapsed";

  return (
    <section
      className={`grand-work-agenda ritual-card reveal-up rounded-2xl p-5 ${
        useCompactMobile ? "grand-work-agenda--compact-mobile" : ""
      }`}
    >
      <div className="grand-work-agenda__head flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="ritual-card__eyebrow">大工导览</p>
          <h3 className="grand-work-agenda__title ritual-card__title">大工导览</h3>
          <p className="grand-work-agenda__summary ritual-card__copy">{plan.phase.summary}</p>
        </div>
        <div className="ritual-chip-row">
          <span className="ritual-chip">{plan.phase.eyebrow}</span>
          <span className="ritual-chip">当前境界：{game.rank}</span>
          <span className="ritual-chip">今日行动：{game.actionsLeft}/3</span>
        </div>
      </div>

      {useCompactMobile ? (
        <div className="grand-work-agenda__mobile sm:hidden">
          <div className="grand-work-agenda__mobile-glance">
            <div className="grand-work-agenda__mobile-kpi">
              <span className="grand-work-agenda__mobile-kpi-label">晋升</span>
              <strong className="grand-work-agenda__mobile-kpi-value">
                {plan.rankGoal.targetRank ? `${plan.rankGoal.currentRank} -> ${plan.rankGoal.targetRank}` : "已封顶"}
              </strong>
              <span className="grand-work-agenda__mobile-kpi-meta">
                {rankReadyCount}/{plan.rankGoal.requirements.length} 条已就位
              </span>
            </div>
            <div className="grand-work-agenda__mobile-kpi">
              <span className="grand-work-agenda__mobile-kpi-label">定式</span>
              <strong className="grand-work-agenda__mobile-kpi-value">
                {plan.formulaGoal ? plan.formulaGoal.formulaName : "当前无阻塞"}
              </strong>
              <span className="grand-work-agenda__mobile-kpi-meta">
                {plan.formulaGoal
                  ? `${formulaIngredientsReadyCount}/${formulaIngredientCount} 味已齐`
                  : "可自由推进"}
              </span>
            </div>
          </div>

          <article className="grand-work-agenda__mobile-action">
            <p className="grand-work-agenda__mobile-label">下一步</p>
            <h4 className="grand-work-agenda__mobile-action-title">{plan.actionCue.title}</h4>
            <p className="grand-work-agenda__mobile-action-copy">{plan.daySignal}</p>
            <Link
              href={plan.actionCue.href}
              className="game-button grand-work-agenda__mobile-action-button"
            >
              {plan.actionCue.label}
            </Link>
          </article>

          <div className="grand-work-agenda__mobile-routes">
            {ROUTE_LINKS.map((route) => {
              const isActive = currentRoute === route.id;
              const isRecommended = plan.actionCue.href === route.href;
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  className={`grand-work-agenda__mobile-route ${
                    isActive ? "grand-work-agenda__mobile-route--active" : ""
                  }`}
                >
                  <span className="grand-work-agenda__mobile-route-title">{route.label}</span>
                  <span className="grand-work-agenda__mobile-route-meta">
                    {isActive ? "当前" : isRecommended ? "推荐" : route.hint}
                  </span>
                </Link>
              );
            })}
          </div>

          <details className="grand-work-agenda__mobile-details">
            <summary className="grand-work-agenda__mobile-details-summary">展开境界与定式细节</summary>
            <div className="grand-work-agenda__mobile-details-body">
              <section className="grand-work-agenda__mobile-details-section">
                <div className="grand-work-agenda__mobile-details-head">
                  <p className="grand-work-agenda__mobile-label">晋升阶梯</p>
                  <span className="grand-work-agenda__mobile-badge">
                    {plan.rankGoal.targetRank ? `${plan.rankGoal.currentRank} -> ${plan.rankGoal.targetRank}` : "已封顶"}
                  </span>
                </div>
                <div className="grand-work-agenda__mobile-meter-list">
                  {plan.rankGoal.requirements.map((item) => (
                    <div key={item.label} className="grand-work-agenda__mobile-meter-card">
                      <div className="grand-work-agenda__mobile-meter-row">
                        <span>{item.label}</span>
                        <span>
                          {item.current}/{item.target}
                        </span>
                      </div>
                      <div className="ritual-meter mt-2 h-2">
                        <div
                          className={`ritual-meter__fill ${item.ready ? "bg-[#6f8c4a]" : "bg-[#b48d54]"}`}
                          style={{ width: getMeterWidth(item.current, item.target) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {plan.rankGoal.recipeRequirement ? (
                  <p className="grand-work-agenda__mobile-note">
                    关键门槛：{plan.rankGoal.recipeRequirement.label}
                    {plan.rankGoal.recipeRequirement.completed ? " 已完成" : " 待炼成"}
                  </p>
                ) : null}
              </section>

              <section className="grand-work-agenda__mobile-details-section">
                <div className="grand-work-agenda__mobile-details-head">
                  <p className="grand-work-agenda__mobile-label">定式轨迹</p>
                  {plan.formulaGoal ? (
                    <span className={`grand-work-agenda__mobile-badge ${getStatusTone(plan.formulaGoal.status)}`}>
                      {STATUS_LABELS[plan.formulaGoal.status]}
                    </span>
                  ) : null}
                </div>
                <p className="grand-work-agenda__mobile-note">
                  {plan.formulaGoal
                    ? `目标产物：${plan.formulaGoal.outputLabel}`
                    : "当前没有额外定式门槛，可以把重心放回探索或整理。"}
                </p>
                {plan.formulaGoal ? (
                  <>
                    <div className="grand-work-agenda__mobile-recommendations">
                      {plan.formulaGoal.recommendations.slice(0, 2).map((item) => (
                        <p key={item} className="grand-work-agenda__mobile-note grand-work-agenda__mobile-note--highlight">
                          {item}
                        </p>
                      ))}
                    </div>
                    {plan.formulaGoal.ingredients.length > 0 ? (
                      <div className="grand-work-agenda__mobile-ingredients">
                        {plan.formulaGoal.ingredients.map((item) => (
                          <div key={item.key} className="grand-work-agenda__mobile-ingredient">
                            <span>{item.label}</span>
                            <span>
                              {item.current}/{item.required}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </section>
            </div>
          </details>
        </div>
      ) : null}

      {useCollapsedDesktop ? (
        <details className="grand-work-agenda__desktop-fold hidden sm:block">
          <summary className="grand-work-agenda__desktop-fold-summary">
            <div className="grand-work-agenda__desktop-fold-copy">
              <p className="grand-work-agenda__desktop-fold-label">导览摘要</p>
              <p className="grand-work-agenda__desktop-fold-title">{plan.actionCue.title}</p>
              <p className="grand-work-agenda__desktop-fold-note">{plan.daySignal}</p>
            </div>
            <div className="grand-work-agenda__desktop-fold-meta">
              <span className="grand-work-agenda__desktop-fold-chip">{plan.actionCue.label}</span>
              <span className="grand-work-agenda__desktop-fold-chip">
                境界 {rankReadyCount}/{plan.rankGoal.requirements.length}
              </span>
              {plan.formulaGoal ? (
                <span className="grand-work-agenda__desktop-fold-chip">
                  {STATUS_LABELS[plan.formulaGoal.status]}
                </span>
              ) : null}
            </div>
          </summary>

          <div className="grand-work-agenda__desktop-fold-body mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.95fr_1fr]">
      <article className="rounded-2xl border border-[#8f7448]/20 bg-[rgba(255,251,241,0.76)] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]">
        <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[#8b6d39]/72">
          当前工序
        </p>
        <h4 className="mt-2 text-xl text-[#2f220f]">{plan.phase.title}</h4>
        <p className="mt-3 text-sm leading-7 text-[#5c4522]/82">{plan.daySignal}</p>

        <div className="mt-4 rounded-2xl border border-[#8f7448]/18 bg-[rgba(246,236,208,0.62)] p-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[#7f6231]/68">
            推荐下一步
          </p>
          <p className="mt-2 text-base font-semibold text-[#352512]">{plan.actionCue.title}</p>
          <p className="mt-1 text-sm leading-7 text-[#604927]/78">{plan.actionCue.description}</p>
          <Link
            href={plan.actionCue.href}
            className="game-button mt-3 inline-flex min-h-10 items-center justify-center rounded-xl border border-[#6b5b37] bg-[#ead8aa] px-4 py-2 text-sm font-semibold text-[#3f2d16] hover:bg-[#dfc993]"
          >
            {plan.actionCue.label}
          </Link>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {ROUTE_LINKS.map((route) => {
            const isActive = currentRoute === route.id;
            const isRecommended = plan.actionCue.href === route.href;
            return (
              <Link
                key={route.href}
                href={route.href}
                className={`rounded-2xl border px-3 py-3 text-sm shadow-[inset_0_0_0_1px_rgba(255,255,255,0.24)] ${
                  isActive
                    ? "border-[#8f6e3b]/45 bg-[#f4e4bb]"
                    : "border-[#8f7448]/18 bg-[rgba(255,252,245,0.68)] hover:bg-[rgba(246,237,214,0.9)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#372711]">{route.label}</span>
                  {isRecommended ? (
                    <span className="rounded-full border border-[#6f8c4a]/30 bg-[#edf4de] px-2 py-0.5 text-[11px] text-[#476121]">
                      推荐
                    </span>
                  ) : null}
                  {isActive ? (
                    <span className="rounded-full border border-[#8f6e3b]/30 bg-[#fbf1d8] px-2 py-0.5 text-[11px] text-[#785225]">
                      当前
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-xs leading-6 text-[#68512b]/74">{route.hint}</p>
              </Link>
            );
          })}
        </div>
      </article>

      <article className="rounded-2xl border border-[#8f7448]/20 bg-[rgba(255,251,241,0.76)] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[#8b6d39]/72">
              晋升阶梯
            </p>
            <h4 className="mt-2 text-xl text-[#2f220f]">
              {plan.rankGoal.targetRank ? `迈向「${plan.rankGoal.targetRank}」` : "境界已封顶"}
            </h4>
          </div>
          <span className="rounded-full border border-[#8d7a54]/26 bg-[#f7efdd] px-2.5 py-1 text-xs text-[#684f29]">
            {plan.rankGoal.currentRank}
            {plan.rankGoal.targetRank ? ` → ${plan.rankGoal.targetRank}` : ""}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {plan.rankGoal.requirements.map((item) => (
            <div key={item.label} className="rounded-2xl border border-[#8f7448]/14 bg-[rgba(255,253,248,0.72)] p-3">
              <div className="flex items-center justify-between gap-3 text-sm text-[#4e381a]">
                <span>{item.label}</span>
                <span>
                  {item.current}/{item.target}
                  {item.remaining > 0 ? ` · 还差 ${item.remaining}` : " · 已达成"}
                </span>
              </div>
              <div className="ritual-meter mt-2 h-2.5">
                <div
                  className={`ritual-meter__fill ${item.ready ? "bg-[#6f8c4a]" : "bg-[#b48d54]"}`}
                  style={{ width: getMeterWidth(item.current, item.target) }}
                />
              </div>
            </div>
          ))}
        </div>

        {plan.rankGoal.recipeRequirement ? (
          <div className="mt-4 rounded-2xl border border-[#8f7448]/16 bg-[rgba(246,236,208,0.58)] p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-[#7f6231]/68">晋升门槛</p>
            <p className="mt-2 text-sm font-semibold text-[#352512]">
              {plan.rankGoal.recipeRequirement.label}
            </p>
            <p className="mt-1 text-sm leading-7 text-[#604927]/78">
              {plan.rankGoal.recipeRequirement.completed
                ? "关键炼成已经完成。"
                : "完成这次关键炼成后，才能正式跨入下一境界。"}
            </p>
          </div>
        ) : null}
      </article>

      <article className="rounded-2xl border border-[#8f7448]/20 bg-[rgba(255,251,241,0.76)] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[#8b6d39]/72">
              定式轨迹
            </p>
            <h4 className="mt-2 text-xl text-[#2f220f]">
              {plan.formulaGoal ? plan.formulaGoal.formulaName : "当前无阻塞定式"}
            </h4>
            <p className="mt-1 text-sm text-[#68512b]/78">
              {plan.formulaGoal
                ? `目标产物：${plan.formulaGoal.outputLabel}`
                : "当前没有额外定式门槛，可以按节奏自由推进。"}
            </p>
          </div>
          {plan.formulaGoal ? (
            <span
              className={`rounded-full border px-2.5 py-1 text-xs ${getStatusTone(plan.formulaGoal.status)}`}
            >
              {STATUS_LABELS[plan.formulaGoal.status]}
            </span>
          ) : null}
        </div>

        {plan.formulaGoal ? (
          <>
            <div className="mt-4 grid gap-2">
              {plan.formulaGoal.recommendations.slice(0, 2).map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[#8f7448]/14 bg-[rgba(255,253,248,0.72)] px-3 py-2.5 text-sm leading-7 text-[#573f1d]/82"
                >
                  {item}
                </div>
              ))}
            </div>

            {plan.formulaGoal.ingredients.length > 0 ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {plan.formulaGoal.ingredients.map((item) => (
                  <div
                    key={item.key}
                    className={`rounded-2xl border px-3 py-3 text-sm ${
                      item.remaining === 0
                        ? "border-[#6f8c4a]/28 bg-[#eef4de]"
                        : "border-[#b48d54]/20 bg-[rgba(255,248,236,0.74)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-[#372711]">{item.label}</span>
                      <span className="text-xs text-[#6e532a]/74">
                        {item.current}/{item.required}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-6 text-[#6b532d]/78">
                      {item.remaining > 0 ? `库存还差 ${item.remaining}` : "库存已足量"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-7 text-[#5c4522]/78">
                当前阶段不再需要单独核对定式材料。
              </p>
            )}
          </>
        ) : (
          <p className="mt-4 text-sm leading-7 text-[#5c4522]/78">
            你已经越过当前阶段的定式阻塞，可以把重心放在稳定推进或回顾档案上。
          </p>
        )}
      </article>
          </div>
        </details>
      ) : (
        <div className={`mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.95fr_1fr] ${useCompactMobile ? "hidden sm:grid" : ""}`}>
        <article className="rounded-2xl border border-[#8f7448]/20 bg-[rgba(255,251,241,0.76)] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]">
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[#8b6d39]/72">
            当前工序
          </p>
          <h4 className="mt-2 text-xl text-[#2f220f]">{plan.phase.title}</h4>
          <p className="mt-3 text-sm leading-7 text-[#5c4522]/82">{plan.daySignal}</p>

          <div className="mt-4 rounded-2xl border border-[#8f7448]/18 bg-[rgba(246,236,208,0.62)] p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-[#7f6231]/68">
              推荐下一步
            </p>
            <p className="mt-2 text-base font-semibold text-[#352512]">{plan.actionCue.title}</p>
            <p className="mt-1 text-sm leading-7 text-[#604927]/78">{plan.actionCue.description}</p>
            <Link
              href={plan.actionCue.href}
              className="game-button mt-3 inline-flex min-h-10 items-center justify-center rounded-xl border border-[#6b5b37] bg-[#ead8aa] px-4 py-2 text-sm font-semibold text-[#3f2d16] hover:bg-[#dfc993]"
            >
              {plan.actionCue.label}
            </Link>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {ROUTE_LINKS.map((route) => {
              const isActive = currentRoute === route.id;
              const isRecommended = plan.actionCue.href === route.href;
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  className={`rounded-2xl border px-3 py-3 text-sm shadow-[inset_0_0_0_1px_rgba(255,255,255,0.24)] ${
                    isActive
                      ? "border-[#8f6e3b]/45 bg-[#f4e4bb]"
                      : "border-[#8f7448]/18 bg-[rgba(255,252,245,0.68)] hover:bg-[rgba(246,237,214,0.9)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#372711]">{route.label}</span>
                    {isRecommended ? (
                      <span className="rounded-full border border-[#6f8c4a]/30 bg-[#edf4de] px-2 py-0.5 text-[11px] text-[#476121]">
                        推荐
                      </span>
                    ) : null}
                    {isActive ? (
                      <span className="rounded-full border border-[#8f6e3b]/30 bg-[#fbf1d8] px-2 py-0.5 text-[11px] text-[#785225]">
                        当前
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs leading-6 text-[#68512b]/74">{route.hint}</p>
                </Link>
              );
            })}
          </div>
        </article>

        <article className="rounded-2xl border border-[#8f7448]/20 bg-[rgba(255,251,241,0.76)] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[#8b6d39]/72">
                晋升阶梯
              </p>
              <h4 className="mt-2 text-xl text-[#2f220f]">
                {plan.rankGoal.targetRank ? `迈向「${plan.rankGoal.targetRank}」` : "境界已封顶"}
              </h4>
            </div>
            <span className="rounded-full border border-[#8d7a54]/26 bg-[#f7efdd] px-2.5 py-1 text-xs text-[#684f29]">
              {plan.rankGoal.currentRank}
              {plan.rankGoal.targetRank ? ` → ${plan.rankGoal.targetRank}` : ""}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {plan.rankGoal.requirements.map((item) => (
              <div key={item.label} className="rounded-2xl border border-[#8f7448]/14 bg-[rgba(255,253,248,0.72)] p-3">
                <div className="flex items-center justify-between gap-3 text-sm text-[#4e381a]">
                  <span>{item.label}</span>
                  <span>
                    {item.current}/{item.target}
                    {item.remaining > 0 ? ` · 还差 ${item.remaining}` : " · 已达成"}
                  </span>
                </div>
                <div className="ritual-meter mt-2 h-2.5">
                  <div
                    className={`ritual-meter__fill ${item.ready ? "bg-[#6f8c4a]" : "bg-[#b48d54]"}`}
                    style={{ width: getMeterWidth(item.current, item.target) }}
                  />
                </div>
              </div>
            ))}
          </div>

          {plan.rankGoal.recipeRequirement ? (
            <div className="mt-4 rounded-2xl border border-[#8f7448]/16 bg-[rgba(246,236,208,0.58)] p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-[#7f6231]/68">晋升门槛</p>
              <p className="mt-2 text-sm font-semibold text-[#352512]">
                {plan.rankGoal.recipeRequirement.label}
              </p>
              <p className="mt-1 text-sm leading-7 text-[#604927]/78">
                {plan.rankGoal.recipeRequirement.completed
                  ? "关键炼成已经完成。"
                  : "完成这次关键炼成后，才能正式跨入下一境界。"}
              </p>
            </div>
          ) : null}
        </article>

        <article className="rounded-2xl border border-[#8f7448]/20 bg-[rgba(255,251,241,0.76)] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[#8b6d39]/72">
                定式轨迹
              </p>
              <h4 className="mt-2 text-xl text-[#2f220f]">
                {plan.formulaGoal ? plan.formulaGoal.formulaName : "当前无阻塞定式"}
              </h4>
              <p className="mt-1 text-sm text-[#68512b]/78">
                {plan.formulaGoal
                  ? `目标产物：${plan.formulaGoal.outputLabel}`
                  : "当前没有额外定式门槛，可以按节奏自由推进。"}
              </p>
            </div>
            {plan.formulaGoal ? (
              <span
                className={`rounded-full border px-2.5 py-1 text-xs ${getStatusTone(plan.formulaGoal.status)}`}
              >
                {STATUS_LABELS[plan.formulaGoal.status]}
              </span>
            ) : null}
          </div>

          {plan.formulaGoal ? (
            <>
              <div className="mt-4 grid gap-2">
                {plan.formulaGoal.recommendations.slice(0, 2).map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-[#8f7448]/14 bg-[rgba(255,253,248,0.72)] px-3 py-2.5 text-sm leading-7 text-[#573f1d]/82"
                  >
                    {item}
                  </div>
                ))}
              </div>

              {plan.formulaGoal.ingredients.length > 0 ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {plan.formulaGoal.ingredients.map((item) => (
                    <div
                      key={item.key}
                      className={`rounded-2xl border px-3 py-3 text-sm ${
                        item.remaining === 0
                          ? "border-[#6f8c4a]/28 bg-[#eef4de]"
                          : "border-[#b48d54]/20 bg-[rgba(255,248,236,0.74)]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-[#372711]">{item.label}</span>
                        <span className="text-xs text-[#6e532a]/74">
                          {item.current}/{item.required}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-6 text-[#6b532d]/78">
                        {item.remaining > 0 ? `库存还差 ${item.remaining}` : "库存已足量"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-7 text-[#5c4522]/78">
                  当前阶段不再需要单独核对定式材料。
                </p>
              )}
            </>
          ) : (
            <p className="mt-4 text-sm leading-7 text-[#5c4522]/78">
              你已经越过当前阶段的定式阻塞，可以把重心放在稳定推进或回顾档案上。
            </p>
          )}
        </article>
        </div>
      )}
    </section>
  );
}
