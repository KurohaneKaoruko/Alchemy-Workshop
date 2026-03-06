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

  const aiModeLabel = runtimeAiConfig ? "实时异象" : draft.enabled ? "待验证" : "回退模式";
  const keyStatus = draft.apiKey ? "已录入" : "未录入";

  return (
    <div className="workshop-page">
      <section className="workshop-hero-card reveal-up">
        <p className="workshop-hero-card__eyebrow">Control Desk</p>
        <h2 className="workshop-hero-card__title">工坊设置</h2>
        <p className="workshop-hero-card__lead">
          你可以为工坊接入任意 OpenAI 兼容网关，并单独控制仪式音效。AI 只负责生成叙事文本，
          数值结算仍由本地规则引擎处理。
        </p>
        <div className="workshop-hero-card__meta">
          <span className="workshop-pill">
            {runtimeAiConfig ? `AI 已启用：${runtimeAiConfig.model}` : "AI 处于关闭或回退状态"}
          </span>
          <span className="workshop-pill">音效：{gameDraft.sfxEnabled ? "开启" : "关闭"}</span>
        </div>
        <div className="ritual-chip-row mt-4">
          <span className="ritual-chip">连接策略：OpenAI 兼容网关</span>
          <span className="ritual-chip">结算位置：本地规则引擎</span>
          <span className="ritual-chip">当前模式：{aiModeLabel}</span>
        </div>
      </section>

      <div className="workshop-page__grid lg:grid-cols-[minmax(0,1fr)_21rem]">
        <section className="space-y-4 reveal-up">
          <article className="ritual-card rounded-2xl p-5">
            <p className="ritual-card__eyebrow">AI Omen Source</p>
            <h3 className="ritual-card__title">AI 随机事件设置</h3>
            <div className="ritual-form-grid mt-4">
              <label className="ritual-field ritual-field--featured">
                <div className="ritual-toggle">
                  <div className="ritual-toggle__copy">
                    <span className="ritual-field__label">叙事异象源</span>
                    <strong className="ritual-toggle__heading">启用 AI 叙事异象</strong>
                    <span className="ritual-toggle__text">启用后优先走外部模型；不可用时仍自动回退为内置事件。</span>
                  </div>
                  <span className="ritual-toggle__control">
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
                  </span>
                </div>
              </label>

              <label className="ritual-field">
                <span className="ritual-field__label">Base URL</span>
                <span className="ritual-field__hint">OpenAI 兼容接口地址</span>
                <input
                  value={draft.baseUrl}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      baseUrl: event.target.value,
                    }))
                  }
                  placeholder="https://api.openai.com/v1"
                  className="ritual-field__control mt-2 w-full px-3 py-2"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="ritual-field">
                  <span className="ritual-field__label">模型名称</span>
                  <span className="ritual-field__hint">用于生成随机异象文本</span>
                  <input
                    value={draft.model}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        model: event.target.value,
                      }))
                    }
                    placeholder="gpt-4.1-mini"
                    className="ritual-field__control mt-2 w-full px-3 py-2"
                  />
                </label>

                <label className="ritual-field">
                  <span className="ritual-field__label">API Key</span>
                  <span className="ritual-field__hint">浏览器本地加密保存，当前状态：{keyStatus}</span>
                  <input
                    type="password"
                    value={draft.apiKey}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        apiKey: event.target.value,
                      }))
                    }
                    className="ritual-field__control mt-2 w-full px-3 py-2"
                  />
                </label>
              </div>
            </div>
          </article>

          <article className="ritual-card rounded-2xl p-5">
            <p className="ritual-card__eyebrow">Ritual Audio</p>
            <h3 className="ritual-card__title">仪式音效</h3>
            <div className="ritual-form-grid mt-4 text-sm text-[#3f2f18]">
              <label className="ritual-field ritual-field--featured">
                <div className="ritual-toggle">
                  <div className="ritual-toggle__copy">
                    <span className="ritual-field__label">仪式回响</span>
                    <strong className="ritual-toggle__heading">启用仪式音效</strong>
                    <span className="ritual-toggle__text">用于按键、炼成成功等即时反馈，默认跟随本地偏好保存。</span>
                  </div>
                  <span className="ritual-toggle__control">
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
                  </span>
                </div>
              </label>

              <label className="ritual-field">
                <span className="ritual-field__label">音量刻度</span>
                <span className="ritual-field__hint">当前输出强度：{Math.round(gameDraft.sfxVolume * 100)}%</span>
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
                  className="mt-3 w-full accent-[#8b6a36]"
                />
              </label>

              <div className="ritual-form-actions">
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
          </article>

          <div className="ritual-form-actions reveal-up reveal-delay-1">
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
        </section>

        <aside className="workshop-page__sidebar reveal-up reveal-delay-2">
          <section className="ritual-card rounded-2xl p-4">
            <p className="ritual-card__eyebrow">Current Status</p>
            <h3 className="ritual-card__title">当前状态</h3>
            <div className="ritual-chip-row mt-4">
              <span className="ritual-chip">叙事模式：{aiModeLabel}</span>
              <span className="ritual-chip">密钥：{keyStatus}</span>
            </div>
            <p className="ritual-card__copy">
              {runtimeAiConfig
                ? `AI 叙事已启用，当前模型为 ${runtimeAiConfig.model}。`
                : "当前未启用 AI，系统会使用内置异象模板，不影响正常流程。"}
            </p>
          </section>

          <section className="ritual-card rounded-2xl p-4">
            <p className="ritual-card__eyebrow">Security Note</p>
            <h3 className="ritual-card__title">安全说明</h3>
            <div className="ritual-list mt-4">
              <div className="ritual-list__item">
                <p className="text-sm leading-7 text-[#4f3b1d]">
                  API Key 会在浏览器本地经由 Web Crypto 处理后存储。它适合防误读，不等同于服务器级密钥管理。
                </p>
              </div>
              <div className="ritual-list__item">
                <p className="text-sm leading-7 text-[#4f3b1d]">
                  数值结算仍在本地完成，AI 仅参与文本生成，不接管规则判断。
                </p>
              </div>
            </div>
          </section>

          <section className="ritual-card--dark rounded-2xl p-4">
            <p className="ritual-card__eyebrow">Connection Result</p>
            <h3 className="ritual-card__title">连接反馈</h3>
            <p className="ritual-card__copy">{status || "尚未执行连接测试。"}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
