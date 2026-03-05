import { FALLBACK_EVENTS } from "@/features/events/data/fallbackEvents";
import { getCurrentChapter, rankToIndex } from "@/features/game/logic/progression";
import {
  addOrRefreshEffect,
  appendJournal,
  createJournalEntry,
} from "@/features/game/state";
import { clamp, mergeResourceDelta, pickOne } from "@/features/game/logic/utils";
import type {
  AiRuntimeConfig,
  EventContext,
  EventOutcome,
  GameState,
  NarrativeEvent,
  TriggeredEvent,
} from "@/features/game/types";

export const BASE_EVENT_CHANCE = 0.35;

export type NarrativeGenerator = (
  context: EventContext,
  config: AiRuntimeConfig | null,
) => Promise<NarrativeEvent>;

function fallbackNarrative(rng = Math.random): NarrativeEvent {
  const picked = pickOne(FALLBACK_EVENTS, rng);
  return {
    id: `fallback_${Date.now()}_${Math.floor(rng() * 1_000_000)}`,
    source: "fallback",
    ...picked,
  };
}

function applyEventTransientEffects(
  state: GameState,
  event: NarrativeEvent,
  outcome: EventOutcome,
): {
  state: GameState;
  notes: string[];
} {
  let next = state;
  const notes: string[] = [];

  if (outcome.success && (outcome.critical || event.tags.includes("emerald") || event.tags.includes("insight"))) {
    const tolerance = outcome.critical ? 2 : 1;
    next = addOrRefreshEffect(next, {
      kind: "tolerance_bonus",
      label: "衡律祝福",
      description: `等价交换允许 ±${tolerance} 价值偏差（接下来3次炼成）。`,
      value: tolerance,
      remainingTransmutations: 3,
    });
    notes.push(`获得临时效果：衡律祝福（容差 ±${tolerance}）。`);
  }

  if (outcome.success && event.tags.includes("material") && (outcome.critical || event.tags.includes("resource-rich"))) {
    next = addOrRefreshEffect(next, {
      kind: "yield_bonus",
      label: "丰饶回响",
      description: "普通等价交换额外 +1 产物（接下来2次炼成）。",
      value: 1,
      remainingTransmutations: 2,
    });
    notes.push("获得临时效果：丰饶回响（普通交换额外 +1 产物）。");
  }

  if (!outcome.success && (outcome.backlash || event.tags.includes("risk-high"))) {
    next = addOrRefreshEffect(next, {
      kind: "tolerance_penalty",
      label: "紊乱残渣",
      description: "等价交换容差 -1（接下来2次炼成）。",
      value: 1,
      remainingTransmutations: 2,
    });
    notes.push("受到负面效果：紊乱残渣（容差 -1）。");
  }

  return { state: next, notes };
}

export function buildEventContext(
  state: GameState,
  trigger: "choice" | "craft",
): EventContext {
  const chapter = getCurrentChapter(state);
  return {
    day: state.day,
    rank: state.rank,
    chapterTitle: chapter.title,
    trigger,
    lastActionSummary: state.lastActionSummary,
    mastery: state.mastery,
    knowledge: state.knowledge,
    reputation: state.reputation,
  };
}

export function shouldTriggerRandomEvent(
  state: GameState,
  rng = Math.random,
  baseChance = BASE_EVENT_CHANCE,
): boolean {
  if (state.ended) {
    return false;
  }

  const stageBonus = rankToIndex(state.rank) * 0.02;
  const fatiguePenalty = state.vigor <= 2 ? -0.05 : 0;
  const finalChance = clamp(baseChance + stageBonus + fatiguePenalty, 0.1, 0.7);
  return rng() < finalChance;
}

