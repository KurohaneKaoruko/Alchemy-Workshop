import {
  EQUIVALENT_OUTPUT_OPTIONS,
  RESOURCE_LABELS,
  RESOURCE_VALUES,
} from "@/features/game/data/resourceMeta";
import {
  evaluateRankProgression,
  getStoryDiscoveryRule,
  rankToIndex,
} from "@/features/game/logic/progression";
import {
  consumeTransmutationEffects,
  appendJournal,
  createJournalEntry,
  withRankUnlockedRecipes,
} from "@/features/game/state";
import {
  clamp,
  consumeResources,
  hasEnoughResources,
  mergeResourceDelta,
} from "@/features/game/logic/utils";
import {
  RANK_ORDER,
  type GameState,
  type Rank,
  type ResourceKey,
  type ResourcePool,
} from "@/features/game/types";

const MAX_VIGOR = 12;
const STRICT_FORMULA_OUTPUTS: ResourceKey[] = ["philosopherSeed", "philosopherStone"];
const RANDOM_EXCHANGE_OUTPUTS: ResourceKey[] = EQUIVALENT_OUTPUT_OPTIONS.filter(
  (resource) => !STRICT_FORMULA_OUTPUTS.includes(resource),
);

export interface CircleRequest {
  offered: Partial<ResourcePool>;
}

export interface ArcaneFormula {
  id: string;
  name: string;
  minRank: Rank;
  ingredients: Partial<ResourcePool>;
  output: {
    resource: ResourceKey;
    amount: number;
  };
  lore: string;
}

export interface CircleResult {
  state: GameState;
  success: boolean;
  message: string;
  formulaMatched?: ArcaneFormula;
  consumedValue: number;
  producedValue: number;
  producedResources?: Partial<ResourcePool>;
}

export interface FormulaGuidance {
  formulaId: string;
  formulaName: string;
  outputLabel: string;
  status: "locked_rank" | "missing_prerequisite" | "missing_stats" | "ready_to_research";
  recommendations: string[];
}

const STORY_ACTION_LABELS: Record<string, string> = {
  study: "研读残页",
  gather: "采集原料",
  distill: "看炉蒸馏",
  lecture: "公开演示",
  meditate: "午夜冥想",
  emerald_tablet: "解读翠玉录",
};

export const ARCANE_FORMULAS: ArcaneFormula[] = [
  {
    id: "triad_prime",
    name: "三元初衡",
    minRank: "学徒",
    ingredients: {
      ash: 2,
      ironSand: 2,
      moonDew: 1,
    },
    output: {
      resource: "salt",
      amount: 3,
    },
    lore: "黑土之盐在环纹中心凝成白光，最初秩序被确立。",
  },
  {
    id: "mercurial_ladder",
    name: "汞梯升华",
    minRank: "炼金士",
    ingredients: {
      sulfur: 2,
      mercury: 2,
      moonDew: 1,
    },
    output: {
      resource: "aetherDust",
      amount: 2,
    },
    lore: "汞雾沿符线攀升，像一架倒悬的阶梯通往高处。",
  },
  {
    id: "great_conjunction",
    name: "日月合契",
    minRank: "大炼金士",
    ingredients: {
      sunShard: 2,
      moonDew: 2,
      mercury: 2,
      aetherDust: 1,
    },
    output: {
      resource: "philosopherSeed",
      amount: 1,
    },
    lore: "天上与地下短暂重叠，贤者种在圆阵中心缓缓发亮。",
  },
  {
    id: "philosopher_stone",
    name: "赤红完成",
    minRank: "贤者候补",
    ingredients: {
      philosopherSeed: 2,
      aetherDust: 5,
      sunShard: 2,
      moonDew: 2,
    },
    output: {
      resource: "philosopherStone",
      amount: 1,
    },
    lore: "赤红之核在你掌中稳定，贤者之石已然完成。",
  },
];

function settleActionTurn(state: GameState): GameState {
  if (state.actionsLeft > 0) {
    return state;
  }

  const withEntry = appendJournal(
    state,
    createJournalEntry({
      day: state.day,
      type: "system",
      title: "炉环休止",
      body: "你擦净魔法阵铜纹，等待下一轮日升。",
    }),
  );

  return {
    ...withEntry,
    day: withEntry.day + 1,
    actionsLeft: 3,
    vigor: clamp(withEntry.vigor + 2, 0, MAX_VIGOR),
  };
}

function normalizeOffer(offer: Partial<ResourcePool>): Partial<ResourcePool> {
  const normalized: Partial<ResourcePool> = {};
  for (const key of Object.keys(RESOURCE_VALUES) as ResourceKey[]) {
    const amount = Math.max(0, Math.floor(offer[key] ?? 0));
    if (amount > 0) {
      normalized[key] = amount;
    }
  }
  return normalized;
}

