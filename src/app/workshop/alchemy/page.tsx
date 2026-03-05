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
  "top-[6%] left-1/2 -translate-x-1/2",
  "top-[22%] left-[14%]",
  "top-[22%] right-[14%]",
  "top-1/2 left-[4%] -translate-y-1/2",
  "top-1/2 right-[4%] -translate-y-1/2",
  "bottom-[22%] left-[14%]",
  "bottom-[22%] right-[14%]",
  "bottom-[6%] left-1/2 -translate-x-1/2",
  "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
];

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

  const effectiveSlots = useMemo(
    () => normalizeSlots(slots, game.resources),
    [slots, game.resources],
  );

  const offered = useMemo(() => slotsToOffer(effectiveSlots), [effectiveSlots]);

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
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="game-panel reveal-up rounded-2xl border border-[#6f5a31]/40 bg-[#f9f2df]/92 p-5 shadow-[0_8px_18px_rgba(70,48,16,0.18)]">
        <h2 className="text-2xl font-semibold">魔法阵炼金</h2>
        <p className="mt-2 text-sm leading-7 opacity-90">
          炼金不再是固定按钮。你可以自由向魔法阵投入材料，进行等价交换。若材料组合满足特定定式，将必定炼出指定产物。
        </p>
        <p className="mt-1 text-sm leading-7 opacity-80">
          操作方式：先拖拽材料到阵位，再调整数量。每次炼成消耗 1 次行动。
        </p>

        <div className="mt-4 rounded-xl border border-[#6f5a31]/35 bg-[#fff8e8] p-3">
          <p className="text-sm font-semibold">材料区（可拖拽）</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CIRCLE_INPUT_ORDER.map((key) => (
              <div
                key={key}
                draggable={game.resources[key] > 0}
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", key);
                  setDraggingMaterial(key);
                }}
                onDragEnd={() => setDraggingMaterial(null)}
                className={`game-action-card rounded-lg border p-2 text-xs ${
                  game.resources[key] > 0
                    ? "cursor-grab border-[#7d6a45]/55 bg-[#fffdf5] hover:bg-[#f4e7ca]"
                    : "cursor-not-allowed border-[#8f846f]/35 bg-[#f0e9d8] opacity-70"
                }`}
              >
                <p className="font-semibold">
                  {RESOURCE_LABELS[key]}（{RESOURCE_VALUES[key]}）
                </p>
                <p className="mt-1">库存 {game.resources[key]}</p>
                <button
                  type="button"
                  onClick={() => quickInsert(key)}
                  disabled={game.resources[key] <= 0}
                  className="game-button mt-1 rounded border border-[#7d6a45]/45 px-1.5 py-0.5 text-[11px] hover:bg-[#f1e4c5] disabled:opacity-60"
                >
                  快速放入空槽
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-center">
          <div
            className={`alchemy-ring relative aspect-square w-full max-w-[30rem] rounded-full border-2 border-[#7b643d] bg-[radial-gradient(circle,_#f8eed8_0%,_#ead8ad_45%,_#b99c66_100%)] shadow-[inset_0_0_0_4px_rgba(102,75,28,0.35),inset_0_0_0_16px_rgba(255,245,214,0.35)] ${ringEffectClass} ${ringBurstClass}`}
          >
            <div className="alchemy-ring__pulse" />
            <div className="alchemy-ring__glow" />
            <div className="alchemy-ring__burst" />
            <div className="absolute inset-[14%] rounded-full border border-[#785f33]/70" />
            <div className="absolute inset-[28%] rounded-full border border-[#785f33]/70" />
            <div className="absolute inset-[42%] rounded-full border border-[#785f33]/70" />

            {effectiveSlots.map((slot, index) => (
              <div
                key={`slot-${index}`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const dropped =
                    (event.dataTransfer.getData("text/plain") as ResourceKey) ?? draggingMaterial;
                  if (dropped) {
                    setSlotMaterial(index, dropped);
                  }
                  setDraggingMaterial(null);
                }}
                className={`absolute ${SLOT_POSITIONS[index]} w-[7.3rem] rounded-lg border px-2 py-1 text-xs shadow-sm transition ${
                  slot.material
                    ? "alchemy-slot--filled border-[#6b5b37]/65 bg-[#fff8e6]/95"
                    : "alchemy-slot--empty border-dashed border-[#8f7c57]/70 bg-[#fff9ed]/80"
                }`}
              >
                {slot.material ? (
                  <>
                    <p className="text-[11px] font-semibold">
                      {RESOURCE_LABELS[slot.material]}（{RESOURCE_VALUES[slot.material]}）
                    </p>
                    <input
                      type="number"
                      min={0}
                      max={game.resources[slot.material]}
                      value={slot.amount}
                      onChange={(event) =>
                        setSlotAmount(
                          index,
                          Number.parseInt(event.target.value || "0", 10) || 0,
                        )
                      }
                      className="mt-1 w-full rounded border border-[#88724a]/50 bg-[#fffdf8] px-1 py-0.5"
                    />
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[10px] opacity-70">库存 {game.resources[slot.material]}</span>
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
                  <p className="py-4 text-center text-[11px] opacity-65">拖入材料</p>
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

        <div className="mt-5 grid gap-3 rounded-xl border border-[#6f5a31]/35 bg-[#fff8e8] p-3 md:grid-cols-[1fr_auto]">
          <p className="text-sm leading-7 opacity-85">
            将材料投入阵心，铜纹会自行回响并重组为等价值的新物质。
          </p>
          <button
            type="button"
            onClick={onTransmute}
            disabled={busy || game.actionsLeft <= 0 || game.ended}
            className="game-button self-end rounded-lg border border-[#6b5b37] bg-[#ead8aa] px-4 py-2 text-sm font-semibold hover:bg-[#dfc993] disabled:cursor-not-allowed disabled:opacity-60"
          >
            刻印炼成
          </button>
        </div>

        <div className="mt-3 grid gap-2 rounded-xl border border-[#6f5a31]/35 bg-[#fff8e8] p-3 text-sm">
          <p>
            投入总价值：<strong>{offeredValue}</strong>
          </p>
          <p>
            预计随机产出总价值：<strong>{predictedValue}</strong>
          </p>
          <p className="rounded border border-[#7f704e]/35 bg-[#fffdf3] p-2 text-xs leading-6 opacity-85">
            非定式炼成会在同等价值内随机显化，不会直接诞生贤者级造物；若阵式命中定式，则必定显化其对应成果。
          </p>
          <p className="rounded border border-[#7f704e]/35 bg-[#fffdf3] p-2 leading-7">{resultText}</p>
        </div>
      </section>

      <aside className="space-y-4 reveal-up reveal-delay-2">
        <section className="game-panel rounded-2xl border border-[#6f5a31]/40 bg-[#f9f2df]/92 p-4 shadow-[0_8px_18px_rgba(70,48,16,0.16)]">
          <h3 className="text-lg font-semibold">炼金临时效应</h3>
          {game.activeEffects.length > 0 ? (
            <ul className="mt-2 space-y-2 text-sm">
              {game.activeEffects.map((effect) => (
                <li
                  key={effect.id}
                  className="rounded border border-[#8b7954]/35 bg-[#fff8e8] p-2"
                >
                  <p className="font-semibold">{effect.label}</p>
                  <p className="mt-1 opacity-85">{effect.description}</p>
                  <p className="text-xs opacity-75">剩余炼成次数：{effect.remainingTransmutations}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm leading-7 opacity-80">当前无临时效应。你可在剧情页触发随机事件获得祝福或负面状态。</p>
          )}
        </section>

        <section className="game-panel rounded-2xl border border-[#6f5a31]/40 bg-[#f9f2df]/92 p-4 shadow-[0_8px_18px_rgba(70,48,16,0.16)]">
          <h3 className="text-lg font-semibold">定式图谱（必出）</h3>
          {nextGuidance ? (
            <div className="mt-2 rounded border border-[#8b7954]/35 bg-[#fff8e8] p-2 text-sm">
              <p className="font-semibold">当前建议：{nextGuidance.formulaName}</p>
              <ul className="mt-1 list-disc pl-5">
                {nextGuidance.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <ul className="mt-3 space-y-2 text-sm">
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
                          .map(([key, value]) => `${RESOURCE_LABELS[key as ResourceKey]}x${value}`)
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
        </section>

        <section className="game-panel rounded-2xl border border-[#6f5a31]/40 bg-[#f9f2df]/92 p-4 shadow-[0_8px_18px_rgba(70,48,16,0.16)]">
          <h3 className="text-lg font-semibold">操作提醒</h3>
          <p className="mt-2 text-sm leading-7 opacity-85">
            每次炼成消耗 1 次行动。若你打算炼制贤者级物质，需要先走“剧情探索”提升境界，再在此页触发定式。
          </p>
        </section>
      </aside>
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
