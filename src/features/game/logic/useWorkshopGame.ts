"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { generateNarrativeFromApi } from "@/features/ai/client";
import { applyEventOutcome, triggerRandomEvent } from "@/features/events/eventEngine";
import { playSfx, type SfxCue } from "@/features/game/logic/sfx";
import {
  getCurrentChapter,
  applyChapterChoice,
  rankToIndex,
} from "@/features/game/logic/progression";
import {
  transmuteByCircle,
  type CircleRequest,
  type CircleResult,
} from "@/features/game/logic/alchemyCircle";
import { createInitialGameState } from "@/features/game/state";
import type { GameState, LastEventDigest, Rank } from "@/features/game/types";
import {
  AI_SETTINGS_DEFAULTS,
  loadAiSettings,
  saveAiSettings,
  toRuntimeConfig,
  type AiSettingsForm,
} from "@/features/storage/aiConfig";
import {
  DEFAULT_GAME_PREFERENCES,
  loadGamePreferences,
  saveGamePreferences,
  type GamePreferences,
} from "@/features/storage/preferences";
import { addCinematicArchiveEntry } from "@/features/storage/cinematicArchive";
import { clearGameState, loadGameState, saveGameState } from "@/features/storage/save";

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
  }
}

interface RankAscensionCinematic {
  id: string;
  from: Rank;
  to: Rank;
  day: number;
}

interface EndingCinematicState {
  id: string;
  day: number;
  ending: "philosopher_stone";
}

