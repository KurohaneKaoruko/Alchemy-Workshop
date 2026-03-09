"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ARCANE_FORMULAS, getNextFormulaGuidance } from "@/features/game/logic/alchemyCircle";
import {
  ChapterIntroOverlay,
  type ChapterIntroPayload,
} from "@/features/game/components/ChapterIntroOverlay";
import { EndingRitualOverlay } from "@/features/game/components/EndingRitualOverlay";
import { EventCinematicOverlay } from "@/features/game/components/EventCinematicOverlay";
import { FirstDayGuideHint } from "@/features/game/components/FirstDayGuideHint";
import { GrandWorkAgenda } from "@/features/game/components/GrandWorkAgenda";
import { RankAscensionOverlay } from "@/features/game/components/RankAscensionOverlay";
import { buildFirstDayGuide } from "@/features/game/logic/firstDayGuide";
import { buildGrandWorkPlan } from "@/features/game/logic/grandWorkPlan";
import { useWorkshopGame } from "@/features/game/logic/useWorkshopGame";
import { addCinematicArchiveEntry } from "@/features/storage/cinematicArchive";

const CHOICE_SIGILS = ["I", "II", "III", "IV"] as const;

const GUIDANCE_STATUS_LABELS = {
  locked_rank: "先晋升",
  missing_prerequisite: "补前置",
  missing_stats: "补属性",
  ready_to_research: "可破译",
} as const;

const ROUTE_LABELS = {
  "/workshop/story": "前往剧情探索",
  "/workshop/alchemy": "前往魔法阵炼金",
  "/workshop/journal": "前往炼金档案",
} as const;