function isExactIngredientMatch(
  source: Partial<ResourcePool>,
  target: Partial<ResourcePool>,
): boolean {
  const allKeys = Object.keys(RESOURCE_VALUES) as ResourceKey[];
  return allKeys.every((key) => (source[key] ?? 0) === (target[key] ?? 0));
}

function hasRankForFormula(currentRank: Rank, formulaRank: Rank): boolean {
  return rankToIndex(currentRank) >= rankToIndex(formulaRank);
}

function getOfferValue(offer: Partial<ResourcePool>): number {
  return (Object.keys(RESOURCE_VALUES) as ResourceKey[]).reduce((total, key) => {
    return total + (offer[key] ?? 0) * RESOURCE_VALUES[key];
  }, 0);
}

function pickWeightedItem<T>(items: T[], weights: number[], rng = Math.random): T {
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  const normalizedTotal = totalWeight > 0 ? totalWeight : items.length;
  let threshold = rng() * normalizedTotal;

  for (let index = 0; index < items.length; index += 1) {
    threshold -= weights[index] > 0 ? weights[index] : 1;
    if (threshold <= 0) {
      return items[index];
    }
  }
  return items[items.length - 1];
}

function buildRandomEquivalentOutput(
  totalValue: number,
  effectTotals: {
    toleranceBonus: number;
    tolerancePenalty: number;
    yieldBonus: number;
  },
  rng = Math.random,
): Partial<ResourcePool> | null {
  if (totalValue <= 0) {
    return null;
  }

  const sortedPool = [...RANDOM_EXCHANGE_OUTPUTS].sort(
    (left, right) => RESOURCE_VALUES[right] - RESOURCE_VALUES[left],
  );

  const output: Partial<ResourcePool> = {};
  let remaining = totalValue;
  let guard = 0;

  while (remaining > 0 && guard < 512) {
    guard += 1;
    const candidates = sortedPool.filter((resource) => RESOURCE_VALUES[resource] <= remaining);
    if (candidates.length === 0) {
      return null;
    }

    const maxValue = RESOURCE_VALUES[candidates[0]];
    const minValue = RESOURCE_VALUES[candidates[candidates.length - 1]];
    const range = Math.max(1, maxValue - minValue);
    const weights = candidates.map((resource) => {
      const value = RESOURCE_VALUES[resource];
      const highTierRatio = (value - minValue) / range;
      const lowTierRatio = 1 - highTierRatio;
      const weight =
        1 +
        effectTotals.toleranceBonus * highTierRatio +
        (effectTotals.tolerancePenalty + effectTotals.yieldBonus) * lowTierRatio;
      return Math.max(0.1, weight);
    });

    const picked = pickWeightedItem(candidates, weights, rng);
    output[picked] = (output[picked] ?? 0) + 1;
    remaining -= RESOURCE_VALUES[picked];
  }

  return remaining === 0 ? output : null;
}

function formatOutputResources(resources: Partial<ResourcePool>): string {
  const keys = (Object.keys(resources) as ResourceKey[]).filter((key) => (resources[key] ?? 0) > 0);
  if (keys.length === 0) {
    return "无";
  }
  return keys
    .sort((left, right) => RESOURCE_VALUES[right] - RESOURCE_VALUES[left])
    .map((key) => `${RESOURCE_LABELS[key]}x${resources[key] ?? 0}`)
    .join("、");
}

function findFormulaMatch(state: GameState, offer: Partial<ResourcePool>): ArcaneFormula | undefined {
  return ARCANE_FORMULAS.find((formula) => {
    return hasRankForFormula(state.rank, formula.minRank) && isExactIngredientMatch(offer, formula.ingredients);
  });
}

function rankToIndexSafe(rank: Rank): number {
  return RANK_ORDER.indexOf(rank);
}

function getEffectTotals(state: GameState): {
  toleranceBonus: number;
  tolerancePenalty: number;
  yieldBonus: number;
} {
  return state.activeEffects.reduce(
    (acc, effect) => {
      if (effect.kind === "tolerance_bonus") {
        acc.toleranceBonus += effect.value;
      } else if (effect.kind === "tolerance_penalty") {
        acc.tolerancePenalty += effect.value;
      } else if (effect.kind === "yield_bonus") {
        acc.yieldBonus += effect.value;
      }
      return acc;
    },
    {
      toleranceBonus: 0,
      tolerancePenalty: 0,
      yieldBonus: 0,
    },
  );
}

function formatEffectHint(state: GameState): string {
  if (state.activeEffects.length === 0) {
    return "";
  }
  const notes = state.activeEffects.map((effect) => `${effect.label}(${effect.remainingTransmutations})`);
  return ` 当前效果：${notes.join(" / ")}。`;
}

function getFormulaById(formulaId: string): ArcaneFormula | undefined {
  return ARCANE_FORMULAS.find((formula) => formula.id === formulaId);
}

