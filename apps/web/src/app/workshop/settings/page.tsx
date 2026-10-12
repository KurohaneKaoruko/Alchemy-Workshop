"use client";

import { useEffect, useMemo, useState } from "react";
import { GrandWorkAgenda } from "@/features/game/components/GrandWorkAgenda";
import {
  buildSettingsChecklist,
  buildSettingsOverview,
  getConnectionFeedbackTone,
} from "@/features/game/logic/settingsChecklist";
import {
  AI_SETTINGS_DEFAULTS,
  type AiSettingsForm,
} from "@/features/storage/aiConfig";
import {
  DEFAULT_GAME_PREFERENCES,
  type GamePreferences,
} from "@/features/storage/preferences";
import { useWorkshopGame } from "@/features/game/logic/useWorkshopGame";

function normalizeAiSettings(settings: AiSettingsForm): AiSettingsForm {
  return {
    enabled: settings.enabled,
    baseUrl: settings.baseUrl.trim() || AI_SETTINGS_DEFAULTS.baseUrl,
    model: settings.model.trim(),
    apiKey: settings.apiKey.trim(),
  };
}

function normalizePreferences(preferences: GamePreferences): GamePreferences {
  return {
    sfxEnabled: preferences.sfxEnabled,
    sfxVolume: Math.max(0, Math.min(1, preferences.sfxVolume)),
  };
}

function getChecklistToneClasses(state: "ready" | "attention" | "standby"): string {
  switch (state) {
    case "ready":
      return "border-[#6f8c4a]/28 bg-[#eef4de] text-[#405c20]";
    case "attention":
      return "border-[#b48d54]/28 bg-[#fbf0d8] text-[#7a5220]";
    case "standby":
    default:
      return "border-[#8d7a54]/22 bg-[#f6eedb] text-[#6a5432]";
  }
}

function getConnectionToneClasses(tone: ReturnType<typeof getConnectionFeedbackTone>): string {
  switch (tone) {
    case "success":
      return "border-[#6f8c4a]/30 bg-[#eef4de] text-[#405c20]";
    case "error":
      return "border-[#b5664c]/30 bg-[#f6e3da] text-[#7c3f26]";
    case "pending":
      return "border-[#b48d54]/28 bg-[#fbf0d8] text-[#7a5220]";
    case "neutral":
    default:
      return "border-[#8d7a54]/22 bg-[#f6eedb] text-[#6a5432]";
  }
}

function getOverviewToneClasses(tone: ReturnType<typeof buildSettingsOverview>["tone"]): string {
  switch (tone) {
    case "ready":
    case "success":
      return "border-[#6f8c4a]/26 bg-[#eef4de]";
    case "attention":
    case "pending":
      return "border-[#b48d54]/26 bg-[#fbf0d8]";
    case "error":
      return "border-[#b5664c]/26 bg-[#f6e3da]";
    case "standby":
    default:
      return "border-[#8d7a54]/22 bg-[#f6eedb]";
  }
}

