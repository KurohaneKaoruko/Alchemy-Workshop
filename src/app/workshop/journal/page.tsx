"use client";

import Link from "next/link";
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
import { GrandWorkAgenda } from "@/features/game/components/GrandWorkAgenda";
import {
  RankAscensionOverlay,
  type RankAscensionPayload,
} from "@/features/game/components/RankAscensionOverlay";
import { buildArchiveSummary } from "@/features/game/logic/archiveSummary";
import { RESOURCE_VALUES } from "@/features/game/data/resourceMeta";
import { useWorkshopGame } from "@/features/game/logic/useWorkshopGame";
import type { JournalType, LastEventDigest, Rank } from "@/features/game/types";
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

const JOURNAL_TYPE_LABELS: Record<JournalType, string> = {
  story: "剧情推进",
  craft: "炼成记录",
  event: "异象回应",
  system: "系统纪要",
};

const JOURNAL_FILTERS: Array<{
  id: JournalType | "all";
  label: string;
}> = [
  { id: "all", label: "全部日志" },
  { id: "story", label: "剧情" },
  { id: "craft", label: "炼成" },
  { id: "event", label: "异象" },
  { id: "system", label: "系统" },
];

const ARCHIVE_FILTERS: Array<{
  id: CinematicArchiveEntry["kind"] | "all";
  label: string;
}> = [
  { id: "all", label: "全部过场" },
  { id: "chapter_intro", label: "章节" },
  { id: "event", label: "事件" },
  { id: "rank_ascension", label: "晋升" },
  { id: "ending", label: "终局" },
];

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

function getFilterButtonClass(active: boolean): string {
  return active
    ? "border-[#8f6e3b]/40 bg-[#f3e2b5] text-[#513718] shadow-[0_10px_18px_rgba(53,36,13,0.08)]"
    : "border-[#8f7448]/18 bg-[rgba(255,252,245,0.72)] text-[#6a512a] hover:bg-[rgba(246,236,208,0.94)]";
}