export default function StoryPage() {
  const {
    game,
    chapter,
    busy,
    statusText,
    cinematicEvent,
    rankAscensionCinematic,
    endingCinematic,
    doStoryChoice,
    dismissCinematicEvent,
    dismissRankAscensionCinematic,
    dismissEndingCinematic,
  } = useWorkshopGame();
  const [chapterIntro, setChapterIntro] = useState<ChapterIntroPayload | null>(null);
  const discoveredSet = new Set(game.discoveredFormulas);
  const discoveredCount = ARCANE_FORMULAS.filter((formula) => discoveredSet.has(formula.id)).length;
  const nextGuidance = getNextFormulaGuidance(game);
  const firstDayGuide = buildFirstDayGuide(game);
  const plan = buildGrandWorkPlan(game);
  const clueEntries = game.journal
    .filter((entry) => entry.title.startsWith("定式线索："))
    .slice(0, 3);
  const immediateChoiceLabel =
    busy || game.ended ? "暂不可执行" : game.actionsLeft > 0 ? "可立即执行" : "等待明日恢复";
  const storySignals = [
    {
      label: "行动",
      value: `${game.actionsLeft}/3`,
      note: busy ? "处理中" : game.ended ? "终局已封存" : "仍可推进",
    },
    {
      label: "定式",
      value: `${discoveredCount}/${ARCANE_FORMULAS.length}`,
      note: nextGuidance ? `下一条：${nextGuidance.formulaName}` : "已全部解析",
    },
    {
      label: "线索",
      value: String(clueEntries.length),
      note: clueEntries.length > 0 ? clueEntries[0].title.replace("定式线索：", "") : "尚待发现",
    },
    {
      label: "去向",
      value: ROUTE_LABELS[plan.actionCue.href],
      note: plan.actionCue.title,
    },
  ] as const;
  const storySnapshot = [
    {
      label: "精力",
      value: game.vigor,
      note: game.vigor <= 3 ? "适合短线行动" : "还可连续推进",
    },
    {
      label: "知识",
      value: game.knowledge,
      note: nextGuidance?.status === "missing_stats" ? "仍需补足" : "足以支撑当前阶段",
    },
    {
      label: "熟练",
      value: game.mastery,
      note: nextGuidance?.status === "missing_stats" ? "建议再做几轮练习" : "阵式稳定",
    },
    {
      label: "名望",
      value: game.reputation,
      note: plan.rankGoal.targetRank ? `晋升目标：${plan.rankGoal.targetRank}` : "已抵达上限",
    },
  ] as const;

  useEffect(() => {
    const introPayload: ChapterIntroPayload = {
      id: `${chapter.id}_${game.rank}`,
      title: chapter.title,
      summary: chapter.summary,
      rank: game.rank,
    };

    let shouldShow = true;
    if (typeof window !== "undefined") {
      const storageKey = `alchemy_intro_seen_${introPayload.id}`;
      try {
        const hasSeen = window.sessionStorage.getItem(storageKey);
        if (hasSeen) {
          shouldShow = false;
        } else {
          window.sessionStorage.setItem(storageKey, "1");
        }
      } catch {
        shouldShow = true;
      }
    }

    if (!shouldShow) {
      return;
    }

    const timer = window.setTimeout(() => {
      setChapterIntro(introPayload);
      addCinematicArchiveEntry({
        id: `chapter_intro_${introPayload.id}`,
        kind: "chapter_intro",
        title: introPayload.title,
        subtitle: introPayload.rank,
        body: introPayload.summary,
        day: game.day,
        source: "system",
        payload: {
          id: introPayload.id,
          title: introPayload.title,
          summary: introPayload.summary,
          rank: introPayload.rank,
        },
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [chapter.id, chapter.summary, chapter.title, game.rank, game.day]);

  return (
    <div className="workshop-page">
      <section className="workshop-hero-card workshop-hero-card--mobile-tight story-page__hero reveal-up">
        <p className="workshop-hero-card__eyebrow">章节推进</p>
        <div className="story-page__hero-layout">
          <div className="story-page__hero-copy">
            <h2 className="workshop-hero-card__title">{chapter.title}</h2>
            <p className="workshop-hero-card__lead">{chapter.summary}</p>
            <div className="workshop-hero-card__meta">
              <span className="workshop-pill">第 {game.day} 日</span>
              <span className="workshop-pill">当前境界：{game.rank}</span>
              <span className="workshop-pill">今日行动：{game.actionsLeft}/3</span>
              <span className="workshop-pill">已解出定式：{discoveredCount}/{ARCANE_FORMULAS.length}</span>
            </div>

            <div className="story-page__focus-card">
              <span className="story-page__focus-label">章节焦点</span>
              <strong className="story-page__focus-title">{plan.actionCue.title}</strong>
              <p className="story-page__focus-copy">{statusText}</p>
              <p className="story-page__focus-atmosphere">{chapter.atmosphere}</p>
              <div className="story-page__focus-actions">
                {plan.actionCue.href !== "/workshop/story" ? (
                  <Link
                    href={plan.actionCue.href}
                    className="game-button inline-flex min-h-10 items-center justify-center rounded-xl border border-[#6b5b37] bg-[#ead8aa] px-4 py-2 text-sm font-semibold text-[#3f2d16] hover:bg-[#dfc993]"
                  >
                    {ROUTE_LABELS[plan.actionCue.href]}
                  </Link>
                ) : (
                  <span className="story-page__focus-chip">当前最佳工序仍在本章</span>
                )}
                <span className="story-page__focus-chip">{immediateChoiceLabel}</span>
              </div>
            </div>
          </div>

          <div className="story-page__hero-rail">
            <div className="story-page__hero-stats">
              {storySignals.map((item) => (
                <div key={item.label} className="story-page__hero-stat">
                  <span className="story-page__hero-stat-label">{item.label}</span>
                  <strong className="story-page__hero-stat-value">{item.value}</strong>
                  <span className="story-page__hero-stat-note">{item.note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <FirstDayGuideHint guide={firstDayGuide} currentStepId="story" />

      <div className="workshop-page__grid lg:grid-cols-[minmax(0,1.2fr)_22rem]">
        <section className="space-y-4 reveal-up">
          <article className="ritual-card ritual-card--mobile-tight rounded-2xl p-5">
            <div className="story-page__section-head">
              <div className="min-w-0 flex-1">
                <p className="ritual-card__eyebrow">当前行动</p>
                <h3 className="ritual-card__title">行动选项</h3>
                <p className="ritual-card__copy">这里只保留当前章节可执行的选择，局势与定式提示已经收束到页头和侧栏。</p>
              </div>
              <div className="ritual-chip-row">
                <span className="ritual-chip">待选行动：{chapter.choices.length}</span>
                <span className="ritual-chip">执行权限：{immediateChoiceLabel}</span>
              </div>
            </div>

            <div className="story-page__choices-grid mt-4">
              {chapter.choices.map((choice, index) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => doStoryChoice(choice.id)}
                  disabled={busy || game.actionsLeft <= 0 || game.ended}
                  className="ritual-link-card ritual-link-card--story story-choice-card text-left disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="story-choice-card__seal" aria-hidden>
                    {CHOICE_SIGILS[index] ?? `0${index + 1}`}
                  </span>
                  <p className="ritual-link-card__eyebrow">Action Option</p>
                  <h4 className="ritual-link-card__title">{choice.label}</h4>
                  <p className="ritual-link-card__copy">{choice.flavorText}</p>
                  <div className="story-choice-card__footer">
                    <span>消耗 1 行动</span>
                    <span>{game.actionsLeft > 0 && !busy ? "立即执行" : "等待恢复"}</span>
                  </div>
                </button>
              ))}
            </div>
          </article>

          {game.lastEvent ? (
            <article className="ritual-card--dark rounded-2xl p-5">
              <p className="ritual-card__eyebrow">最近异象</p>
              <h3 className="ritual-card__title">最近一次异象</h3>
              <div className="ritual-log-item mt-4">
                <p className="text-sm font-semibold text-[#3f2d16]">
                  {game.lastEvent.title} · {game.lastEvent.source === "ai" ? "AI" : "内置"}
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#5a4220]/85">{game.lastEvent.body}</p>
                <p className="mt-2 text-sm text-[#6e5c38]">{game.lastEvent.outcomeSummary}</p>
              </div>
            </article>
          ) : null}
        </section>

        <aside className="workshop-page__sidebar reveal-up reveal-delay-2">
          <section className="ritual-card rounded-2xl p-4">
            <p className="ritual-card__eyebrow">剧情快照</p>
            <h3 className="ritual-card__title">剧情快照</h3>
            <div className="story-page__snapshot-grid mt-4">
              {storySnapshot.map((item) => (
                <div key={item.label} className="story-page__snapshot-item">
                  <span className="story-page__snapshot-label">{item.label}</span>
                  <strong className="story-page__snapshot-value">{item.value}</strong>
                  <span className="story-page__snapshot-note">{item.note}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="ritual-card rounded-2xl p-4">
            <p className="ritual-card__eyebrow">线索追踪</p>
            <h3 className="ritual-card__title">定式线索</h3>
            {nextGuidance ? (
              <div className="story-page__guidance-card mt-4">
                <div className="story-page__guidance-head">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#3f2d16]">
                      下一目标：{nextGuidance.formulaName}
                    </p>
                    <p className="mt-1 text-sm text-[#6c542c]/80">目标产物：{nextGuidance.outputLabel}</p>
                  </div>
                  <span className="story-page__guidance-badge">
                    {GUIDANCE_STATUS_LABELS[nextGuidance.status]}
                  </span>
                </div>

                <div className="ritual-list mt-3">
                  {nextGuidance.recommendations.slice(0, 2).map((item) => (
                    <div key={item} className="ritual-list__item">
                      <p className="text-sm leading-7 text-[#5a4220]/85">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="ritual-note">所有定式均已解析，接下来只需专注于终局炼成。</p>
            )}

            {clueEntries.length > 0 ? (
              <div className="ritual-list mt-3">
                {clueEntries.map((entry) => (
                  <div key={entry.id} className="ritual-list__item">
                    <p className="text-sm text-[#4f3b1d]">{entry.title.replace("定式线索：", "")}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-7 text-[#5b4726]/78">
                暂无新线索。可优先尝试“解读翠玉录”或“午夜冥想”。
              </p>
            )}
          </section>

          <section className="ritual-card--dark rounded-2xl p-4">
            <p className="ritual-card__eyebrow">章节氛围</p>
            <h3 className="ritual-card__title">章节注记</h3>
            <p className="ritual-card__copy">{chapter.atmosphere}</p>
            <p className="story-page__tablet-quote">
              “其下如其上，其上如其下，以成就一物之奇迹。”每一次探索都在校正你对这句箴言的理解。
            </p>
          </section>
        </aside>
      </div>

      <GrandWorkAgenda
        game={game}
        currentRoute="story"
        mobileVariant="compact"
        desktopVariant="collapsed"
      />

      <EventCinematicOverlay
        key={cinematicEvent?.id ?? "cinematic-none"}
        event={cinematicEvent}
        onClose={dismissCinematicEvent}
      />
      <RankAscensionOverlay
        key={rankAscensionCinematic?.id ?? "ascension-none"}
        ascension={rankAscensionCinematic}
        onClose={dismissRankAscensionCinematic}
      />
      <EndingRitualOverlay
        key={endingCinematic?.id ?? "ending-none"}
        ending={endingCinematic}
        onClose={dismissEndingCinematic}
      />
      <ChapterIntroOverlay intro={chapterIntro} onClose={() => setChapterIntro(null)} />
    </div>
  );
}