export function resolveEventOutcome(
  state: GameState,
  event: NarrativeEvent,
  rng = Math.random,
): EventOutcome {
  const riskPenalty = event.tags.includes("risk-high")
    ? 0.12
    : event.tags.includes("risk-medium")
      ? 0.06
      : 0.02;
  const bonus = event.tags.includes("insight") ? 0.04 : 0;
  const successRate = clamp(
    0.48 + state.mastery * 0.004 + state.knowledge * 0.0025 + bonus - riskPenalty,
    0.16,
    0.9,
  );
  const roll = rng();
  const success = roll < successRate;
  const critical = success && roll < successRate * 0.25;
  const backlash = !success && rng() > 0.8;

  if (success) {
    const materialGain = event.tags.includes("material")
      ? { moonDew: 1 + Math.floor(rng() * 2) }
      : {};
    const insightGain = event.tags.includes("emerald") ? 2 : 1;
    return {
      success: true,
      critical,
      backlash: false,
      summary: critical
        ? "你在事件中捕捉到极其稀有的共振窗口，收益显著放大。"
        : "你平稳处理了这次异象，并从中提炼出可用经验。",
      delta: {
        knowledge: 1 + insightGain + (critical ? 2 : 0),
        mastery: 1 + (critical ? 2 : 0),
        reputation: event.tags.includes("reputation") ? 1 + (critical ? 1 : 0) : 0,
        vigor: critical ? 1 : 0,
        resources: {
          ...materialGain,
          aetherDust: (event.tags.includes("insight") ? 1 : 0) + (critical ? 1 : 0),
        },
      },
    };
  }

  return {
    success: false,
    critical: false,
    backlash,
    summary: backlash
      ? "仪式余波反噬了炉台，你勉强稳住核心容器。"
      : "事件并未转化为收益，但你记录了重要的失败参数。",
    delta: {
      knowledge: 1,
      mastery: 0,
      reputation: backlash ? -1 : 0,
      vigor: backlash ? -2 : -1,
      resources: backlash ? { ash: 1 } : {},
    },
  };
}

export function applyEventOutcome(
  state: GameState,
  event: NarrativeEvent,
  outcome: EventOutcome,
): GameState {
  const baseNext = {
    ...state,
    knowledge: Math.max(0, state.knowledge + (outcome.delta.knowledge ?? 0)),
    mastery: Math.max(0, state.mastery + (outcome.delta.mastery ?? 0)),
    reputation: Math.max(0, state.reputation + (outcome.delta.reputation ?? 0)),
    vigor: clamp(state.vigor + (outcome.delta.vigor ?? 0), 0, 12),
    resources: mergeResourceDelta(state.resources, outcome.delta.resources ?? {}),
  };
  const effectApplied = applyEventTransientEffects(baseNext, event, outcome);
  const effectSuffix = effectApplied.notes.length > 0 ? ` ${effectApplied.notes.join(" ")}` : "";
  const finalSummary = `${outcome.summary}${effectSuffix}`;
  const next = {
    ...effectApplied.state,
    lastEvent: {
      id: event.id,
      title: event.title,
      body: event.body,
      source: event.source,
      outcomeSummary: finalSummary,
    },
  };

  return appendJournal(
    next,
    createJournalEntry({
      day: state.day,
      type: "event",
      source: event.source,
      title: event.title,
      body: `${event.body}\n${finalSummary}`,
    }),
  );
}

export async function triggerRandomEvent(options: {
  state: GameState;
  trigger: "choice" | "craft";
  aiConfig: AiRuntimeConfig | null;
  generator?: NarrativeGenerator;
  rng?: () => number;
  force?: boolean;
}): Promise<TriggeredEvent | null> {
  const rng = options.rng ?? Math.random;
  if (!options.force && !shouldTriggerRandomEvent(options.state, rng)) {
    return null;
  }

  const context = buildEventContext(options.state, options.trigger);
  const generator = options.generator;

  let event: NarrativeEvent;
  if (!generator || !options.aiConfig?.enabled) {
    event = fallbackNarrative(rng);
  } else {
    try {
      event = await generator(context, options.aiConfig);
      if (!event.title || !event.body) {
        event = fallbackNarrative(rng);
      }
    } catch {
      event = fallbackNarrative(rng);
    }
  }

  const outcome = resolveEventOutcome(options.state, event, rng);
  return { event, outcome };
}
