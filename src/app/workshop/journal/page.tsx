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
import { FirstDayGuideHint } from "@/features/game/components/FirstDayGuideHint";
import { GrandWorkAgenda } from "@/features/game/components/GrandWorkAgenda";
import {
  RankAscensionOverlay,
  type RankAscensionPayload,
} from "@/features/game/components/RankAscensionOverlay";
import { buildArchiveSummary } from "@/features/game/logic/archiveSummary";
import { buildFirstDayGuide } from "@/features/game/logic/firstDayGuide";
import { buildGrandWorkPlan } from "@/features/game/logic/grandWorkPlan";
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

const ROUTE_LABELS = {
  "/workshop/story": "前往剧情探索",
  "/workshop/alchemy": "前往魔法阵炼金",
  "/workshop/journal": "前往炼金档案",
} as const;

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
  const [archiveView, setArchiveView] = useState<"journal" | "replay">("journal");
  const [eventReplay, setEventReplay] = useState<LastEventDigest | null>(null);
  const [chapterReplay, setChapterReplay] = useState<ChapterIntroPayload | null>(null);
  const [rankReplay, setRankReplay] = useState<RankAscensionPayload | null>(null);
  const [endingReplay, setEndingReplay] = useState<EndingRitualPayload | null>(null);

  const summary = useMemo(() => buildArchiveSummary(game, entries), [game, entries]);
  const firstDayGuide = buildFirstDayGuide(game);
  const plan = buildGrandWorkPlan(game);
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
  const activeResourceKinds = Object.values(game.resources).filter((amount) => amount > 0).length;
  const archiveSignals = [
    {
      label: "日志",
      value: String(game.journal.length),
      note: `当前筛中 ${filteredJournal.length} 条`,
    },
    {
      label: "回放",
      value: String(entries.length),
      note: `当前筛中 ${activeReplayCount} 条`,
    },
    {
      label: "材料",
      value: String(activeResourceKinds),
      note: `合计 ${summary.totalResourceUnits} 份`,
    },
    {
      label: "去向",
      value: ROUTE_LABELS[plan.actionCue.href],
      note: plan.actionCue.title,
    },
  ] as const;

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
      <section className="workshop-hero-card workshop-hero-card--mobile-tight journal-page__hero reveal-up">
        <p className="workshop-hero-card__eyebrow">档案与编年</p>
        <div className="journal-page__hero-layout">
          <div className="journal-page__hero-copy">
            <h2 className="workshop-hero-card__title">炼金档案</h2>
            <p className="workshop-hero-card__lead">
              档案页现在只做三件事：快速检索记录、定位当前最值得回放的片段，以及把你送回下一张该去的工作台。
            </p>
            <div className="workshop-hero-card__meta">
              <span className="workshop-pill">当前境界：{game.rank}</span>
              <span className="workshop-pill">第 {game.day} 日</span>
              <span className="workshop-pill">日志条目：{game.journal.length}</span>
              <span className="workshop-pill">过场记录：{entries.length}</span>
            </div>

            <div className="journal-page__focus-card">
              <span className="journal-page__focus-label">当前焦点</span>
              <strong className="journal-page__focus-title">
                {spotlightEntry ? spotlightEntry.title : "当前筛选下暂无可回放片段"}
              </strong>
              <p className="journal-page__focus-copy">
                {spotlightEntry
                  ? `${KIND_LABELS[spotlightEntry.kind]} · 第 ${spotlightEntry.day} 日${spotlightEntry.subtitle ? ` · ${spotlightEntry.subtitle}` : ""}`
                  : "你可以清空搜索词，或先去剧情探索与魔法阵炼金继续积累新记录。"}
              </p>
              <div className="journal-page__focus-actions">
                {spotlightEntry ? (
                  <button
                    type="button"
                    onClick={() => onReplay(spotlightEntry)}
                    className="game-button rounded-lg border border-[#6b5b37] bg-[#ead8aa] px-3 py-2 text-sm hover:bg-[#dfc993]"
                  >
                    重播焦点
                  </button>
                ) : (
                  <Link
                    href={plan.actionCue.href}
                    className="game-button inline-flex min-h-10 items-center justify-center rounded-lg border border-[#6b5b37] bg-[#ead8aa] px-3 py-2 text-sm hover:bg-[#dfc993]"
                  >
                    {ROUTE_LABELS[plan.actionCue.href]}
                  </Link>
                )}
                <span className="journal-page__focus-chip">{status || plan.daySignal}</span>
              </div>
            </div>
          </div>

          <div className="journal-page__hero-rail">
            <div className="journal-page__hero-stats">
              {archiveSignals.map((item) => (
                <div key={item.label} className="journal-page__hero-stat">
                  <span className="journal-page__hero-stat-label">{item.label}</span>
                  <strong className="journal-page__hero-stat-value">{item.value}</strong>
                  <span className="journal-page__hero-stat-note">{item.note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <FirstDayGuideHint guide={firstDayGuide} currentStepId="journal" variant="compact" />

      <div className="workshop-page__grid xl:grid-cols-[minmax(0,1.18fr)_21rem]">
        <section className="space-y-4">
          <article className="ritual-card ritual-card--mobile-tight reveal-up reveal-delay-1 rounded-2xl p-5">
            <div className="journal-page__section-head">
              <div className="min-w-0 flex-1">
                <p className="ritual-card__eyebrow">档案检索台</p>
                <h3 className="ritual-card__title">档案检索台</h3>
                <p className="ritual-card__copy">把搜索和筛选收在一组控件里，避免在首屏继续堆叠解释和回放卡片。</p>
              </div>
            </div>

            <div className="journal-page__console-grid mt-4">
              <label className="journal-page__search-card">
                <span className="journal-page__search-label">档案搜索</span>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="搜索标题、正文或过场副标题"
                  className="mt-2 w-full px-3 py-2"
                />
                <span className="journal-page__search-note">同一关键词会同时过滤日志与过场记录。</span>
              </label>

              <section className="journal-page__filter-card">
                <div className="journal-page__filter-head">
                  <div>
                    <p className="journal-page__filter-label">日志筛选</p>
                    <h4 className="journal-page__filter-title">日志筛选</h4>
                  </div>
                  <span className="journal-page__filter-count">{filteredJournal.length}/{game.journal.length}</span>
                </div>
                <div className="journal-page__filter-wrap mt-4">
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
              </section>

              <section className="journal-page__filter-card">
                <div className="journal-page__filter-head">
                  <div>
                    <p className="journal-page__filter-label">过场筛选</p>
                    <h4 className="journal-page__filter-title">过场筛选</h4>
                  </div>
                  <span className="journal-page__filter-count">{activeReplayCount}/{totalReplayCount}</span>
                </div>
                <div className="journal-page__filter-wrap mt-4">
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
              </section>
            </div>
          </article>

          <article className="ritual-card reveal-up reveal-delay-2 rounded-2xl p-5">
            <div className="journal-page__section-head">
              <div className="min-w-0 flex-1">
                <p className="ritual-card__eyebrow">档案记录</p>
                <h2 className="ritual-card__title">日志与过场</h2>
                <p className="ritual-card__copy">主区改成一个记录面板，按需切看日志或过场，减少首屏纵向堆叠。</p>
              </div>
              <div className="journal-page__view-switch">
                <button
                  type="button"
                  onClick={() => setArchiveView("journal")}
                  className={`game-button rounded-full border px-3 py-1.5 text-xs ${getFilterButtonClass(archiveView === "journal")}`}
                >
                  日志 {filteredJournal.length}
                </button>
                <button
                  type="button"
                  onClick={() => setArchiveView("replay")}
                  className={`game-button rounded-full border px-3 py-1.5 text-xs ${getFilterButtonClass(archiveView === "replay")}`}
                >
                  过场 {filteredEntries.length}
                </button>
              </div>
            </div>

            {archiveView === "journal" ? (
              <div className="ritual-log-list mt-4 max-h-none overflow-visible pr-0 lg:max-h-[34rem] lg:overflow-auto lg:pr-1">
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
                    <p className="text-sm leading-7 text-[#5a4220]/78">当前筛选下暂无日志。换个类型，或清空搜索词后再看。</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="ritual-log-list mt-4 max-h-none overflow-visible pr-0 lg:max-h-[34rem] lg:overflow-auto lg:pr-1">
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
                        重播
                      </button>
                    </div>
                  </div>
                ))}
                {filteredEntries.length === 0 ? (
                  <div className="ritual-log-item">
                    <p className="text-sm leading-7 text-[#5a4220]/78">当前筛选下暂无过场。可先刷新档案，或继续推进剧情与炼成。</p>
                  </div>
                ) : null}
              </div>
            )}
          </article>
        </section>

        <aside className="workshop-page__sidebar reveal-up reveal-delay-2">
          <article className="ritual-card rounded-2xl p-4 journal-page__support-card">
            <p className="ritual-card__eyebrow">档案辅助</p>
            <h3 className="ritual-card__title">快照与维护</h3>
            <div className="journal-page__snapshot-grid mt-4">
              <div className="journal-page__snapshot-item">
                <span className="journal-page__snapshot-label">最近日志</span>
                <strong className="journal-page__snapshot-value">{summary.latestJournalEntry?.title ?? "暂无"}</strong>
              </div>
              <div className="journal-page__snapshot-item">
                <span className="journal-page__snapshot-label">最近回放</span>
                <strong className="journal-page__snapshot-value">{summary.latestArchiveEntry?.title ?? "暂无"}</strong>
              </div>
              <div className="journal-page__snapshot-item journal-page__snapshot-item--compact">
                <span className="journal-page__snapshot-label">章节</span>
                <strong className="journal-page__snapshot-value">{summary.archiveCounts.chapter_intro}</strong>
              </div>
              <div className="journal-page__snapshot-item journal-page__snapshot-item--compact">
                <span className="journal-page__snapshot-label">事件</span>
                <strong className="journal-page__snapshot-value">{summary.archiveCounts.event}</strong>
              </div>
              <div className="journal-page__snapshot-item journal-page__snapshot-item--compact">
                <span className="journal-page__snapshot-label">晋升</span>
                <strong className="journal-page__snapshot-value">{summary.archiveCounts.rank_ascension}</strong>
              </div>
              <div className="journal-page__snapshot-item journal-page__snapshot-item--compact">
                <span className="journal-page__snapshot-label">终局</span>
                <strong className="journal-page__snapshot-value">{summary.archiveCounts.ending}</strong>
              </div>
            </div>

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
            <p className="journal-page__maintenance-note">
              {status || (entries.length > 0 ? "可直接从列表或页头焦点卡片重播过场。" : "先推进剧情或完成炼成，档案才会逐渐充实。")}
            </p>
          </article>

          {game.lastEvent ? (
            <article className="ritual-card--dark rounded-2xl p-4">
              <p className="ritual-card__eyebrow">最近异象</p>
              <h3 className="ritual-card__title">最近异象摘要</h3>
              <p className="mt-3 text-base font-semibold text-[#f3e7c8]">{game.lastEvent.title}</p>
              <p className="mt-2 text-sm leading-7 text-[#f1e3c2]/82">{game.lastEvent.outcomeSummary}</p>
            </article>
          ) : null}
        </aside>
      </div>

      <GrandWorkAgenda
        game={game}
        currentRoute="journal"
        mobileVariant="compact"
        desktopVariant="collapsed"
      />

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