export default function JournalPage() {
  const { game } = useWorkshopGame();
  const [entries, setEntries] = useState<CinematicArchiveEntry[]>(() => loadCinematicArchive());
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [journalFilter, setJournalFilter] = useState<JournalType | "all">("all");
  const [archiveFilter, setArchiveFilter] = useState<CinematicArchiveEntry["kind"] | "all">("all");
  const [eventReplay, setEventReplay] = useState<LastEventDigest | null>(null);
  const [chapterReplay, setChapterReplay] = useState<ChapterIntroPayload | null>(null);
  const [rankReplay, setRankReplay] = useState<RankAscensionPayload | null>(null);
  const [endingReplay, setEndingReplay] = useState<EndingRitualPayload | null>(null);

  const summary = useMemo(() => buildArchiveSummary(game, entries), [game, entries]);
  const keyword = searchQuery.trim().toLowerCase();
  const filteredJournal = useMemo(() => {
    return game.journal.filter((entry) => {
      const matchesType = journalFilter === "all" || entry.type === journalFilter;
      const matchesKeyword = !keyword || `${entry.title}\n${entry.body}`.toLowerCase().includes(keyword);
      return matchesType && matchesKeyword;
    });
  }, [game.journal, journalFilter, keyword]);
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesType = archiveFilter === "all" || entry.kind === archiveFilter;
      const matchesKeyword = !keyword || `${entry.title}\n${entry.body}\n${entry.subtitle ?? ""}`.toLowerCase().includes(keyword);
      return matchesType && matchesKeyword;
    });
  }, [archiveFilter, entries, keyword]);

  const spotlightEntry = filteredEntries[0] ?? null;
  const activeReplayCount = filteredEntries.length;
  const totalReplayCount = entries.length;
  const totalArchiveMoments = Object.values(summary.archiveCounts).reduce((sum, value) => sum + value, 0);

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

  function onRefreshArchive() {
    const loaded = loadCinematicArchive();
    setEntries(loaded);
    setStatus(loaded.length > 0 ? "档案已刷新。" : "暂时没有可回放的记录。");
  }

  function onClearArchive() {
    clearCinematicArchive();
    setEntries([]);
    setStatus("过场档案已清空。");
  }

  return (
    <div className="workshop-page">
      <section className="workshop-hero-card workshop-hero-card--mobile-tight reveal-up">
        <p className="workshop-hero-card__eyebrow">Archive & Chronicle</p>
        <h2 className="workshop-hero-card__title">炼金档案</h2>
        <p className="workshop-hero-card__lead">
          这里收纳你的工坊日志、材料统计与所有过场回放。档案页不只是回顾用的仓库，也应该能直接告诉你下一步该看哪里、该回放什么。
        </p>
        <div className="workshop-hero-card__meta">
          <span className="workshop-pill">当前境界：{game.rank}</span>
          <span className="workshop-pill">第 {game.day} 日</span>
          <span className="workshop-pill">日志条目：{game.journal.length}</span>
          <span className="workshop-pill">过场记录：{entries.length}</span>
        </div>
        <div className="ritual-chip-row mt-4">
          <span className="ritual-chip">当前筛选日志：{filteredJournal.length}</span>
          <span className="ritual-chip">当前筛选过场：{activeReplayCount}</span>
          <span className="ritual-chip">库存总量：{summary.totalResourceUnits}</span>
        </div>
      </section>

      <GrandWorkAgenda game={game} currentRoute="journal" mobileVariant="compact" />

      <div className="workshop-page__grid xl:grid-cols-[minmax(0,1.18fr)_21rem]">
        <section className="space-y-4">
          <article className="ritual-card ritual-card--mobile-tight reveal-up reveal-delay-1 rounded-2xl p-5">
            <div className="ritual-mobile-stack-head flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="ritual-card__eyebrow">Archive Command Center</p>
                <h3 className="ritual-card__title">档案指挥台</h3>
                <p className="ritual-card__copy">
                  用同一套检索框同时过滤日志与过场，再通过下方分组快速切到当前想复盘的层面。
                </p>
              </div>
              <label className="ritual-mobile-stack-field min-w-[16rem] flex-1 rounded-2xl border border-[#8f7448]/18 bg-[rgba(255,252,245,0.78)] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.26)] sm:max-w-sm">
                <span className="block text-[0.68rem] uppercase tracking-[0.2em] text-[#8b6d39]/72">Archive Search</span>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="搜索标题、正文或过场副标题"
                  className="mt-2 w-full px-3 py-2"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.06fr_0.94fr]">
              <section className="grid gap-3">
                <div className="rounded-2xl border border-[#8f7448]/18 bg-[rgba(255,252,245,0.72)] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.26)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[#8b6d39]/72">Journal Layers</p>
                      <h4 className="mt-2 text-lg text-[#2f220f]">工坊日志筛选</h4>
                    </div>
                    <span className="rounded-full border border-[#8f7448]/20 bg-[#f8efdc] px-2.5 py-1 text-xs text-[#664c27]">
                      {filteredJournal.length}/{game.journal.length}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {JOURNAL_FILTERS.map((filter) => (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setJournalFilter(filter.id)}
                        className={`game-button rounded-full border px-3 py-1.5 text-xs ${getFilterButtonClass(
                          journalFilter === filter.id,
                        )}`}
                      >
                        {filter.label}
                        {filter.id !== "all" ? ` · ${summary.journalCounts[filter.id]}` : ""}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#8f7448]/18 bg-[rgba(255,252,245,0.72)] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.26)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[#8b6d39]/72">Replay Layers</p>
                      <h4 className="mt-2 text-lg text-[#2f220f]">过场记录筛选</h4>
                    </div>
                    <span className="rounded-full border border-[#8f7448]/20 bg-[#f8efdc] px-2.5 py-1 text-xs text-[#664c27]">
                      {activeReplayCount}/{totalReplayCount}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {ARCHIVE_FILTERS.map((filter) => (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setArchiveFilter(filter.id)}
                        className={`game-button rounded-full border px-3 py-1.5 text-xs ${getFilterButtonClass(
                          archiveFilter === filter.id,
                        )}`}
                      >
                        {filter.label}
                        {filter.id !== "all" ? ` · ${summary.archiveCounts[filter.id]}` : ""}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="ritual-card--dark rounded-2xl p-4">
                <p className="ritual-card__eyebrow">Replay Spotlight</p>
                <h3 className="ritual-card__title">当前回放焦点</h3>
                {spotlightEntry ? (
                  <div className="mt-4 rounded-2xl border border-[#e0c98a]/18 bg-[rgba(255,244,217,0.08)] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="ritual-chip ritual-chip--dark">{KIND_LABELS[spotlightEntry.kind]}</span>
                      <span className="ritual-chip ritual-chip--dark">第 {spotlightEntry.day} 日</span>
                    </div>
                    <p className="mt-3 text-lg font-semibold text-[#f3e7c8]">{spotlightEntry.title}</p>
                    {spotlightEntry.subtitle ? (
                      <p className="mt-1 text-sm text-[#ead8af]/78">{spotlightEntry.subtitle}</p>
                    ) : null}
                    <p className="mt-3 text-sm leading-7 text-[#f1e3c2]/84">{spotlightEntry.body}</p>
                    <p className="mt-3 text-xs text-[#d9c393]/68">{formatDate(spotlightEntry.createdAt)}</p>
                    <button
                      type="button"
                      onClick={() => onReplay(spotlightEntry)}
                      className="game-button mt-4 rounded-lg border border-[#d3b06a]/35 bg-[rgba(248,228,176,0.14)] px-3 py-2 text-sm text-[#f3e7c8] hover:bg-[rgba(248,228,176,0.2)]"
                    >
                      立即重播
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-[#e0c98a]/16 bg-[rgba(255,244,217,0.06)] p-4">
                    <p className="text-sm leading-7 text-[#f1e3c2]/78">
                      当前筛选下没有命中过场记录。你可以清空搜索词，或先去剧情探索与魔法阵炼金中继续推进。
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href="/workshop/story"
                        className="game-button rounded-lg border border-[#d3b06a]/35 bg-[rgba(248,228,176,0.14)] px-3 py-2 text-sm text-[#f3e7c8] hover:bg-[rgba(248,228,176,0.2)]"
                      >
                        去剧情探索
                      </Link>
                      <Link
                        href="/workshop/alchemy"
                        className="game-button rounded-lg border border-[#d3b06a]/25 bg-transparent px-3 py-2 text-sm text-[#eadab3] hover:bg-[rgba(248,228,176,0.08)]"
                      >
                        去魔法阵炼金
                      </Link>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </article>

          <article className="ritual-card reveal-up reveal-delay-2 rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="ritual-card__eyebrow">Workshop Journal</p>
                <h2 className="ritual-card__title">工坊日志</h2>
                <p className="ritual-card__copy">最近的剧情推进、随机事件和炼金记录都会写入这里，并按你当前的筛选条件即时收拢。</p>
              </div>
              <span className="rounded-full border border-[#8f7448]/20 bg-[#f8efdc] px-2.5 py-1 text-xs text-[#664c27]">
                {journalFilter === "all" ? "全部类型" : JOURNAL_TYPE_LABELS[journalFilter]}
              </span>
            </div>

            <div className="ritual-log-list mt-4 max-h-none overflow-visible pr-0 lg:max-h-[32rem] lg:overflow-auto lg:pr-1">
              {filteredJournal.map((entry) => (
                <div key={entry.id} className="ritual-log-item">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="ritual-chip px-2.5 py-1 text-[11px]">{JOURNAL_TYPE_LABELS[entry.type]}</span>
                    <p className="text-sm font-semibold text-[#3d2b14]">
                      第 {entry.day} 日 · {entry.title}
                    </p>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#5a4220]/85">{entry.body}</p>
                </div>
              ))}
              {filteredJournal.length === 0 ? (
                <div className="ritual-log-item">
                  <p className="text-sm leading-7 text-[#5a4220]/78">当前筛选下没有日志记录。可以换个类型，或清空搜索词后再看。</p>
                </div>
              ) : null}
            </div>
          </article>

          <article className="ritual-card reveal-up reveal-delay-3 rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="ritual-card__eyebrow">Cinematic Records</p>
                <h2 className="ritual-card__title">过场记录列表</h2>
                <p className="ritual-card__copy">这里保留所有可重播过场。清单会随着上方筛选与搜索联动，不再只是按时间平铺到底。</p>
              </div>
              <span className="rounded-full border border-[#8f7448]/20 bg-[#f8efdc] px-2.5 py-1 text-xs text-[#664c27]">
                总计 {totalArchiveMoments} 条
              </span>
            </div>

            <div className="ritual-log-list mt-4 max-h-none overflow-visible pr-0 lg:max-h-[26rem] lg:overflow-auto lg:pr-1">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="ritual-log-item">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="ritual-chip px-2.5 py-1 text-[11px]">{KIND_LABELS[entry.kind]}</span>
                    <p className="text-sm font-semibold text-[#3d2b14]">{entry.title}</p>
                  </div>
                  {entry.subtitle ? <p className="mt-1 text-sm text-[#5a4220]/80">{entry.subtitle}</p> : null}
                  <p className="mt-2 text-sm leading-7 text-[#5a4220]/78">{entry.body}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-[#756241]/72">
                      第 {entry.day} 日 · {formatDate(entry.createdAt)}
                    </p>
                    <button
                      type="button"
                      onClick={() => onReplay(entry)}
                      className="game-button rounded border border-[#6b5b37] bg-[#efe3c4] px-2.5 py-1 text-xs hover:bg-[#e6d3a7]"
                    >
                      重播过场
                    </button>
                  </div>
                </div>
              ))}
              {filteredEntries.length === 0 ? (
                <div className="ritual-log-item">
                  <p className="text-sm leading-7 text-[#5a4220]/78">
                    当前筛选下暂无可重播过场。你可以点击右侧刷新档案，或先推进剧情和炼成以积累新记录。
                  </p>
                </div>
              ) : null}
            </div>
          </article>
        </section>

        <aside className="workshop-page__sidebar reveal-up reveal-delay-2">
          <article className="ritual-card rounded-2xl p-4">
            <p className="ritual-card__eyebrow">Archive Snapshot</p>
            <h3 className="ritual-card__title">档案快照</h3>
            <div className="ritual-stat-grid mt-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="ritual-stat">
                <p className="ritual-stat__label">最近日志</p>
                <p className="ritual-stat__value text-base">{summary.latestJournalEntry?.title ?? "暂无"}</p>
              </div>
              <div className="ritual-stat">
                <p className="ritual-stat__label">最近回放</p>
                <p className="ritual-stat__value text-base">{summary.latestArchiveEntry?.title ?? "暂无"}</p>
              </div>
            </div>
          </article>

          <article className="ritual-card rounded-2xl p-4">
            <p className="ritual-card__eyebrow">Reserve Shelf</p>
            <h3 className="ritual-card__title">高频材料</h3>
            <div className="ritual-list mt-4">
              {summary.topResources.map((resource) => (
                <div key={resource.key} className="ritual-list__item flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#3f2d16]">{resource.label}</p>
                    <p className="mt-1 text-xs text-[#70552a]/76">价值 {RESOURCE_VALUES[resource.key]} · 库存摘要</p>
                  </div>
                  <strong className="text-lg text-[#2f220f]">{resource.amount}</strong>
                </div>
              ))}
              {summary.topResources.length === 0 ? (
                <div className="ritual-list__item">
                  <p className="text-sm leading-7 text-[#5a4220]/78">当前没有可展示的库存高频材料。</p>
                </div>
              ) : null}
            </div>
          </article>

          <article className="ritual-card rounded-2xl p-4">
            <p className="ritual-card__eyebrow">Replay Gallery</p>
            <h3 className="ritual-card__title">回放工位</h3>
            <div className="ritual-stat-grid mt-4">
              <div className="ritual-stat flex items-center justify-between">
                <p className="ritual-stat__label">章节</p>
                <p className="text-lg font-semibold text-[#2f220f]">{summary.archiveCounts.chapter_intro}</p>
              </div>
              <div className="ritual-stat flex items-center justify-between">
                <p className="ritual-stat__label">事件</p>
                <p className="text-lg font-semibold text-[#2f220f]">{summary.archiveCounts.event}</p>
              </div>
              <div className="ritual-stat flex items-center justify-between">
                <p className="ritual-stat__label">晋升</p>
                <p className="text-lg font-semibold text-[#2f220f]">{summary.archiveCounts.rank_ascension}</p>
              </div>
              <div className="ritual-stat flex items-center justify-between">
                <p className="ritual-stat__label">终局</p>
                <p className="text-lg font-semibold text-[#2f220f]">{summary.archiveCounts.ending}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onRefreshArchive}
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
              {status || (entries.length > 0 ? "可在左侧筛选后直接从列表或焦点卡片中重播过场。" : "先推进剧情或完成炼成，档案才会逐渐充实。")}
            </p>
          </article>

          {game.lastEvent ? (
            <article className="ritual-card--dark rounded-2xl p-4">
              <p className="ritual-card__eyebrow">Latest Omen</p>
              <h3 className="ritual-card__title">最近异象摘要</h3>
              <p className="mt-3 text-base font-semibold text-[#f3e7c8]">{game.lastEvent.title}</p>
              <p className="mt-2 text-sm leading-7 text-[#f1e3c2]/82">{game.lastEvent.outcomeSummary}</p>
            </article>
          ) : null}
        </aside>
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