export function useWorkshopGame() {
  const [game, setGame] = useState<GameState>(() => createInitialGameState());
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [statusText, setStatusText] = useState("炉火尚温，你可以继续今天的工坊工作。");
  const [aiSettings, setAiSettings] = useState<AiSettingsForm>(AI_SETTINGS_DEFAULTS);
  const [preferences, setPreferences] = useState<GamePreferences>(DEFAULT_GAME_PREFERENCES);
  const [cinematicEvent, setCinematicEvent] = useState<LastEventDigest | null>(null);
  const [rankAscensionCinematic, setRankAscensionCinematic] =
    useState<RankAscensionCinematic | null>(null);
  const [endingCinematic, setEndingCinematic] = useState<EndingCinematicState | null>(null);
  const lastSeenEventIdRef = useRef<string | null>(null);
  const previousRankRef = useRef<Rank | null>(null);
  const endingShownRef = useRef(false);
  const runtimeAiConfig = useMemo(() => toRuntimeConfig(aiSettings), [aiSettings]);

  useEffect(() => {
    const loaded = loadGameState();
    if (loaded) {
      lastSeenEventIdRef.current = loaded.lastEvent?.id ?? null;
      previousRankRef.current = loaded.rank;
      endingShownRef.current = loaded.ended && loaded.ending === "philosopher_stone";
      setGame(loaded);
    } else {
      previousRankRef.current = "学徒";
    }
    setReady(true);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const loaded = await loadAiSettings();
      if (active) {
        setAiSettings(loaded);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setPreferences(loadGamePreferences());
  }, []);

  useEffect(() => {
    const eventId = game.lastEvent?.id;
    if (!eventId) {
      return;
    }
    if (lastSeenEventIdRef.current === eventId) {
      return;
    }
    lastSeenEventIdRef.current = eventId;
    const event = game.lastEvent;
    if (event) {
      addCinematicArchiveEntry({
        id: `event_${event.id}`,
        kind: "event",
        title: event.title,
        subtitle: event.source === "ai" ? "AI 异象记录" : "工坊秘录",
        body: `${event.body}\n\n${event.outcomeSummary}`,
        day: game.day,
        source: event.source,
        payload: {
          eventId: event.id,
          title: event.title,
          body: event.body,
          source: event.source,
          outcomeSummary: event.outcomeSummary,
        },
      });
    }
    const timer = window.setTimeout(() => {
      setCinematicEvent(game.lastEvent ?? null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [game.lastEvent, game.day]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const previous = previousRankRef.current;
    if (!previous) {
      previousRankRef.current = game.rank;
      return;
    }

    if (previous !== game.rank && rankToIndex(game.rank) > rankToIndex(previous)) {
      const payload: RankAscensionCinematic = {
        id: `ascension_${Date.now()}_${game.rank}`,
        from: previous,
        to: game.rank,
        day: game.day,
      };
      addCinematicArchiveEntry({
        id: payload.id,
        kind: "rank_ascension",
        title: `境界突破：${payload.to}`,
        subtitle: `${payload.from} → ${payload.to}`,
        body: `第 ${payload.day} 日，你跨入了「${payload.to}」境界。`,
        day: payload.day,
        source: "system",
        payload: {
          from: payload.from,
          to: payload.to,
          day: payload.day,
        },
      });
      const timer = window.setTimeout(() => {
        setRankAscensionCinematic(payload);
      }, 0);
      previousRankRef.current = game.rank;
      return () => window.clearTimeout(timer);
    }

    previousRankRef.current = game.rank;
  }, [game.rank, game.day, ready]);

  useEffect(() => {
    if (!ready || !game.ended || game.ending !== "philosopher_stone") {
      return;
    }
    if (endingShownRef.current) {
      return;
    }

    endingShownRef.current = true;
    const payload: EndingCinematicState = {
      id: `ending_${Date.now()}`,
      day: game.day,
      ending: "philosopher_stone",
    };
    addCinematicArchiveEntry({
      id: payload.id,
      kind: "ending",
      title: "贤者之石完成",
      subtitle: "Grand Work",
      body: `第 ${payload.day} 日，你完成赤红终式，成为最强炼金术师。`,
      day: payload.day,
      source: "system",
      payload: {
        day: payload.day,
        ending: payload.ending,
      },
    });
    const timer = window.setTimeout(() => {
      setEndingCinematic(payload);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [game.ended, game.ending, game.day, ready]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    saveGameState(game);
  }, [game, ready]);

  useEffect(() => {
    window.render_game_to_text = () =>
      JSON.stringify({
        mode: game.ended ? "ended" : "playing",
        coordinate_system: "text-adventure-no-coordinates",
        day: game.day,
        rank: game.rank,
        actions_left: game.actionsLeft,
        stats: {
          knowledge: game.knowledge,
          mastery: game.mastery,
          reputation: game.reputation,
          vigor: game.vigor,
        },
        last_action: game.lastActionSummary,
        last_event: game.lastEvent ?? null,
        active_effects: game.activeEffects.map((effect) => ({
          kind: effect.kind,
          value: effect.value,
          remaining: effect.remainingTransmutations,
        })),
        resources: game.resources,
      });
    window.advanceTime = () => {
      // 回合制文本游戏，无帧推进逻辑，保留空钩子给自动化测试。
    };
    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [game]);

  const chapter = useMemo(() => getCurrentChapter(game), [game]);

  async function maybeApplyEvent(nextBase: GameState, trigger: "choice" | "craft"): Promise<GameState> {
    const triggered = await triggerRandomEvent({
      state: nextBase,
      trigger,
      aiConfig: runtimeAiConfig,
      generator: generateNarrativeFromApi,
    });
    if (!triggered) {
      return nextBase;
    }
    playSfx(preferences, "event");
    const sourceLabel = triggered.event.source === "ai" ? "AI" : "内置";
    setStatusText(`${triggered.event.title}（${sourceLabel}）：${triggered.outcome.summary}`);
    return applyEventOutcome(nextBase, triggered.event, triggered.outcome);
  }

  async function doStoryChoice(choiceId: string): Promise<void> {
    if (busy || game.ended) {
      return;
    }

    playSfx(preferences, "tap");
    setBusy(true);
    try {
      const result = applyChapterChoice(game, choiceId);
      playSfx(preferences, "story");
      setStatusText(result.message);
      const withEvent = await maybeApplyEvent(result.state, "choice");
      setGame(withEvent);
    } finally {
      setBusy(false);
    }
  }

  async function doCircleTransmutation(request: CircleRequest): Promise<CircleResult> {
    if (busy) {
      return {
        state: game,
        success: false,
        message: "当前有进行中的操作，请稍候。",
        consumedValue: 0,
        producedValue: 0,
      };
    }

    playSfx(preferences, "tap");
    setBusy(true);
    try {
      const result = transmuteByCircle(game, request);
      playSfx(preferences, result.success ? "transmute_success" : "transmute_fail");
      setStatusText(result.message);
      let nextState = result.state;
      if (result.success && !nextState.ended) {
        nextState = await maybeApplyEvent(nextState, "craft");
      }
      setGame(nextState);
      return {
        ...result,
        state: nextState,
      };
    } finally {
      setBusy(false);
    }
  }

  async function persistAiSettings(nextSettings: AiSettingsForm): Promise<void> {
    await saveAiSettings(nextSettings);
    setAiSettings(nextSettings);
  }

  async function reloadAiSettings(): Promise<AiSettingsForm> {
    const loaded = await loadAiSettings();
    setAiSettings(loaded);
    return loaded;
  }

  function persistGamePreferences(nextPreferences: GamePreferences): void {
    saveGamePreferences(nextPreferences);
    setPreferences(nextPreferences);
  }

  function previewSfx(cue: SfxCue = "tap", preferenceOverride?: GamePreferences): void {
    playSfx(preferenceOverride ?? preferences, cue);
  }

  async function testAiConnection(draft: AiSettingsForm): Promise<string> {
    const runtime = toRuntimeConfig(draft);
    if (!runtime) {
      return "请先启用 AI 并填写模型与 API Key。";
    }

    try {
      await generateNarrativeFromApi(
        {
          day: game.day,
          rank: game.rank,
          chapterTitle: chapter.title,
          trigger: "choice",
          lastActionSummary: game.lastActionSummary,
          mastery: game.mastery,
          knowledge: game.knowledge,
          reputation: game.reputation,
        },
        runtime,
      );
      return "连接成功，可用于随机事件叙事。";
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      return `连接失败：${message}`;
    }
  }

  function resetGame(): void {
    playSfx(preferences, "tap");
    clearGameState();
    const next = createInitialGameState();
    setGame(next);
    setCinematicEvent(null);
    setRankAscensionCinematic(null);
    setEndingCinematic(null);
    lastSeenEventIdRef.current = null;
    previousRankRef.current = next.rank;
    endingShownRef.current = false;
    setStatusText("工坊已经重启，新的炼金日程开始。");
  }

  function dismissCinematicEvent(): void {
    setCinematicEvent(null);
  }

  function dismissRankAscensionCinematic(): void {
    setRankAscensionCinematic(null);
  }

  function dismissEndingCinematic(): void {
    setEndingCinematic(null);
  }

  return {
    game,
    chapter,
    busy,
    ready,
    statusText,
    setStatusText,
    aiSettings,
    preferences,
    cinematicEvent,
    rankAscensionCinematic,
    endingCinematic,
    runtimeAiConfig,
    doStoryChoice,
    doCircleTransmutation,
    resetGame,
    persistAiSettings,
    persistGamePreferences,
    reloadAiSettings,
    testAiConnection,
    previewSfx,
    dismissCinematicEvent,
    dismissRankAscensionCinematic,
    dismissEndingCinematic,
  };
}
