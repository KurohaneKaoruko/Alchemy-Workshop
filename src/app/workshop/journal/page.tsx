"use client";

import { useMemo, useState } from "react";
import {
  ChapterIntroOverlay,
  type ChapterIntroPayload,
} from "@/features/game/components/ChapterIntroOverlay";
import {
  EndingRitualOverlay,
  type EndingRitualPayload,
} from "@/features/game/components/EndingRitualOverlay";
import { EventCinematicOverlay } from "@/features/game/components/EventCinematicOverlay";
import {
  RankAscensionOverlay,
  type RankAscensionPayload,
} from "@/features/game/components/RankAscensionOverlay";
import { RESOURCE_LABELS, RESOURCE_VALUES } from "@/features/game/data/resourceMeta";
import { useWorkshopGame } from "@/features/game/logic/useWorkshopGame";
import type { LastEventDigest, Rank, ResourceKey } from "@/features/game/types";
import {
  clearCinematicArchive,
  loadCinematicArchive,
  type CinematicArchiveEntry,
} from "@/features/storage/cinematicArchive";

const KIND_LABELS: Record<CinematicArchiveEntry["kind"], string> = {
  chapter_intro: "章节开场",
  event: "随机事件",
  rank_ascension: "境界晋升",
  ending: "终局仪式",
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

function toRank(value: unknown): Rank | null {
  if (
    value === "学徒" ||
    value === "炼金士" ||
    value === "大炼金士" ||
    value === "贤者候补" ||
    value === "至高炼金术师"
  ) {
    return value;
  }
  return null;
}

function eventFromEntry(entry: CinematicArchiveEntry): LastEventDigest | null {
  const payload = entry.payload;
  if (!payload) {
    return null;
  }
  const id = payload.eventId;
  const title = payload.title;
  const body = payload.body;
  const source = payload.source;
  const outcomeSummary = payload.outcomeSummary;
  if (
    typeof id !== "string" ||
    typeof title !== "string" ||
    typeof body !== "string" ||
    (source !== "ai" && source !== "fallback") ||
    typeof outcomeSummary !== "string"
  ) {
    return null;
  }
  return { id, title, body, source, outcomeSummary };
}

function chapterFromEntry(entry: CinematicArchiveEntry): ChapterIntroPayload | null {
  const payload = entry.payload;
  if (!payload) {
    return null;
  }
  const id = payload.id;
  const title = payload.title;
  const summary = payload.summary;
  const rank = payload.rank;
  if (
    typeof id !== "string" ||
    typeof title !== "string" ||
    typeof summary !== "string" ||
    typeof rank !== "string"
  ) {
    return null;
  }
  return { id, title, summary, rank };
}

function rankFromEntry(entry: CinematicArchiveEntry): RankAscensionPayload | null {
  const payload = entry.payload;
  if (!payload) {
    return null;
  }
  const from = toRank(payload.from);
  const to = toRank(payload.to);
  const day = payload.day;
  if (!from || !to || typeof day !== "number") {
    return null;
  }
  return {
    id: entry.id,
    from,
    to,
    day,
  };
}

function endingFromEntry(entry: CinematicArchiveEntry): EndingRitualPayload | null {
  const payload = entry.payload;
  if (!payload) {
    return null;
  }
  const day = payload.day;
  const ending = payload.ending;
  if (typeof day !== "number" || ending !== "philosopher_stone") {
    return null;
  }
  return {
    id: entry.id,
    day,
    ending,
  };
}

export default function JournalPage() {
  const { game } = useWorkshopGame();
  const [entries, setEntries] = useState<CinematicArchiveEntry[]>(() => loadCinematicArchive());
  const [status, setStatus] = useState("");
  const [eventReplay, setEventReplay] = useState<LastEventDigest | null>(null);
  const [chapterReplay, setChapterReplay] = useState<ChapterIntroPayload | null>(null);
  const [rankReplay, setRankReplay] = useState<RankAscensionPayload | null>(null);
  const [endingReplay, setEndingReplay] = useState<EndingRitualPayload | null>(null);

  const grouped = useMemo(() => {
    return entries.reduce<Record<CinematicArchiveEntry["kind"], number>>(
      (acc, entry) => {
        acc[entry.kind] += 1;
        return acc;
      },
      {
        chapter_intro: 0,
        event: 0,
        rank_ascension: 0,
        ending: 0,
      },
    );
  }, [entries]);

  function onReplay(entry: CinematicArchiveEntry) {
    setEventReplay(null);
    setChapterReplay(null);
    setRankReplay(null);
    setEndingReplay(null);

    if (entry.kind === "event") {
      const parsed = eventFromEntry(entry);
      if (!parsed) {
        setStatus("该事件记录缺少可重播数据。");
        return;
      }
      setStatus(`重播：${entry.title}`);
      setEventReplay(parsed);
      return;
    }

    if (entry.kind === "chapter_intro") {
      const parsed = chapterFromEntry(entry);
      if (!parsed) {
        setStatus("该章节记录缺少可重播数据。");
        return;
      }
      setStatus(`重播：${entry.title}`);
      setChapterReplay(parsed);
      return;
    }

    if (entry.kind === "rank_ascension") {
      const parsed = rankFromEntry(entry);
      if (!parsed) {
        setStatus("该晋升记录缺少可重播数据。");
        return;
      }
      setStatus(`重播：${entry.title}`);
      setRankReplay(parsed);
      return;
    }

    const parsed = endingFromEntry(entry);
    if (!parsed) {
      setStatus("该终局记录缺少可重播数据。");
      return;
    }
    setStatus(`重播：${entry.title}`);
    setEndingReplay(parsed);
  }

  function onClearArchive() {
    clearCinematicArchive();
    setEntries([]);
    setStatus("过场档案已清空。");
  }

  return (
    <div className="workshop-page">
      <section className="workshop-hero-card reveal-up">
        <p className="workshop-hero-card__eyebrow">Archive & Chronicle</p>
        <h2 className="workshop-hero-card__title">炼金档案</h2>
        <p className="workshop-hero-card__lead">
          这里收纳你的工坊日志、材料统计与所有过场回放。每一次失败参数、每一次异象回应，
          都会在这里留下可追溯的痕迹。
        </p>
        <div className="workshop-hero-card__meta">
          <span className="workshop-pill">当前境界：{game.rank}</span>
          <span className="workshop-pill">第 {game.day} 日</span>
          <span className="workshop-pill">日志条目：{game.journal.length}</span>
          <span className="workshop-pill">过场记录：{entries.length}</span>
        </div>
        <div className="ritual-chip-row mt-4">
          <span className="ritual-chip">最近回放：{entries[0]?.title ?? "暂无"}</span>
          <span className="ritual-chip">库存种类：{Object.keys(game.resources).length}</span>
        </div>
      </section>

      <div className="workshop-page__grid lg:grid-cols-[0.92fr_minmax(0,1.08fr)]">
        <section className="workshop-page__sidebar reveal-up">
          <article className="ritual-card rounded-2xl p-4">
            <p className="ritual-card__eyebrow">Character Ledger</p>
            <h3 className="ritual-card__title">炼金属性</h3>
            <div className="ritual-stat-grid mt-4 sm:grid-cols-2">
              <div className="ritual-stat">
                <p className="ritual-stat__label">境界</p>
                <p className="ritual-stat__value">{game.rank}</p>
              </div>
              <div className="ritual-stat">
                <p className="ritual-stat__label">行动</p>
                <p className="ritual-stat__value">{game.actionsLeft}/3</p>
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
          </article>

          <article className="ritual-card rounded-2xl p-4">
            <p className="ritual-card__eyebrow">Reserve Value</p>
            <h3 className="ritual-card__title">材料库存与价值</h3>
            <div className="ritual-list mt-4 sm:grid-cols-2">
              {Object.entries(game.resources).map(([key, value]) => (
                <div key={key} className="ritual-list__item">
                  <p className="text-xs text-[#70552a]/80">
                    {RESOURCE_LABELS[key as ResourceKey]}（价值 {RESOURCE_VALUES[key as ResourceKey]}）
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[#2f220f]">{value}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="ritual-card rounded-2xl p-4">
            <p className="ritual-card__eyebrow">Replay Gallery</p>
            <h3 className="ritual-card__title">过场回顾统计</h3>
            <div className="ritual-stat-grid mt-4">
              <div className="ritual-stat flex items-center justify-between">
                <p className="ritual-stat__label">章节开场</p>
                <p className="text-lg font-semibold text-[#2f220f]">{grouped.chapter_intro}</p>
              </div>
              <div className="ritual-stat flex items-center justify-between">
                <p className="ritual-stat__label">随机事件</p>
                <p className="text-lg font-semibold text-[#2f220f]">{grouped.event}</p>
              </div>
              <div className="ritual-stat flex items-center justify-between">
                <p className="ritual-stat__label">境界晋升</p>
                <p className="text-lg font-semibold text-[#2f220f]">{grouped.rank_ascension}</p>
              </div>
              <div className="ritual-stat flex items-center justify-between">
                <p className="ritual-stat__label">终局仪式</p>
                <p className="text-lg font-semibold text-[#2f220f]">{grouped.ending}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const loaded = loadCinematicArchive();
                  setEntries(loaded);
                  setStatus(loaded.length > 0 ? "档案已刷新。" : "暂时没有可回放的记录。");
                }}
                className="game-button rounded border border-[#6b5b37] bg-[#ead8aa] px-2.5 py-1 text-xs hover:bg-[#dfc993]"
              >
                刷新档案
              </button>
              <button
                type="button"
                onClick={onClearArchive}
                className="game-button rounded border border-[#7a5442] bg-[#f0d6c8] px-2.5 py-1 text-xs hover:bg-[#e7c2ad]"
              >
                清空档案
              </button>
            </div>
            <p className="mt-3 text-sm leading-7 text-[#5b4726]/78">
              {status || (entries.length > 0 ? "可在右侧列表里重播过场。" : "先推进剧情或完成炼成，档案才会逐渐充实。")}
            </p>
          </article>
        </section>

        <section className="space-y-4">
          <article className="ritual-card reveal-up reveal-delay-2 rounded-2xl p-5">
            <p className="ritual-card__eyebrow">Workshop Journal</p>
            <h2 className="ritual-card__title">工坊日志</h2>
            <p className="ritual-card__copy">最近的剧情推进、随机事件和炼金记录都会写入这里。</p>
            <div className="ritual-log-list mt-4 max-h-none overflow-visible pr-0 lg:max-h-[30rem] lg:overflow-auto lg:pr-1">
              {game.journal.map((entry) => (
                <div key={entry.id} className="ritual-log-item">
                  <p className="text-sm font-semibold text-[#3d2b14]">
                    第 {entry.day} 日 · [{entry.type}] {entry.title}
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#5a4220]/85">{entry.body}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="ritual-card reveal-up reveal-delay-3 rounded-2xl p-5">
            <p className="ritual-card__eyebrow">Cinematic Records</p>
            <h2 className="ritual-card__title">过场记录列表</h2>
            <div className="ritual-log-list mt-4 max-h-none overflow-visible pr-0 lg:max-h-[24rem] lg:overflow-auto lg:pr-1">
              {entries.map((entry) => (
                <div key={entry.id} className="ritual-log-item">
                  <p className="text-sm font-semibold text-[#3d2b14]">
                    [{KIND_LABELS[entry.kind]}] {entry.title}
                  </p>
                  {entry.subtitle ? <p className="mt-1 text-sm text-[#5a4220]/80">{entry.subtitle}</p> : null}
                  <p className="mt-2 max-h-14 overflow-hidden text-sm leading-7 text-[#5a4220]/78">{entry.body}</p>
                  <p className="mt-2 text-xs text-[#756241]/72">
                    第 {entry.day} 日 · {formatDate(entry.createdAt)}
                  </p>
                  <button
                    type="button"
                    onClick={() => onReplay(entry)}
                    className="game-button mt-3 rounded border border-[#6b5b37] bg-[#efe3c4] px-2.5 py-1 text-xs hover:bg-[#e6d3a7]"
                  >
                    重播过场
                  </button>
                </div>
              ))}
              {entries.length === 0 ? (
                <div className="ritual-log-item">
                  <p className="text-sm text-[#5a4220]/78">暂无可重播过场。</p>
                </div>
              ) : null}
            </div>
          </article>
        </section>
      </div>

      <EventCinematicOverlay
        key={eventReplay?.id ?? "replay-event-none"}
        event={eventReplay}
        onClose={() => setEventReplay(null)}
      />
      <ChapterIntroOverlay
        key={chapterReplay?.id ?? "replay-chapter-none"}
        intro={chapterReplay}
        onClose={() => setChapterReplay(null)}
      />
      <RankAscensionOverlay
        key={rankReplay?.id ?? "replay-rank-none"}
        ascension={rankReplay}
        onClose={() => setRankReplay(null)}
      />
      <EndingRitualOverlay
        key={endingReplay?.id ?? "replay-ending-none"}
        ending={endingReplay}
        onClose={() => setEndingReplay(null)}
      />
    </div>
  );
}
