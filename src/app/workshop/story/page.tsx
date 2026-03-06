"use client";

import { useEffect, useState } from "react";
import { ARCANE_FORMULAS, getNextFormulaGuidance } from "@/features/game/logic/alchemyCircle";
import {
  ChapterIntroOverlay,
  type ChapterIntroPayload,
} from "@/features/game/components/ChapterIntroOverlay";
import { EndingRitualOverlay } from "@/features/game/components/EndingRitualOverlay";
import { EventCinematicOverlay } from "@/features/game/components/EventCinematicOverlay";
import { RankAscensionOverlay } from "@/features/game/components/RankAscensionOverlay";
import { useWorkshopGame } from "@/features/game/logic/useWorkshopGame";
import { addCinematicArchiveEntry } from "@/features/storage/cinematicArchive";

const CHOICE_SIGILS = ["I", "II", "III", "IV"] as const;

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
  const clueEntries = game.journal
    .filter((entry) => entry.title.startsWith("定式线索："))
    .slice(0, 3);

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
      <section className="workshop-hero-card reveal-up">
        <p className="workshop-hero-card__eyebrow">Chapter Progression</p>
        <h2 className="workshop-hero-card__title">{chapter.title}</h2>
        <p className="workshop-hero-card__lead">{chapter.summary}</p>
        <div className="workshop-hero-card__meta">
          <span className="workshop-pill">第 {game.day} 日</span>
          <span className="workshop-pill">当前境界：{game.rank}</span>
          <span className="workshop-pill">今日行动：{game.actionsLeft}/3</span>
          <span className="workshop-pill">已解出定式：{discoveredCount}/{ARCANE_FORMULAS.length}</span>
        </div>
        <div className="ritual-chip-row mt-4">
          <span className="ritual-chip">章节气氛：{chapter.atmosphere.slice(0, 10)}...</span>
          <span className="ritual-chip">当前线索：{clueEntries.length > 0 ? clueEntries.length : "待发现"}</span>
        </div>
        <p className="ritual-note">{chapter.atmosphere}</p>
      </section>

      <div className="workshop-page__grid lg:grid-cols-[minmax(0,1.2fr)_22rem]">
        <section className="space-y-4 reveal-up">
          <article className="ritual-card rounded-2xl p-5">
            <p className="ritual-card__eyebrow">Current Situation</p>
            <h3 className="ritual-card__title">当前局势</h3>
            <p className="ritual-note">{statusText}</p>
            <div className="ritual-chip-row mt-4">
              <span className="ritual-chip">待选行动：{chapter.choices.length}</span>
              <span className="ritual-chip">
                执行权限：{busy ? "处理中" : game.actionsLeft > 0 && !game.ended ? "可行动" : "已封闭"}
              </span>
            </div>
            <div className="mt-4 grid gap-3">
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
              <p className="ritual-card__eyebrow">Latest Omen</p>
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
            <p className="ritual-card__eyebrow">Field Notes</p>
            <h3 className="ritual-card__title">当前阶段</h3>
            <div className="ritual-stat-grid mt-4">
              <div className="ritual-stat">
                <p className="ritual-stat__label">精力</p>
                <p className="ritual-stat__value">{game.vigor}</p>
              </div>
              <div className="ritual-stat">
                <p className="ritual-stat__label">知识</p>
                <p className="ritual-stat__value">{game.knowledge}</p>
              </div>
              <div className="ritual-stat">
                <p className="ritual-stat__label">熟练</p>
                <p className="ritual-stat__value">{game.mastery}</p>
              </div>
            </div>
          </section>

          <section className="ritual-card rounded-2xl p-4">
            <p className="ritual-card__eyebrow">Formula Guidance</p>
            <h3 className="ritual-card__title">定式线索进度</h3>
            {nextGuidance ? (
              <div className="ritual-list mt-4">
                <div className="ritual-list__item">
                  <p className="text-sm font-semibold text-[#3f2d16]">
                    下一目标：{nextGuidance.formulaName}（产物：{nextGuidance.outputLabel}）
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-7 text-[#5a4220]/85">
                    {nextGuidance.recommendations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
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
                暂无新线索。优先尝试“解读翠玉录”与“午夜冥想”来推进破译。
              </p>
            )}
          </section>

          <section className="ritual-card--dark rounded-2xl p-4">
            <p className="ritual-card__eyebrow">Emerald Tablet</p>
            <h3 className="ritual-card__title">翠玉录注记</h3>
            <p className="ritual-card__copy">
              “其下如其上，其上如其下，以成就一物之奇迹。”每一次探索都在校正你对这句箴言的理解。
            </p>
          </section>
        </aside>
      </div>

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
