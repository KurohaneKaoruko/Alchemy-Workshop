"use client";

import { useEffect, useState } from "react";
import { ARCANE_FORMULAS } from "@/features/game/logic/alchemyCircle";
import { getNextFormulaGuidance } from "@/features/game/logic/alchemyCircle";
import {
  ChapterIntroOverlay,
  type ChapterIntroPayload,
} from "@/features/game/components/ChapterIntroOverlay";
import { EndingRitualOverlay } from "@/features/game/components/EndingRitualOverlay";
import { EventCinematicOverlay } from "@/features/game/components/EventCinematicOverlay";
import { RankAscensionOverlay } from "@/features/game/components/RankAscensionOverlay";
import { useWorkshopGame } from "@/features/game/logic/useWorkshopGame";
import { addCinematicArchiveEntry } from "@/features/storage/cinematicArchive";

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
  const discoveredCount = ARCANE_FORMULAS.filter((formula) =>
    discoveredSet.has(formula.id),
  ).length;
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
    <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
      <section className="game-panel reveal-up rounded-2xl border border-[#6f5a31]/40 bg-[#f9f2df]/92 p-5 shadow-[0_8px_18px_rgba(70,48,16,0.18)]">
        <h2 className="text-2xl font-semibold">{chapter.title}</h2>
        <p className="mt-2 text-sm leading-7 opacity-90">{chapter.summary}</p>
        <p className="mt-3 rounded-lg border border-[#7f704e]/35 bg-[#fff8e8] p-3 text-sm leading-7">
          {chapter.atmosphere}
        </p>
        <p className="mt-3 rounded-lg border border-[#7f704e]/35 bg-[#fff8e8] p-3 text-sm leading-7">
          {statusText}
        </p>

        <div className="mt-4 grid gap-2">
          {chapter.choices.map((choice) => (
            <button
                key={choice.id}
                type="button"
                onClick={() => doStoryChoice(choice.id)}
                disabled={busy || game.actionsLeft <= 0 || game.ended}
                className="game-action-card rounded-xl border border-[#6b5b37]/55 bg-[#fff8e6] px-3 py-2 text-left text-sm hover:bg-[#f1e1bf] disabled:cursor-not-allowed disabled:opacity-60"
              >
              <p className="font-semibold">{choice.label}</p>
              <p className="mt-1 opacity-85">{choice.flavorText}</p>
            </button>
          ))}
        </div>

        {game.lastEvent ? (
          <article className="mt-4 reveal-up rounded-lg border border-[#6b5b37]/45 bg-[#fff7e0] p-3 text-sm leading-7">
            <p className="font-semibold">
              随机事件 · {game.lastEvent.source === "ai" ? "AI" : "内置"}
            </p>
            <p className="mt-1">{game.lastEvent.title}</p>
            <p className="mt-1 opacity-85">{game.lastEvent.body}</p>
            <p className="mt-1 text-[#6e5c38]">{game.lastEvent.outcomeSummary}</p>
          </article>
        ) : null}
      </section>

      <aside className="space-y-4 reveal-up reveal-delay-2">
        <section className="game-panel rounded-2xl border border-[#6f5a31]/40 bg-[#f9f2df]/92 p-4 shadow-[0_8px_18px_rgba(70,48,16,0.16)]">
          <h3 className="text-lg font-semibold">当前阶段</h3>
          <p className="mt-2 text-sm leading-7">
            第 {game.day} 日 · {game.rank}
          </p>
          <p className="text-sm leading-7">今日行动：{game.actionsLeft}/3</p>
          <p className="text-sm leading-7">精力：{game.vigor}</p>
        </section>

        <section className="game-panel rounded-2xl border border-[#6f5a31]/40 bg-[#f9f2df]/92 p-4 shadow-[0_8px_18px_rgba(70,48,16,0.16)]">
          <h3 className="text-lg font-semibold">翠玉录注记</h3>
          <p className="mt-2 text-sm leading-7 opacity-85">
            “其下如其上，其上如其下，以成就一物之奇迹。”在探索页的每次行动都在调整你对这句话的理解。
          </p>
        </section>

        <section className="game-panel rounded-2xl border border-[#6f5a31]/40 bg-[#f9f2df]/92 p-4 shadow-[0_8px_18px_rgba(70,48,16,0.16)]">
          <h3 className="text-lg font-semibold">定式线索进度</h3>
          <p className="mt-2 text-sm leading-7">
            已破译 {discoveredCount} / {ARCANE_FORMULAS.length} 条炼金定式。
          </p>
          {nextGuidance ? (
            <div className="mt-2 rounded border border-[#8b7954]/35 bg-[#fff8e8] p-2 text-sm">
              <p className="font-semibold">
                下一目标：{nextGuidance.formulaName}（产物：{nextGuidance.outputLabel}）
              </p>
              <ul className="mt-1 list-disc pl-5">
                {nextGuidance.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-2 rounded border border-[#8b7954]/35 bg-[#fff8e8] p-2 text-sm">
              所有定式均已破译，接下来专注终局炼成即可。
            </p>
          )}
          {clueEntries.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm">
              {clueEntries.map((entry) => (
                <li key={entry.id} className="rounded border border-[#8b7954]/35 bg-[#fff8e8] px-2 py-1">
                  {entry.title.replace("定式线索：", "")}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm leading-7 opacity-75">
              暂无新线索。优先尝试“解读翠玉录”与“夜半冥想”以推进定式破译。
            </p>
          )}
        </section>
      </aside>
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
      <ChapterIntroOverlay
        intro={chapterIntro}
        onClose={() => setChapterIntro(null)}
      />
    </div>
  );
}
