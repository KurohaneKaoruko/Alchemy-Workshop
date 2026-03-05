"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { generateNarrativeFromApi } from "@/features/ai/client";
import { RECIPES } from "@/features/game/data/recipes";
import { craftRecipe } from "@/features/game/logic/crafting";
import { applyChapterChoice, getCurrentChapter } from "@/features/game/logic/progression";
import { createInitialGameState } from "@/features/game/state";
import {
  applyEventOutcome,
  buildEventContext,
  triggerRandomEvent,
} from "@/features/events/eventEngine";
import {
  AI_SETTINGS_DEFAULTS,
  loadAiSettings,
  saveAiSettings,
  toRuntimeConfig,
  type AiSettingsForm,
} from "@/features/storage/aiConfig";
import { clearGameState, loadGameState, saveGameState } from "@/features/storage/save";
import type { GameState, ResourceKey } from "@/features/game/types";

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
  }
}

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  salt: "盐",
  sulfur: "硫",
  mercury: "汞",
  ash: "草木灰",
  ironSand: "赤铁砂",
  moonDew: "月露",
  sunShard: "日辉碎片",
  aetherDust: "灵尘",
  philosopherSeed: "贤者种",
  philosopherStone: "贤者之石",
};

function renderResourceDelta(resource: Partial<Record<ResourceKey, number>>): string {
  const parts = Object.entries(resource)
    .filter(([, value]) => (value ?? 0) !== 0)
    .map(([key, value]) => `${RESOURCE_LABELS[key as ResourceKey]} ${value}`);
  return parts.length > 0 ? parts.join(" / ") : "无";
}

