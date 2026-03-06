"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ARCANE_FORMULAS,
  getNextFormulaGuidance,
} from "@/features/game/logic/alchemyCircle";
import { EndingRitualOverlay } from "@/features/game/components/EndingRitualOverlay";
import { EventCinematicOverlay } from "@/features/game/components/EventCinematicOverlay";
import { RankAscensionOverlay } from "@/features/game/components/RankAscensionOverlay";
import { rankToIndex } from "@/features/game/logic/progression";
import { useWorkshopGame } from "@/features/game/logic/useWorkshopGame";
import {
  CIRCLE_INPUT_ORDER,
  RESOURCE_LABELS,
  RESOURCE_VALUES,
} from "@/features/game/data/resourceMeta";
import type { ResourceKey, ResourcePool } from "@/features/game/types";

const SLOT_POSITIONS = [
  "top-[8%] left-1/2 -translate-x-1/2",
  "top-[24%] left-[20%] -translate-x-1/2",
  "top-[24%] left-[80%] -translate-x-1/2",
  "top-1/2 left-[12%] -translate-x-1/2 -translate-y-1/2",
  "top-1/2 left-[88%] -translate-x-1/2 -translate-y-1/2",
  "top-[76%] left-[20%] -translate-x-1/2 -translate-y-1/2",
  "top-[76%] left-[80%] -translate-x-1/2 -translate-y-1/2",
  "top-[92%] left-1/2 -translate-x-1/2 -translate-y-1/2",
  "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
];

const RESOURCE_KEY_SET = new Set<ResourceKey>(CIRCLE_INPUT_ORDER);

type MaterialSortMode = "stock" | "value" | "name";

interface CircleSlot {
  material: ResourceKey | null;
  amount: number;
}

interface RitualFeedback {
  id: number;
  kind: "success" | "failure";
  body: string;
}

type RingBurstState = "none" | "success" | "fail";

