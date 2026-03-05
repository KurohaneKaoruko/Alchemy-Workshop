"use client";

import { useEffect, useState } from "react";
import {
  AI_SETTINGS_DEFAULTS,
  type AiSettingsForm,
} from "@/features/storage/aiConfig";
import {
  DEFAULT_GAME_PREFERENCES,
  type GamePreferences,
} from "@/features/storage/preferences";
import { useWorkshopGame } from "@/features/game/logic/useWorkshopGame";

export default function SettingsPage() {
  const {
    aiSettings,
    preferences,
    persistAiSettings,
    persistGamePreferences,
    testAiConnection,
    runtimeAiConfig,
    previewSfx,
  } = useWorkshopGame();
  const [draft, setDraft] = useState<AiSettingsForm>(AI_SETTINGS_DEFAULTS);
  const [gameDraft, setGameDraft] = useState<GamePreferences>(DEFAULT_GAME_PREFERENCES);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setDraft(aiSettings);
  }, [aiSettings]);

  useEffect(() => {
    setGameDraft(preferences);
  }, [preferences]);

  async function onSave() {
    await persistAiSettings(draft);
    persistGamePreferences(gameDraft);
    setStatus("设置已保存。");
  }

  async function onTest() {
    setStatus("测试连接中...");
    const result = await testAiConnection(draft);
    setStatus(result);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
      <section className="game-panel reveal-up rounded-2xl border border-[#6f5a31]/40 bg-[#f9f2df]/92 p-5 shadow-[0_8px_18px_rgba(70,48,16,0.18)]">
        <h2 className="text-2xl font-semibold">AI 随机事件设置</h2>
        <p className="mt-2 text-sm leading-7 opacity-90">
          你可以自行输入任意 OpenAI 兼容网关。系统仅用 AI 生成叙事文本，数值结算仍由本地规则引擎负责。
        </p>

        <div className="mt-4 grid gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  enabled: event.target.checked,
                }))
              }
            />
            启用 AI 叙事随机事件
          </label>

          <label className="text-sm">
            Base URL
            <input
              value={draft.baseUrl}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  baseUrl: event.target.value,
                }))
              }
              placeholder="https://api.openai.com/v1"
              className="mt-1 w-full rounded border border-[#88724a]/50 bg-[#fffdf8] px-2 py-1"
            />
          </label>

          <label className="text-sm">
            模型名称
            <input
              value={draft.model}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  model: event.target.value,
                }))
              }
              placeholder="gpt-4.1-mini"
              className="mt-1 w-full rounded border border-[#88724a]/50 bg-[#fffdf8] px-2 py-1"
            />
          </label>

          <label className="text-sm">
            API Key（本地加密存储）
            <input
              type="password"
              value={draft.apiKey}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  apiKey: event.target.value,
                }))
              }
              className="mt-1 w-full rounded border border-[#88724a]/50 bg-[#fffdf8] px-2 py-1"
            />
          </label>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={onSave}
              className="game-button rounded-lg border border-[#6b5b37] bg-[#ead8aa] px-3 py-2 text-sm hover:bg-[#dfc993]"
            >
              保存设置
            </button>
            <button
              type="button"
              onClick={onTest}
              className="game-button rounded-lg border border-[#6b5b37] bg-[#ead8aa] px-3 py-2 text-sm hover:bg-[#dfc993]"
            >
              测试连接
            </button>
          </div>

          <div className="mt-3 rounded-lg border border-[#7f704e]/35 bg-[#fff8e8] p-3">
            <h3 className="text-base font-semibold">游戏音效</h3>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={gameDraft.sfxEnabled}
                onChange={(event) =>
                  setGameDraft((prev) => ({
                    ...prev,
                    sfxEnabled: event.target.checked,
                  }))
                }
              />
              启用仪式音效
            </label>
            <label className="mt-2 block text-sm">
              音量：{Math.round(gameDraft.sfxVolume * 100)}%
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(gameDraft.sfxVolume * 100)}
                onChange={(event) =>
                  setGameDraft((prev) => ({
                    ...prev,
                    sfxVolume: Math.max(0, Math.min(1, Number(event.target.value) / 100)),
                  }))
                }
                className="mt-1 w-full accent-[#8b6a36]"
              />
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  persistGamePreferences(gameDraft);
                  previewSfx("tap", gameDraft);
                }}
                className="game-button rounded border border-[#6b5b37] bg-[#efe3c4] px-2.5 py-1 text-xs hover:bg-[#e6d3a7]"
              >
                试听按键
              </button>
              <button
                type="button"
                onClick={() => {
                  persistGamePreferences(gameDraft);
                  previewSfx("transmute_success", gameDraft);
                }}
                className="game-button rounded border border-[#6b5b37] bg-[#efe3c4] px-2.5 py-1 text-xs hover:bg-[#e6d3a7]"
              >
                试听炼成
              </button>
            </div>
          </div>

          <p className="rounded-lg border border-[#7f704e]/35 bg-[#fff8e8] p-2 text-sm leading-7">
            {status || "尚未执行连接测试。"}
          </p>
        </div>
      </section>

      <aside className="space-y-4 reveal-up reveal-delay-2">
        <section className="game-panel rounded-2xl border border-[#6f5a31]/40 bg-[#f9f2df]/92 p-4 shadow-[0_8px_18px_rgba(70,48,16,0.16)]">
          <h3 className="text-lg font-semibold">当前状态</h3>
          <p className="mt-2 text-sm leading-7">
            {runtimeAiConfig ? `已启用：${runtimeAiConfig.model}` : "未启用，使用内置随机事件模式"}
          </p>
          <p className="text-sm leading-7 opacity-80">
            AI 异常时不会中断流程，会自动切回本地事件模板。音效也可以独立关闭。
          </p>
        </section>

        <section className="game-panel rounded-2xl border border-[#6f5a31]/40 bg-[#f9f2df]/92 p-4 shadow-[0_8px_18px_rgba(70,48,16,0.16)]">
          <h3 className="text-lg font-semibold">安全说明</h3>
          <p className="mt-2 text-sm leading-7 opacity-85">
            API Key 会在浏览器本地以 Web Crypto 方式处理后存储。此方案用于防误读，不等同于服务器级密钥管理。
          </p>
        </section>
      </aside>
    </div>
  );
}