export function GameClient() {
  const [game, setGame] = useState<GameState>(() => createInitialGameState());
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState("炉火点燃，工坊运转中。");
  const [showSettings, setShowSettings] = useState(false);
  const [aiSettings, setAiSettings] = useState<AiSettingsForm>(AI_SETTINGS_DEFAULTS);
  const [aiDraft, setAiDraft] = useState<AiSettingsForm>(AI_SETTINGS_DEFAULTS);
  const [aiStatus, setAiStatus] = useState("");
  const runtimeAiConfig = useMemo(() => toRuntimeConfig(aiSettings), [aiSettings]);

  const chapter = getCurrentChapter(game);
  const unlockedRecipes = useMemo(
    () => RECIPES.filter((recipe) => game.unlockedRecipes.includes(recipe.id)),
    [game.unlockedRecipes],
  );

  useEffect(() => {
    const loaded = loadGameState();
    if (loaded) {
      setGame(loaded);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const settings = await loadAiSettings();
      if (!active) {
        return;
      }
      setAiSettings(settings);
      setAiDraft(settings);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    saveGameState(game);
  }, [game, hydrated]);

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
        resources: game.resources,
      });
    window.advanceTime = () => {
      // 文字冒险为回合制，advanceTime 作为自动化测试钩子保留为幂等空操作。
    };
    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [game]);

  async function maybeApplyRandomEvent(
    baseState: GameState,
    trigger: "choice" | "craft",
  ): Promise<GameState> {
    const triggered = await triggerRandomEvent({
      state: baseState,
      trigger,
      aiConfig: runtimeAiConfig,
      generator: generateNarrativeFromApi,
    });

    if (!triggered) {
      return baseState;
    }

    const next = applyEventOutcome(baseState, triggered.event, triggered.outcome);
    const sourceLabel = triggered.event.source === "ai" ? "AI" : "内置";
    setStatusText(`${triggered.event.title}（${sourceLabel}）: ${triggered.outcome.summary}`);
    return next;
  }

  async function onChoose(choiceId: string) {
    if (busy || game.ended) {
      return;
    }

    setBusy(true);
    try {
      const choiceResult = applyChapterChoice(game, choiceId);
      setStatusText(choiceResult.message);
      const withEvent = await maybeApplyRandomEvent(choiceResult.state, "choice");
      setGame(withEvent);
    } finally {
      setBusy(false);
    }
  }

  async function onCraft(recipeId: string) {
    if (busy || game.ended) {
      return;
    }

    setBusy(true);
    try {
      const craftResult = craftRecipe(game, recipeId);
      setStatusText(craftResult.message);
      let nextState = craftResult.state;
      if (craftResult.success && !craftResult.state.ended) {
        nextState = await maybeApplyRandomEvent(craftResult.state, "craft");
      }
      setGame(nextState);
    } finally {
      setBusy(false);
    }
  }

  async function onSaveAiSettings() {
    await saveAiSettings(aiDraft);
    setAiSettings(aiDraft);
    setAiStatus("AI 设置已保存。");
  }

  async function onTestAi() {
    const runtime = toRuntimeConfig(aiDraft);
    if (!runtime) {
      setAiStatus("请先开启 AI 并填写模型与 API Key。");
      return;
    }

    setAiStatus("测试连接中...");
    try {
      await generateNarrativeFromApi(buildEventContext(game, "choice"), runtime);
      setAiStatus("连接成功，可用于随机事件。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      setAiStatus(`连接失败：${message}`);
    }
  }

  function onReset() {
    clearGameState();
    const fresh = createInitialGameState();
    setGame(fresh);
    setStatusText("工坊重启完成，新的炼金之路开始。");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f2ecda_0%,_#d9ccab_45%,_#b29f76_100%)] px-4 py-6 text-[#2f2818] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-2xl border border-[#6b5b37]/35 bg-[#f9f3e2]/95 p-5 shadow-[0_12px_24px_rgba(74,54,18,0.2)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-serif text-3xl font-semibold tracking-wide">极简炼金工坊</h1>
              <p className="mt-1 text-sm opacity-80">
                {game.ended
                  ? "贤者之石已成，赤红完成。"
                  : `第 ${game.day} 日 · ${game.rank} · 今日行动 ${game.actionsLeft}/3`}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/"
                className="rounded-lg border border-[#6b5b37] px-3 py-2 text-sm hover:bg-[#efe3c5]"
              >
                返回主页
              </Link>
              <button
                type="button"
                onClick={() => setShowSettings((prev) => !prev)}
                className="rounded-lg border border-[#6b5b37] px-3 py-2 text-sm hover:bg-[#efe3c5]"
              >
                {showSettings ? "收起设置" : "AI 设置"}
              </button>
              <button
                type="button"
                onClick={onReset}
                className="rounded-lg border border-[#6b5b37] px-3 py-2 text-sm hover:bg-[#efe3c5]"
              >
                重开工坊
              </button>
            </div>
          </div>
          <p className="mt-3 rounded-lg border border-[#7f704e]/40 bg-[#fff8e8] p-3 text-sm leading-7">
            {statusText}
          </p>
        </header>

        {showSettings ? (
          <section className="mt-4 rounded-2xl border border-[#6b5b37]/35 bg-[#f9f3e2]/95 p-4 shadow-[0_8px_18px_rgba(74,54,18,0.15)]">
            <h2 className="text-lg font-semibold">AI 随机事件（玩家自配置）</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={aiDraft.enabled}
                  onChange={(event) =>
                    setAiDraft((prev) => ({
                      ...prev,
                      enabled: event.target.checked,
                    }))
                  }
                />
                启用 AI 叙事事件
              </label>
              <p className="text-sm opacity-80">
                未配置或连接失败时，会自动回退到内置随机事件，不影响流程。
              </p>
              <label className="flex flex-col gap-1 text-sm">
                Base URL
                <input
                  value={aiDraft.baseUrl}
                  onChange={(event) =>
                    setAiDraft((prev) => ({
                      ...prev,
                      baseUrl: event.target.value,
                    }))
                  }
                  className="rounded border border-[#86724a]/55 bg-[#fffdf7] px-2 py-1"
                  placeholder="https://api.openai.com/v1"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                模型名称
                <input
                  value={aiDraft.model}
                  onChange={(event) =>
                    setAiDraft((prev) => ({
                      ...prev,
                      model: event.target.value,
                    }))
                  }
                  className="rounded border border-[#86724a]/55 bg-[#fffdf7] px-2 py-1"
                  placeholder="gpt-4.1-mini"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm md:col-span-2">
                API Key（本地加密保存）
                <input
                  type="password"
                  value={aiDraft.apiKey}
                  onChange={(event) =>
                    setAiDraft((prev) => ({
                      ...prev,
                      apiKey: event.target.value,
                    }))
                  }
                  className="rounded border border-[#86724a]/55 bg-[#fffdf7] px-2 py-1"
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onSaveAiSettings}
                className="rounded border border-[#6b5b37] bg-[#ead8aa] px-3 py-1.5 text-sm hover:bg-[#e1cc96]"
              >
                保存设置
              </button>
              <button
                type="button"
                onClick={onTestAi}
                className="rounded border border-[#6b5b37] bg-[#ead8aa] px-3 py-1.5 text-sm hover:bg-[#e1cc96]"
              >
                测试连接
              </button>
              <span className="text-sm opacity-80">{aiStatus}</span>
            </div>
          </section>
        ) : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl border border-[#6b5b37]/35 bg-[#f9f3e2]/95 p-5 shadow-[0_8px_18px_rgba(74,54,18,0.16)]">
            <h2 className="font-serif text-2xl">{chapter.title}</h2>
            <p className="mt-2 text-sm leading-7 opacity-90">{chapter.summary}</p>
            <p className="mt-2 rounded border border-[#8b7a55]/30 bg-[#fff8e8] p-3 text-sm leading-7">
              {chapter.atmosphere}
            </p>

            <div className="mt-4 grid gap-2">
              {chapter.choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => onChoose(choice.id)}
                  disabled={busy || game.actionsLeft <= 0 || game.ended}
                  className="rounded-lg border border-[#6b5b37]/50 bg-[#fff7e3] px-3 py-2 text-left text-sm transition hover:bg-[#f0e0bd] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="font-semibold">{choice.label}</span>
                  <span className="mt-1 block opacity-85">{choice.flavorText}</span>
                </button>
              ))}
            </div>

            {game.lastEvent ? (
              <article className="mt-4 rounded-lg border border-[#6b5b37]/45 bg-[#fff7e0] p-3 text-sm">
                <p className="font-semibold">
                  随机事件 · {game.lastEvent.source === "ai" ? "AI" : "内置"}
                </p>
                <p className="mt-1">{game.lastEvent.title}</p>
                <p className="mt-1 opacity-85">{game.lastEvent.body}</p>
                <p className="mt-1 text-[#6e5c38]">{game.lastEvent.outcomeSummary}</p>
              </article>
            ) : null}

            <h3 className="mt-5 text-lg font-semibold">炼成台</h3>
            <div className="mt-2 grid gap-2">
              {unlockedRecipes.map((recipe) => {
                const canDo =
                  game.knowledge >= recipe.requiredKnowledge &&
                  game.mastery >= recipe.requiredMastery;
                return (
                  <button
                    key={recipe.id}
                    type="button"
                    onClick={() => onCraft(recipe.id)}
                    disabled={busy || game.ended || !canDo || game.actionsLeft <= 0}
                    className="rounded-lg border border-[#6b5b37]/50 bg-[#fff7e3] px-3 py-2 text-left text-sm transition hover:bg-[#f0e0bd] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <p className="font-semibold">{recipe.name}</p>
                    <p className="opacity-85">{recipe.description}</p>
                    <p className="mt-1 opacity-80">
                      需求：知识 {recipe.requiredKnowledge} / 熟练 {recipe.requiredMastery} / 难度{" "}
                      {recipe.difficulty}
                    </p>
                    <p className="opacity-80">耗材：{renderResourceDelta(recipe.ingredients)}</p>
                    <p className="opacity-80">产出：{renderResourceDelta(recipe.outputs)}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-[#6b5b37]/35 bg-[#f9f3e2]/95 p-4 shadow-[0_8px_18px_rgba(74,54,18,0.14)]">
              <h3 className="text-lg font-semibold">角色状态</h3>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <dt>知识</dt>
                <dd>{game.knowledge}</dd>
                <dt>熟练</dt>
                <dd>{game.mastery}</dd>
                <dt>名望</dt>
                <dd>{game.reputation}</dd>
                <dt>精力</dt>
                <dd>{game.vigor}</dd>
              </dl>
              <p className="mt-3 text-xs opacity-75">
                AI 状态：
                {runtimeAiConfig ? `已启用（${runtimeAiConfig.model}）` : "未配置，使用内置随机事件"}
              </p>
            </section>

            <section className="rounded-2xl border border-[#6b5b37]/35 bg-[#f9f3e2]/95 p-4 shadow-[0_8px_18px_rgba(74,54,18,0.14)]">
              <h3 className="text-lg font-semibold">材料库</h3>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {Object.entries(game.resources).map(([key, value]) => (
                  <div key={key} className="rounded border border-[#8f7d57]/30 bg-[#fff8e8] px-2 py-1.5">
                    <p className="text-xs opacity-80">{RESOURCE_LABELS[key as ResourceKey]}</p>
                    <p className="font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#6b5b37]/35 bg-[#f9f3e2]/95 p-4 shadow-[0_8px_18px_rgba(74,54,18,0.14)]">
              <h3 className="text-lg font-semibold">工坊日志</h3>
              <ul className="mt-3 max-h-[22rem] space-y-2 overflow-auto pr-1 text-sm">
                {game.journal.slice(0, 12).map((entry) => (
                  <li key={entry.id} className="rounded border border-[#8f7d57]/30 bg-[#fff8e8] p-2">
                    <p className="font-medium">
                      第{entry.day}日 · {entry.title}
                    </p>
                    <p className="mt-1 whitespace-pre-line opacity-85">{entry.body}</p>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