export function getNextFormulaGuidance(state: GameState): FormulaGuidance | null {
  const target = ARCANE_FORMULAS.find((formula) => !state.discoveredFormulas.includes(formula.id));
  if (!target) {
    return null;
  }

  const base = {
    formulaId: target.id,
    formulaName: target.name,
    outputLabel: RESOURCE_LABELS[target.output.resource],
  };
  const rule = getStoryDiscoveryRule(target.id);

  if (rankToIndex(state.rank) < rankToIndex(target.minRank)) {
    return {
      ...base,
      status: "locked_rank",
      recommendations: [
        `先提升到「${target.minRank}」后才能稳定破译此定式。`,
        "优先在剧情页执行探索行动，提升知识、熟练与名望。",
      ],
    };
  }

  if (rule?.requireKnown && !state.discoveredFormulas.includes(rule.requireKnown)) {
    const preFormula = getFormulaById(rule.requireKnown);
    return {
      ...base,
      status: "missing_prerequisite",
      recommendations: [
        `先破译前置定式「${preFormula?.name ?? rule.requireKnown}」。`,
        "剧情里优先选择“解读翠玉录”与“午夜冥想”。",
      ],
    };
  }

  if (rule && (state.knowledge < rule.minKnowledge || state.mastery < rule.minMastery)) {
    return {
      ...base,
      status: "missing_stats",
      recommendations: [
        `目标属性：知识 ≥ ${rule.minKnowledge}，熟练 ≥ ${rule.minMastery}。`,
        `建议动作：${rule.actions.map((action) => STORY_ACTION_LABELS[action]).join(" / ")}。`,
      ],
    };
  }

  const formulaMaterials = Object.entries(target.ingredients)
    .map(([key, amount]) => `${RESOURCE_LABELS[key as ResourceKey]}x${amount}`)
    .join(" + ");
  return {
    ...base,
    status: "ready_to_research",
    recommendations: [
      rule
        ? `剧情页优先执行：${rule.actions.map((action) => STORY_ACTION_LABELS[action]).join(" / ")}。`
        : "继续推进剧情并尝试高价值炼成。",
      `炼金阵目标组合：${formulaMaterials}。`,
    ],
  };
}

function markFormulaDiscovered(state: GameState, formula: ArcaneFormula): GameState {
  if (state.discoveredFormulas.includes(formula.id)) {
    return state;
  }

  return appendJournal(
    {
      ...state,
      discoveredFormulas: [...state.discoveredFormulas, formula.id],
    },
    createJournalEntry({
      day: state.day,
      type: "system",
      title: `定式破译：${formula.name}`,
      body: `你在阵纹中捕捉到稳定谐振，成功破译了「${formula.name}」。`,
    }),
  );
}

function findResonanceFormula(state: GameState, offer: Partial<ResourcePool>): ArcaneFormula | undefined {
  const offerKeys = Object.keys(offer).filter((key) => (offer[key as ResourceKey] ?? 0) > 0) as ResourceKey[];

  return ARCANE_FORMULAS.find((formula) => {
    if (state.discoveredFormulas.includes(formula.id)) {
      return false;
    }
    if (!hasRankForFormula(state.rank, formula.minRank)) {
      return false;
    }

    const formulaKeys = Object.keys(formula.ingredients).filter(
      (key) => (formula.ingredients[key as ResourceKey] ?? 0) > 0,
    ) as ResourceKey[];

    if (formulaKeys.length === 0) {
      return false;
    }

    const hasForeign = offerKeys.some((key) => !formulaKeys.includes(key));
    if (hasForeign) {
      return false;
    }

    const overlapCount = formulaKeys.filter((key) => (offer[key] ?? 0) > 0).length;
    return overlapCount >= Math.max(2, formulaKeys.length - 1);
  });
}

function applyCommonSuccessEffects(
  state: GameState,
  offeredValue: number,
  message: string,
): GameState {
  const masteryGain = Math.max(1, Math.floor(offeredValue / 8));
  const knowledgeGain = Math.max(1, Math.floor(offeredValue / 10));
  const reputationGain = rankToIndexSafe(state.rank) >= 2 ? 1 : 0;

  return appendJournal(
    {
      ...state,
      mastery: state.mastery + masteryGain,
      knowledge: state.knowledge + knowledgeGain,
      reputation: state.reputation + reputationGain,
      vigor: clamp(state.vigor - 1, 0, MAX_VIGOR),
      lastActionSummary: message,
    },
    createJournalEntry({
      day: state.day,
      type: "craft",
      title: "魔法阵炼成",
      body: message,
    }),
  );
}