export default function SettingsPage() {
  const {
    game,
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
  const [busyAction, setBusyAction] = useState<"save" | "test" | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    setDraft(aiSettings);
  }, [aiSettings]);

  useEffect(() => {
    setGameDraft(preferences);
  }, [preferences]);

  const aiModeLabel = runtimeAiConfig ? "实时异象" : draft.enabled ? "待验证" : "回退模式";
  const keyStatus = draft.apiKey.trim() ? "已录入" : "未录入";
  const normalizedDraft = useMemo(() => normalizeAiSettings(draft), [draft]);
  const normalizedSavedAi = useMemo(() => normalizeAiSettings(aiSettings), [aiSettings]);
  const normalizedGameDraft = useMemo(() => normalizePreferences(gameDraft), [gameDraft]);
  const normalizedSavedGame = useMemo(() => normalizePreferences(preferences), [preferences]);
  const hasAiChanges = JSON.stringify(normalizedDraft) !== JSON.stringify(normalizedSavedAi);
  const hasAudioChanges = JSON.stringify(normalizedGameDraft) !== JSON.stringify(normalizedSavedGame);
  const hasUnsavedChanges = hasAiChanges || hasAudioChanges;
  const canTestConnection = Boolean(
    normalizedDraft.enabled && normalizedDraft.model && normalizedDraft.apiKey,
  );
  const checklist = useMemo(
    () => buildSettingsChecklist(draft, gameDraft, runtimeAiConfig),
    [draft, gameDraft, runtimeAiConfig],
  );
  const readyChecklistCount = checklist.filter((item) => item.state === "ready").length;
  const connectionTone = getConnectionFeedbackTone(status);
  const saveButtonLabel = busyAction === "save" ? "保存中..." : hasUnsavedChanges ? "保存设置" : "已同步";
  const testButtonLabel = busyAction === "test" ? "测试中..." : "测试连接";
  const saveStateSummary = hasUnsavedChanges ? "草稿待保存" : "草稿与已保存设置一致";
  const testStateSummary = canTestConnection
    ? "当前草稿已具备连接测试条件。"
    : "先启用 AI 并补齐模型与 API Key，之后才能测试。";
  const connectionMessage =
    status ||
    (canTestConnection
      ? "当前尚未执行连接测试。你可以直接用当前草稿发起验证。"
      : "当前草稿还不具备连接测试条件。");
  const readinessStepLabel = runtimeAiConfig ? "已接入" : draft.enabled ? "待补全" : "回退模式";
  const readinessStepMessage = runtimeAiConfig
    ? `AI 异象已启用，当前模型为 ${runtimeAiConfig.model}。`
    : draft.enabled
      ? "AI 草稿已开启，但仍需要补齐模型或密钥后才能通过连接测试。"
      : "当前使用回退模式，剧情仍会稳定运行。";
  const draftStepLabel = hasUnsavedChanges ? "有改动" : "已同步";
  const draftStepMessage = hasUnsavedChanges
    ? "当前草稿和已保存设置不同，建议先保存再继续测试。"
    : "当前草稿与已保存设置一致。若要快速回滚，可直接载入存档。";
  const settingsOverview = useMemo(
    () =>
      buildSettingsOverview(checklist, runtimeAiConfig, status, {
        aiModeLabel,
        keyStatus,
        canTestConnection,
      }),
    [checklist, runtimeAiConfig, status, aiModeLabel, keyStatus, canTestConnection],
  );
  const controlSignals = [
    {
      label: "模式",
      value: aiModeLabel,
      note: runtimeAiConfig ? runtimeAiConfig.model : "当前使用本地回退叙事",
    },
    {
      label: "草稿",
      value: hasUnsavedChanges ? "待保存" : "已同步",
      note: hasAiChanges || hasAudioChanges ? "检测到未保存改动" : "当前与已保存设置一致",
    },
    {
      label: "清单",
      value: `${readyChecklistCount}/${checklist.length}`,
      note: `连接：${settingsOverview.connectionLabel}`,
    },
    {
      label: "音效",
      value: gameDraft.sfxEnabled ? `${Math.round(gameDraft.sfxVolume * 100)}%` : "关闭",
      note: hasAudioChanges ? "本地偏好草稿已改动" : "本地偏好已同步",
    },
  ] as const;

  async function onSave() {
    setBusyAction("save");
    try {
      await persistAiSettings(normalizedDraft);
      persistGamePreferences(normalizedGameDraft);
      setStatus("设置已保存。");
    } finally {
      setBusyAction(null);
    }
  }

  async function onTest() {
    setBusyAction("test");
    setStatus("测试连接中...");
    try {
      const result = await testAiConnection(normalizedDraft);
      setStatus(result);
    } finally {
      setBusyAction(null);
    }
  }

  function restoreSavedDraft() {
    setDraft(aiSettings);
    setGameDraft(preferences);
    setStatus("已恢复到当前已保存设置。");
  }

  function restoreDefaultDraft() {
    setDraft(AI_SETTINGS_DEFAULTS);
    setGameDraft(DEFAULT_GAME_PREFERENCES);
    setStatus("已恢复默认草稿，保存后才会正式生效。");
  }

  return (
    <div className="workshop-page">
      <section className="workshop-hero-card workshop-hero-card--compact workshop-hero-card--mobile-tight settings-page__hero reveal-up">
        <div className="settings-page__hero-layout">
          <div className="settings-page__hero-copy">
            <p className="workshop-hero-card__eyebrow">控制台</p>
            <h2 className="workshop-hero-card__title">工坊设置</h2>
            <p className="workshop-hero-card__lead">
              设置页现在优先回答三件事：当前配置是否能生效、哪些草稿尚未保存、以及你是否已经具备连接测试条件。
            </p>
            <div className="workshop-hero-card__meta">
              <span className="workshop-pill">当前模式：{aiModeLabel}</span>
              <span className="workshop-pill">草稿：{hasUnsavedChanges ? "待保存" : "已同步"}</span>
              <span className="workshop-pill">检查清单：{readyChecklistCount}/{checklist.length}</span>
            </div>

            <div className="settings-page__focus-card">
              <span className="settings-page__focus-label">当前控制焦点</span>
              <strong className="settings-page__focus-title">{settingsOverview.headline}</strong>
              <p className="settings-page__focus-copy">{settingsOverview.detail}</p>
              <div className="settings-page__focus-actions">
                <button
                  type="button"
                  onClick={onSave}
                  disabled={busyAction === "save" || !hasUnsavedChanges}
                  className="settings-action-button settings-action-button--primary"
                >
                  {saveButtonLabel}
                </button>
                <button
                  type="button"
                  onClick={onTest}
                  disabled={busyAction === "test" || !canTestConnection}
                  className="settings-action-button settings-action-button--secondary"
                >
                  {testButtonLabel}
                </button>
              </div>
              <p className="settings-page__focus-note">{connectionMessage}</p>
            </div>
          </div>

          <div className="settings-page__hero-rail">
            <div className="settings-page__hero-stats">
              {controlSignals.map((item) => (
                <div key={item.label} className="settings-page__hero-stat">
                  <span className="settings-page__hero-stat-label">{item.label}</span>
                  <strong className="settings-page__hero-stat-value">{item.value}</strong>
                  <span className="settings-page__hero-stat-note">{item.note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="workshop-page__grid settings-page__grid xl:grid-cols-[minmax(0,1.16fr)_21rem]">
        <section className="space-y-4 reveal-up">
          <article className="ritual-card ritual-card--mobile-tight rounded-2xl p-5">
            <div className="settings-page__section-head">
              <div className="min-w-0 flex-1">
                <p className="ritual-card__eyebrow">控制操作</p>
                <h3 className="ritual-card__title">设置操作台</h3>
                <p className="ritual-card__copy">把最常用的保存、测试、回滚操作集中到这里，避免在页首重复展示完整流程说明。</p>
              </div>
              <div className="ritual-chip-row">
                <span className="ritual-chip">AI 草稿：{hasAiChanges ? "已改动" : "未改动"}</span>
                <span className="ritual-chip">音效草稿：{hasAudioChanges ? "已改动" : "未改动"}</span>
              </div>
            </div>

            <div className="settings-page__operation-grid mt-4">
              <div className="settings-page__operation-card">
                <span className="settings-page__operation-label">确认当前生效条件</span>
                <strong className="settings-page__operation-value">{readinessStepLabel}</strong>
                <p className="settings-page__operation-copy">{readinessStepMessage}</p>
              </div>

              <div className="settings-page__operation-card">
                <span className="settings-page__operation-label">处理草稿</span>
                <strong className="settings-page__operation-value">{draftStepLabel}</strong>
                <p className="settings-page__operation-copy">{draftStepMessage}</p>
                <div className="settings-page__operation-actions">
                  <button
                    type="button"
                    onClick={restoreSavedDraft}
                    className="game-button rounded border border-[#6b5b37] bg-[#efe3c4] px-3 py-2 text-sm hover:bg-[#e6d3a7]"
                  >
                    载入存档
                  </button>
                  <button
                    type="button"
                    onClick={restoreDefaultDraft}
                    className="game-button rounded border border-[#7a5442] bg-[#f0d6c8] px-3 py-2 text-sm hover:bg-[#e7c2ad]"
                  >
                    恢复默认
                  </button>
                </div>
              </div>
            </div>
          </article>

          <article className="ritual-card rounded-2xl p-5">
            <p className="ritual-card__eyebrow">AI 异象来源</p>
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
                <span className="ritual-field__hint">OpenAI 兼容接口地址。若留空，保存时会回退到默认值。</span>
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
                  <span className="ritual-field__hint">用于生成随机异象文本，可先填写草稿再决定是否启用。</span>
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
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="ritual-field__label">API Key</span>
                      <span className="ritual-field__hint block">浏览器本地加密保存，当前状态：{keyStatus}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowApiKey((value) => !value)}
                      className="game-button rounded border border-[#8f7448]/18 bg-[rgba(255,252,245,0.72)] px-2.5 py-1 text-xs text-[#6a512a] hover:bg-[rgba(246,236,208,0.94)]"
                    >
                      {showApiKey ? "隐藏" : "显示"}
                    </button>
                  </div>
                  <input
                    type={showApiKey ? "text" : "password"}
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
            <p className="ritual-card__eyebrow">仪式音效</p>
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
                <span className="ritual-field__hint">当前草稿输出强度：{Math.round(gameDraft.sfxVolume * 100)}%</span>
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
                  onClick={() => previewSfx("tap", gameDraft)}
                  className="game-button rounded border border-[#6b5b37] bg-[#efe3c4] px-2.5 py-1 text-xs hover:bg-[#e6d3a7]"
                >
                  试听按键
                </button>
                <button
                  type="button"
                  onClick={() => previewSfx("transmute_success", gameDraft)}
                  className="game-button rounded border border-[#6b5b37] bg-[#efe3c4] px-2.5 py-1 text-xs hover:bg-[#e6d3a7]"
                >
                  试听炼成
                </button>
              </div>
            </div>
          </article>
        </section>

        <aside className="workshop-page__sidebar settings-sidebar reveal-up reveal-delay-2">
          <section className="ritual-card settings-sidebar__card settings-sidebar__card--overview rounded-2xl p-4">
            <p className="ritual-card__eyebrow">校验清单</p>
            <h3 className="ritual-card__title">检查清单</h3>
            <div className={`settings-page__sidebar-summary mt-4 ${getOverviewToneClasses(settingsOverview.tone)}`}>
              <div className="settings-page__sidebar-summary-head">
                <p className="settings-page__sidebar-summary-title">{settingsOverview.headline}</p>
                <span className="settings-page__sidebar-summary-count">
                  就绪 {settingsOverview.readinessCount}/{settingsOverview.totalCount}
                </span>
              </div>
              <p className="settings-page__sidebar-summary-detail">{settingsOverview.detail}</p>
            </div>
            <div className="ritual-list mt-4">
              {checklist.map((item) => (
                <div key={item.id} className={`settings-overview-item ${getChecklistToneClasses(item.state)}`}>
                  <div className="settings-overview-item__head">
                    <p className="settings-overview-item__title">{item.label}</p>
                    <span className="settings-overview-item__state">
                      {item.state === "ready" ? "就绪" : item.state === "attention" ? "待补全" : "待机"}
                    </span>
                  </div>
                  <p className="settings-overview-item__detail">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className={`settings-overview-connection mt-4 ${getConnectionToneClasses(connectionTone)}`}>
              <div className="settings-overview-connection__head">
                <p className="settings-overview-connection__title">连接反馈</p>
                <span className="settings-overview-connection__state">{settingsOverview.connectionLabel}</span>
              </div>
              <p className="settings-overview-connection__detail">{connectionMessage}</p>
            </div>
          </section>

          <section className="ritual-card settings-sidebar__card settings-sidebar__card--security rounded-2xl p-4">
            <p className="ritual-card__eyebrow">安全说明</p>
            <h3 className="ritual-card__title">安全说明</h3>
            <div className="ritual-list mt-4">
              <div className="ritual-list__item">
                <p className="text-sm leading-7 text-[#4f3b1d]">
                  API Key 会在浏览器本地经由 Web Crypto 处理后存储。它适合防误读，不等同于服务器级密钥管理。
                </p>
              </div>
              <div className="ritual-list__item">
                <p className="text-sm leading-7 text-[#4f3b1d]">
                  网页版为纯静态站点，请求由浏览器直接发往你填写的接口，不经过任何中间服务器；因此该接口需要允许跨域（CORS）访问。
                </p>
              </div>
              <div className="ritual-list__item">
                <p className="text-sm leading-7 text-[#4f3b1d]">
                  数值结算仍在本地完成，AI 仅参与文本生成，不接管规则判断。
                </p>
              </div>
            </div>
          </section>

        </aside>
      </div>

      <GrandWorkAgenda
        game={game}
        currentRoute="settings"
        mobileVariant="compact"
        desktopVariant="collapsed"
      />
    </div>
  );
}