function getEffectTotals(
  effects: Array<{
    kind: string;
    value: number;
  }>,
): {
  toleranceBonus: number;
  tolerancePenalty: number;
  yieldBonus: number;
} {
  return effects.reduce(
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

function createEmptySlots(): CircleSlot[] {
  return SLOT_POSITIONS.map(() => ({
    material: null,
    amount: 0,
  }));
}

function normalizeSlots(slots: CircleSlot[], resources: ResourcePool): CircleSlot[] {
  const used: Partial<Record<ResourceKey, number>> = {};
  return slots.map((slot) => {
    if (!slot.material) {
      return { material: null, amount: 0 };
    }

    const material = slot.material;
    const usedSoFar = used[material] ?? 0;
    const maxAllowed = Math.max(0, resources[material] - usedSoFar);
    const amount = Math.min(Math.max(0, slot.amount), maxAllowed);

    if (amount <= 0) {
      return { material: null, amount: 0 };
    }

    used[material] = usedSoFar + amount;
    return { material, amount };
  });
}

function slotsToOffer(slots: CircleSlot[]): Partial<Record<ResourceKey, number>> {
  return slots.reduce<Partial<Record<ResourceKey, number>>>((acc, slot) => {
    if (!slot.material || slot.amount <= 0) {
      return acc;
    }
    acc[slot.material] = (acc[slot.material] ?? 0) + slot.amount;
    return acc;
  }, {});
}

function formatProducedResources(produced?: Partial<Record<ResourceKey, number>>): string {
  if (!produced) {
    return "";
  }

  const keys = (Object.keys(produced) as ResourceKey[]).filter((key) => (produced[key] ?? 0) > 0);
  if (keys.length === 0) {
    return "";
  }

  return keys
    .sort((left, right) => RESOURCE_VALUES[right] - RESOURCE_VALUES[left])
    .map((key) => `${RESOURCE_LABELS[key]}x${produced[key] ?? 0}`)
    .join("、");
}

function toResourceKey(value: string | null | undefined): ResourceKey | null {
  if (!value) {
    return null;
  }
  return RESOURCE_KEY_SET.has(value as ResourceKey) ? (value as ResourceKey) : null;
}

export default function AlchemyPage() {
  const {
    game,
    busy,
    cinematicEvent,
    rankAscensionCinematic,
    endingCinematic,
    doCircleTransmutation,
    dismissCinematicEvent,
    dismissRankAscensionCinematic,
    dismissEndingCinematic,
  } = useWorkshopGame();
  const [slots, setSlots] = useState<CircleSlot[]>(() => createEmptySlots());
  const [draggingMaterial, setDraggingMaterial] = useState<ResourceKey | null>(null);
  const [resultText, setResultText] = useState("将材料卡片拖入魔法阵槽位，再执行炼成。");
  const [ritualFeedback, setRitualFeedback] = useState<RitualFeedback | null>(null);
  const [ringBurst, setRingBurst] = useState<RingBurstState>("none");
  const [materialQuery, setMaterialQuery] = useState("");
  const [materialSortMode, setMaterialSortMode] = useState<MaterialSortMode>("stock");

  const effectiveSlots = useMemo(
    () => normalizeSlots(slots, game.resources),
    [slots, game.resources],
  );

  const offered = useMemo(() => slotsToOffer(effectiveSlots), [effectiveSlots]);

  const usedMaterials = useMemo(() => {
    return effectiveSlots.reduce<Partial<Record<ResourceKey, number>>>((acc, slot) => {
      if (!slot.material || slot.amount <= 0) {
        return acc;
      }
      acc[slot.material] = (acc[slot.material] ?? 0) + slot.amount;
      return acc;
    }, {});
  }, [effectiveSlots]);

  const inventoryRows = useMemo(() => {
    const keyword = materialQuery.trim();
    const rows = CIRCLE_INPUT_ORDER.map((key) => {
      const stock = game.resources[key];
      const used = usedMaterials[key] ?? 0;
      return {
        key,
        label: RESOURCE_LABELS[key],
        value: RESOURCE_VALUES[key],
        stock,
        used,
        available: Math.max(0, stock - used),
      };
    })
      .filter((row) => (keyword ? row.label.includes(keyword) : true))
      .sort((left, right) => {
        if (materialSortMode === "value") {
          return right.value - left.value || right.stock - left.stock;
        }
        if (materialSortMode === "name") {
          return left.label.localeCompare(right.label, "zh-Hans-CN");
        }
        return right.available - left.available || right.value - left.value;
      });

    return rows;
  }, [materialQuery, materialSortMode, game.resources, usedMaterials]);

  const offeredValue = useMemo(() => {
    return CIRCLE_INPUT_ORDER.reduce((sum, key) => {
      return sum + (offered[key] ?? 0) * RESOURCE_VALUES[key];
    }, 0);
  }, [offered]);

  const discoveredFormulas = useMemo(
    () => new Set(game.discoveredFormulas),
    [game.discoveredFormulas],
  );
  const nextGuidance = getNextFormulaGuidance(game);
  const effectTotals = useMemo(() => getEffectTotals(game.activeEffects), [game.activeEffects]);
  const predictedValue = offeredValue;
  const hasBlessing = effectTotals.toleranceBonus > 0 || effectTotals.yieldBonus > 0;
  const hasCurse = effectTotals.tolerancePenalty > 0;
  const ringEffectClass = hasCurse
    ? "alchemy-ring--chaos"
    : hasBlessing
      ? "alchemy-ring--blessed"
      : "alchemy-ring--neutral";
  const ringBurstClass =
    ringBurst === "success"
      ? "alchemy-ring--burst-success"
      : ringBurst === "fail"
        ? "alchemy-ring--burst-fail"
        : "";
  const canTransmute = !busy && !game.ended && game.actionsLeft > 0;

  useEffect(() => {
    if (!ritualFeedback) {
      return;
    }
    const timer = window.setTimeout(() => {
      setRitualFeedback(null);
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [ritualFeedback]);

  useEffect(() => {
    if (ringBurst === "none") {
      return;
    }
    const timer = window.setTimeout(() => {
      setRingBurst("none");
    }, 680);
    return () => window.clearTimeout(timer);
  }, [ringBurst]);

  function getUsedByOtherSlots(material: ResourceKey, excludeIndex: number, list: CircleSlot[]): number {
    return list.reduce((sum, slot, index) => {
      if (index === excludeIndex || slot.material !== material) {
        return sum;
      }
      return sum + slot.amount;
    }, 0);
  }

  function setSlotMaterial(index: number, material: ResourceKey) {
    setSlots((prev) => {
      const next = [...prev];
      const usedElsewhere = getUsedByOtherSlots(material, index, prev);
      const maxAllowed = Math.max(0, game.resources[material] - usedElsewhere);
      if (maxAllowed <= 0) {
        return prev;
      }

      const current = prev[index];
      const nextAmount =
        current.material === material
          ? Math.min(Math.max(current.amount, 1), maxAllowed)
          : Math.min(1, maxAllowed);

      next[index] = {
        material,
        amount: nextAmount,
      };
      return next;
    });
  }

  function setSlotAmount(index: number, amount: number) {
    setSlots((prev) => {
      const current = prev[index];
      if (!current.material) {
        return prev;
      }

      const usedElsewhere = getUsedByOtherSlots(current.material, index, prev);
      const maxAllowed = Math.max(0, game.resources[current.material] - usedElsewhere);
      const safeAmount = Math.min(Math.max(0, Math.floor(amount)), maxAllowed);
      const next = [...prev];

      if (safeAmount <= 0) {
        next[index] = { material: null, amount: 0 };
      } else {
        next[index] = {
          material: current.material,
          amount: safeAmount,
        };
      }

      return next;
    });
  }

  function clearSlot(index: number) {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = { material: null, amount: 0 };
      return next;
    });
  }

  function quickInsert(material: ResourceKey) {
    const targetIndex = effectiveSlots.findIndex((slot) => !slot.material);
    if (targetIndex < 0) {
      return;
    }
    setSlotMaterial(targetIndex, material);
  }

  async function onTransmute() {
    const result = await doCircleTransmutation({ offered });
    setResultText(result.message);
    setRingBurst(result.success ? "success" : "fail");
    const producedSummary = formatProducedResources(result.producedResources);
    setRitualFeedback({
      id: Date.now(),
      kind: result.success ? "success" : "failure",
      body: result.success
        ? producedSummary
          ? `显化：${producedSummary}`
          : "炼成完成"
        : "阵纹紊乱",
    });
    if (result.success) {
      setSlots(createEmptySlots());
    }
  }

  return (
    <div className="alchemy-workbench">
      <section className="game-panel reveal-up flex min-h-[calc(100dvh-8.5rem)] flex-col overflow-hidden rounded-2xl border border-[#8f7446]/45 bg-[#f6ead2]/95 p-4 shadow-[0_16px_36px_rgba(24,16,8,0.35)] sm:p-5">
        <header className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#8f7446]/35 bg-[#fff6e3] p-3">
          <div>
            <h2 className="text-2xl font-semibold text-[#2d2112]">魔法阵炼金</h2>
            <p className="mt-1 text-sm leading-7 text-[#4f3b1d]">
              把任意材料拖入阵位，按等价交换规则随机显化产物；命中定式时必定炼出定式结果。
            </p>
          </div>
          <div className="grid gap-1 text-right text-xs text-[#5d4825] sm:text-sm">
            <p>
              投入价值：<strong>{offeredValue}</strong>
            </p>
            <p>
              预计显化价值：<strong>{predictedValue}</strong>
            </p>
            <p>今日行动：{game.actionsLeft}/3</p>
          </div>
        </header>

        <div className="mt-4 grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_23rem]">
          <div className="relative flex min-h-[21rem] items-center justify-center rounded-2xl border border-[#8f7446]/35 bg-[radial-gradient(circle_at_50%_30%,#fff4dd_0%,#f2e0bc_42%,#d2ad6b_100%)] px-2 py-3 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.4)] sm:min-h-[23rem] sm:px-4">
            <div
              className={`alchemy-ring relative aspect-square w-full max-w-[30rem] ${ringEffectClass} ${ringBurstClass} sm:max-w-[32rem]`}
            >
              <div className="alchemy-ring__pulse" />
              <div className="alchemy-ring__glow" />
              <div className="alchemy-ring__burst" />
              <div className="absolute inset-[14%] rounded-full border border-[#735630]/70" />
              <div className="absolute inset-[28%] rounded-full border border-[#735630]/70" />
              <div className="absolute inset-[42%] rounded-full border border-[#735630]/70" />

              {effectiveSlots.map((slot, index) => (
                <div
                  key={`slot-${index}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const dropped = toResourceKey(event.dataTransfer.getData("text/plain"))
                      ?? draggingMaterial;
                    if (dropped) {
                      setSlotMaterial(index, dropped);
                    }
                    setDraggingMaterial(null);
                  }}
                  className={`absolute ${SLOT_POSITIONS[index]} w-[5.6rem] rounded-lg border px-1.5 py-1 text-[10px] shadow-sm transition sm:w-[6.2rem] sm:px-2 sm:text-xs lg:w-[7rem] ${
                    slot.material
                      ? "alchemy-slot--filled border-[#6b5b37]/70 bg-[#fff8e6]/95"
                      : "alchemy-slot--empty border-dashed border-[#8f7c57]/70 bg-[#fff9ed]/80"
                  }`}
                >
                  {slot.material ? (
                    <>
                      <p className="font-semibold">
                        {RESOURCE_LABELS[slot.material]}（{RESOURCE_VALUES[slot.material]}）
                      </p>
                      <input
                        type="number"
                        min={0}
                        max={game.resources[slot.material]}
                        value={slot.amount}
                        onChange={(event) =>
                          setSlotAmount(index, Number.parseInt(event.target.value || "0", 10) || 0)
                        }
                        className="mt-1 w-full rounded border border-[#88724a]/50 bg-[#fffdf8] px-1 py-0.5 text-xs"
                      />
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <span className="opacity-75">库存 {game.resources[slot.material]}</span>
                        <button
                          type="button"
                          onClick={() => clearSlot(index)}
                          className="game-button rounded border border-[#8c7752]/45 px-1 text-[10px] hover:bg-[#f1e4c5]"
                        >
                          清空
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="py-3 text-center opacity-65">拖入</p>
                  )}
                </div>
              ))}

              <div className="pointer-events-none absolute left-1/2 top-[16%] -translate-x-1/2">
                {game.activeEffects.length > 0 ? (
                  <div className="flex flex-wrap justify-center gap-1 rounded border border-[#7f6b46]/45 bg-[#fff8e8]/90 px-2 py-1 text-[10px]">
                    {game.activeEffects.map((effect) => (
                      <span
                        key={effect.id}
                        className="rounded border border-[#8d7a56]/45 bg-[#fdf6e6] px-1.5 py-0.5"
                      >
                        {effect.kind === "tolerance_bonus"
                          ? "T+"
                          : effect.kind === "tolerance_penalty"
                            ? "T-"
                            : "Y+"}
                        {effect.value} · {effect.remainingTransmutations}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              {ritualFeedback ? (
                <div
                  key={ritualFeedback.id}
                  className={`ritual-feedback ritual-feedback--${ritualFeedback.kind}`}
                >
                  <p className="ritual-feedback__title">
                    {ritualFeedback.kind === "success" ? "Ritual Complete" : "Ritual Disrupted"}
                  </p>
                  <p className="ritual-feedback__body">{ritualFeedback.body}</p>
                </div>
              ) : null}
            </div>
          </div>

          <aside className="min-h-0 space-y-3 overflow-auto pr-1">
            <details className="alchemy-fold" open>
              <summary className="alchemy-fold__summary">背包与投料</summary>
              <div className="alchemy-fold__content">
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    type="text"
                    value={materialQuery}
                    onChange={(event) => setMaterialQuery(event.target.value)}
                    placeholder="搜索材料"
                    className="rounded-md border border-[#8c7548]/40 bg-[#fffdf6] px-2.5 py-1.5 text-sm text-[#3f2f18]"
                  />
                  <select
                    value={materialSortMode}
                    onChange={(event) => setMaterialSortMode(event.target.value as MaterialSortMode)}
                    className="rounded-md border border-[#8c7548]/40 bg-[#fffdf6] px-2 py-1.5 text-sm text-[#3f2f18]"
                  >
                    <option value="stock">按可投数量</option>
                    <option value="value">按价值</option>
                    <option value="name">按名称</option>
                  </select>
                </div>
                <ul className="mt-2 space-y-2">
                  {inventoryRows.map((item) => (
                    <li
                      key={item.key}
                      draggable={item.available > 0}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", item.key);
                        setDraggingMaterial(item.key);
                      }}
                      onDragEnd={() => setDraggingMaterial(null)}
                      className={`game-action-card rounded-lg border p-2 text-xs ${
                        item.available > 0
                          ? "cursor-grab border-[#7d6a45]/55 bg-[#fffdf5] hover:bg-[#f4e7ca]"
                          : "cursor-not-allowed border-[#8f846f]/35 bg-[#f0e9d8] opacity-70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-[#3f2f18]">
                          {item.label}（{item.value}）
                        </p>
                        <button
                          type="button"
                          onClick={() => quickInsert(item.key)}
                          disabled={item.available <= 0}
                          className="game-button rounded border border-[#7d6a45]/45 px-1.5 py-0.5 text-[11px] hover:bg-[#f1e4c5] disabled:opacity-60"
                        >
                          放入空槽
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] text-[#4d3b1f]">
                        库存 {item.stock} · 阵内占用 {item.used} · 可投 {item.available}
                      </p>
                    </li>
                  ))}
                  {inventoryRows.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-[#8f846f]/45 bg-[#f0e9d8] px-2 py-3 text-xs text-[#5e4d30]">
                      未找到匹配材料。
                    </li>
                  ) : null}
                </ul>
              </div>
            </details>

            <details className="alchemy-fold">
              <summary className="alchemy-fold__summary">炼金临时效应</summary>
              <div className="alchemy-fold__content">
                {game.activeEffects.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {game.activeEffects.map((effect) => (
                      <li
                        key={effect.id}
                        className="rounded border border-[#8b7954]/35 bg-[#fff8e8] p-2"
                      >
                        <p className="font-semibold">{effect.label}</p>
                        <p className="mt-1 opacity-85">{effect.description}</p>
                        <p className="text-xs opacity-75">剩余炼成：{effect.remainingTransmutations}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-7 opacity-80">
                    当前无临时效应。你可在剧情页触发随机事件获得祝福或负面状态。
                  </p>
                )}
              </div>
            </details>

            <details className="alchemy-fold">
              <summary className="alchemy-fold__summary">定式图谱（必出）</summary>
              <div className="alchemy-fold__content">
                {nextGuidance ? (
                  <div className="rounded border border-[#8b7954]/35 bg-[#fff8e8] p-2 text-sm">
                    <p className="font-semibold">当前建议：{nextGuidance.formulaName}</p>
                    <ul className="mt-1 list-disc pl-5">
                      {nextGuidance.recommendations.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <ul className="mt-2 space-y-2 text-sm">
                  {ARCANE_FORMULAS.map((formula) => {
                    const unlocked = rankToIndex(game.rank) >= rankToIndex(formula.minRank);
                    const discovered = discoveredFormulas.has(formula.id);
                    return (
                      <li
                        key={formula.id}
                        className={`rounded-lg border p-2 ${
                          unlocked
                            ? "border-[#7b6944]/50 bg-[#fff8e6]"
                            : "border-[#8d7f63]/35 bg-[#f4ecda] opacity-70"
                        }`}
                      >
                        <p className="font-semibold">{discovered ? formula.name : "未解析定式"}</p>
                        <p className="mt-1 text-xs">
                          需求境界：{formula.minRank}
                          {unlocked ? "（可触发）" : "（未达成）"}
                        </p>
                        {discovered ? (
                          <>
                            <p className="mt-1 text-xs leading-6">
                              材料：
                              {Object.entries(formula.ingredients)
                                .map(
                                  ([key, value]) =>
                                    `${RESOURCE_LABELS[key as ResourceKey]}x${value}`,
                                )
                                .join(" + ")}
                            </p>
                            <p className="text-xs leading-6">
                              结果：{RESOURCE_LABELS[formula.output.resource]} x {formula.output.amount}
                            </p>
                          </>
                        ) : (
                          <p className="mt-1 text-xs leading-6 opacity-75">
                            尚未破译。尝试接近正确组合，捕捉阵纹共振以解锁细节。
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </details>
          </aside>
        </div>

        <div className="mt-4 grid gap-3 rounded-xl border border-[#8f7446]/35 bg-[#fff6e3] p-3 xl:grid-cols-[1fr_auto] xl:items-center">
          <div className="rounded-lg border border-[#8f7446]/30 bg-[#fffdf6] p-2 text-sm leading-7 text-[#4f3b1d]">
            {resultText}
          </div>
          <button
            type="button"
            onClick={onTransmute}
            disabled={!canTransmute}
            className="game-button rounded-lg border border-[#6b5b37] bg-[#ead8aa] px-4 py-2 text-sm font-semibold hover:bg-[#dfc993] disabled:cursor-not-allowed disabled:opacity-60"
          >
            刻印炼成
          </button>
        </div>
      </section>

      <EventCinematicOverlay
        key={cinematicEvent?.id ?? "cinematic-none"}
        event={cinematicEvent}
        onClose={dismissCinematicEvent}
      />
      <RankAscensionOverlay
        key={rankAscensionCinematic?.id ?? "ascension-none"}
        ascension={rankAscensionCinematic}
        onClose={dismissRankAscensionCinematic}
      />
      <EndingRitualOverlay
        key={endingCinematic?.id ?? "ending-none"}
        ending={endingCinematic}
        onClose={dismissEndingCinematic}
      />
    </div>
  );
}
