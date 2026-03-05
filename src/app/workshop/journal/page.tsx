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
    value === "最强炼金术师"
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
  const [entries, setEntries] = useState<CinematicArchiveEntry[]>(() =>
    loadCinematicArchive(),
  );
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
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="space-y-4 reveal-up">
        <article className="game-panel rounded-2xl border border-[#6f5a31]/40 bg-[#f9f2df]/92 p-4 shadow-[0_8px_18px_rgba(70,48,16,0.16)]">
          <h2 className="text-xl font-semibold">炼金属性</h2>
          <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
            <dt>境界</dt>
            <dd>{game.rank}</dd>
            <dt>第几日</dt>
            <dd>{game.day}</dd>
            <dt>知识</dt>
            <dd>{game.knowledge}</dd>
            <dt>熟练</dt>
            <dd>{game.mastery}</dd>
            <dt>名望</dt>
            <dd>{game.reputation}</dd>
            <dt>精力</dt>
            <dd>{game.vigor}</dd>
            <dt>行动</dt>
            <dd>{game.actionsLeft}/3</dd>
          </dl>
        </article>

        <article className="game-panel rounded-2xl border border-[#6f5a31]/40 bg-[#f9f2df]/92 p-4 shadow-[0_8px_18px_rgba(70,48,16,0.16)]">
          <h3 className="text-lg font-semibold">材料库存与价值</h3>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {Object.entries(game.resources).map(([key, value]) => (
              <div
                key={key}
                className="rounded-lg border border-[#8f7d57]/30 bg-[#fff8e8] px-2 py-1.5"
              >
                <p className="text-xs opacity-80">
                  {RESOURCE_LABELS[key as ResourceKey]}（价值 {RESOURCE_VALUES[key as ResourceKey]}）
                </p>
                <p className="font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="game-panel rounded-2xl border border-[#6f5a31]/40 bg-[#f9f2df]/92 p-4 shadow-[0_8px_18px_rgba(70,48,16,0.16)]">
          <h3 className="text-lg font-semibold">过场回顾画廊</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between rounded border border-[#8d7a56]/35 bg-[#fff8e8] px-2.5 py-1.5">
              <dt>章节开场</dt>
              <dd>{grouped.chapter_intro}</dd>
            </div>
            <div className="flex items-center justify-between rounded border border-[#8d7a56]/35 bg-[#fff8e8] px-2.5 py-1.5">
              <dt>随机事件</dt>
              <dd>{grouped.event}</dd>
            </div>
            <div className="flex items-center justify-between rounded border border-[#8d7a56]/35 bg-[#fff8e8] px-2.5 py-1.5">
              <dt>境界晋升</dt>
              <dd>{grouped.rank_ascension}</dd>
            </div>
            <div className="flex items-center justify-between rounded border border-[#8d7a56]/35 bg-[#fff8e8] px-2.5 py-1.5">
              <dt>终局仪式</dt>
              <dd>{grouped.ending}</dd>
            </div>
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const loaded = loadCinematicArchive();
                setEntries(loaded);
                setStatus(loaded.length > 0 ? "记录已刷新。" : "暂无过场记录。");
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
          <p className="mt-2 text-xs leading-6 opacity-75">
            {status ||
              (entries.length > 0
                ? "可在右侧列表里重播过场。"
                : "暂无过场记录。先推进剧情或完成炼成。")}
          </p>
        </article>
      </section>

      <section className="space-y-4">
        <article className="game-panel reveal-up reveal-delay-2 rounded-2xl border border-[#6f5a31]/40 bg-[#f9f2df]/92 p-4 shadow-[0_8px_18px_rgba(70,48,16,0.16)]">
          <h2 className="text-xl font-semibold">工坊日志</h2>
          <p className="mt-2 text-sm leading-7 opacity-85">
            最近的剧情推进、随机事件和炼金记录都会写入此处。
          </p>
          <ul className="mt-3 max-h-[24rem] space-y-2 overflow-auto pr-1 text-sm">
            {game.journal.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-[#8f7d57]/30 bg-[#fff8e8] p-2 leading-7"
              >
                <p className="font-medium">
                  第{entry.day}日 · [{entry.type}] {entry.title}
                </p>
                <p className="mt-1 whitespace-pre-line opacity-85">{entry.body}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="game-panel reveal-up reveal-delay-3 rounded-2xl border border-[#6f5a31]/40 bg-[#f9f2df]/92 p-4 shadow-[0_8px_18px_rgba(70,48,16,0.16)]">
          <h2 className="text-xl font-semibold">过场记录列表</h2>
          <ul className="mt-3 max-h-[20rem] space-y-2 overflow-auto pr-1 text-sm">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-[#8f7d57]/30 bg-[#fff8e8] p-2"
              >
                <p className="font-medium">
                  [{KIND_LABELS[entry.kind]}] {entry.title}
                </p>
                {entry.subtitle ? <p className="mt-1 opacity-80">{entry.subtitle}</p> : null}
                <p className="mt-1 max-h-12 overflow-hidden opacity-75">{entry.body}</p>
                <p className="mt-1 text-xs opacity-65">
                  第 {entry.day} 日 · {formatDate(entry.createdAt)}
                </p>
                <button
                  type="button"
                  onClick={() => onReplay(entry)}
                  className="game-button mt-2 rounded border border-[#6b5b37] bg-[#efe3c4] px-2.5 py-1 text-xs hover:bg-[#e6d3a7]"
                >
                  重播过场
                </button>
              </li>
            ))}
            {entries.length === 0 ? (
              <li className="rounded-lg border border-[#8f7d57]/30 bg-[#fff8e8] p-2 opacity-75">
                暂无可重播过场。
              </li>
            ) : null}
          </ul>
        </article>
      </section>

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