export function transmuteByCircle(state: GameState, request: CircleRequest): CircleResult {
  if (state.ended) {
    return {
      state,
      success: false,
      message: "贤者之石已成，炼金仪式已走到尽头。",
      consumedValue: 0,
      producedValue: 0,
    };
  }

  if (state.actionsLeft <= 0) {
    return {
      state,
      success: false,
      message: "今日行动次数已耗尽。",
      consumedValue: 0,
      producedValue: 0,
    };
  }

  const effectTotals = getEffectTotals(state);
  const effectHint = formatEffectHint(state);
  const offered = normalizeOffer(request.offered);
  const offeredValue = getOfferValue(offered);
  if (offeredValue <= 0) {
    return {
      state,
      success: false,
      message: `请先向魔法阵投入至少一种材料。${effectHint}`,
      consumedValue: 0,
      producedValue: 0,
    };
  }

  if (!hasEnoughResources(state.resources, offered)) {
    return {
      state,
      success: false,
      message: `库存材料不足，无法刻印当前阵式。${effectHint}`,
      consumedValue: offeredValue,
      producedValue: 0,
    };
  }

  const formula = findFormulaMatch(state, offered);
  if (formula) {
    let nextState: GameState = {
      ...state,
      actionsLeft: Math.max(0, state.actionsLeft - 1),
      resources: mergeResourceDelta(consumeResources(state.resources, offered), {
        [formula.output.resource]: formula.output.amount,
      }),
      completedRecipes: state.completedRecipes.includes(formula.id)
        ? state.completedRecipes
        : [...state.completedRecipes, formula.id],
    };

    nextState = markFormulaDiscovered(nextState, formula);

    nextState = applyCommonSuccessEffects(nextState, offeredValue, `${formula.name}触发：${formula.lore}`);

    nextState = withRankUnlockedRecipes(nextState, nextState.rank);

    if (formula.id === "philosopher_stone") {
      nextState = {
        ...nextState,
        rank: "至高炼金术师",
        ended: true,
        ending: "philosopher_stone",
      };
    } else {
      nextState = evaluateRankProgression(nextState).state;
    }

    nextState = consumeTransmutationEffects(nextState);
    nextState = settleActionTurn(nextState);

    return {
      state: nextState,
      success: true,
      message: `${formula.name}已完成。满足定式时，结果必定为 ${formula.output.amount} 份「${RESOURCE_LABELS[formula.output.resource]}」。${effectHint}`,
      formulaMatched: formula,
      consumedValue: offeredValue,
      producedValue: formula.output.amount * RESOURCE_VALUES[formula.output.resource],
      producedResources: {
        [formula.output.resource]: formula.output.amount,
      },
    };
  }

  const resonanceFormula = findResonanceFormula(state, offered);
  const discoveredByResonance = resonanceFormula ? markFormulaDiscovered(state, resonanceFormula) : state;
  const resonanceHint = resonanceFormula
    ? ` 你在余波中破译了「${resonanceFormula.name}」的部分阵式。`
    : "";

  const randomOutput = buildRandomEquivalentOutput(offeredValue, effectTotals);
  if (!randomOutput) {
    return {
      state: discoveredByResonance,
      success: false,
      message: `阵式失衡，未能完成可结算的等价交换。${resonanceHint}${effectHint}`,
      consumedValue: offeredValue,
      producedValue: 0,
    };
  }

  const producedValue = getOfferValue(randomOutput);
  const outputSummary = formatOutputResources(randomOutput);
  const tendencyNotes: string[] = [];
  if (effectTotals.toleranceBonus > 0) {
    tendencyNotes.push("高阶产物权重提升");
  }
  if (effectTotals.tolerancePenalty > 0) {
    tendencyNotes.push("低阶杂质权重提升");
  }
  if (effectTotals.yieldBonus > 0) {
    tendencyNotes.push("细粒产物权重提升");
  }
  const tendencyHint = tendencyNotes.length > 0 ? ` 当前倾向：${tendencyNotes.join("，")}。` : "";

  let nextState: GameState = {
    ...discoveredByResonance,
    actionsLeft: Math.max(0, discoveredByResonance.actionsLeft - 1),
    resources: mergeResourceDelta(
      consumeResources(discoveredByResonance.resources, offered),
      randomOutput,
    ),
  };

  nextState = applyCommonSuccessEffects(
    nextState,
    offeredValue,
    `魔法阵完成等价交换：投入价值 ${offeredValue}，随机产出 ${outputSummary}（总价值 ${producedValue}）。`,
  );
  nextState = evaluateRankProgression(nextState).state;
  nextState = consumeTransmutationEffects(nextState);
  nextState = settleActionTurn(nextState);

  return {
    state: nextState,
    success: true,
    message: `交换成立：投入价值 ${offeredValue}，随机产出 ${outputSummary}（总价值 ${producedValue}）。${tendencyHint}${resonanceHint}${effectHint}`,
    consumedValue: offeredValue,
    producedValue,
    producedResources: randomOutput,
  };
}
