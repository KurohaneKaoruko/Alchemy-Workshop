"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

interface NearHandReport {
  tone: "neutral" | "success" | "warning" | "error";
  title: string;
  detail: string;
  meta?: string;
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
  const initialResultText = "将材料卡片拖入魔法阵槽位，再执行炼成。";
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
  const [nearHandReport, setNearHandReport] = useState<NearHandReport>({
    tone: "neutral",
    title: "等待刻印",
    detail: initialResultText,
  });
  const [ritualFeedback, setRitualFeedback] = useState<RitualFeedback | null>(null);
  const [ringBurst, setRingBurst] = useState<RingBurstState>("none");
  const [materialQuery, setMaterialQuery] = useState("");
  const [materialSortMode, setMaterialSortMode] = useState<MaterialSortMode>("stock");
  const [mobileInventoryOpen, setMobileInventoryOpen] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const ringStageRef = useRef<HTMLDivElement | null>(null);

  const effectiveSlots = useMemo(() => normalizeSlots(slots, game.resources), [slots, game.resources]);
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

  const inventoryBaseRows = useMemo(() => {
    const keyword = materialQuery.trim();
    return CIRCLE_INPUT_ORDER.map((key) => {
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
  }, [materialQuery, materialSortMode, game.resources, usedMaterials]);

  const offeredValue = useMemo(() => {
    return CIRCLE_INPUT_ORDER.reduce((sum, key) => {
      return sum + (offered[key] ?? 0) * RESOURCE_VALUES[key];
    }, 0);
  }, [offered]);
  const filledSlotCount = useMemo(
    () => effectiveSlots.reduce((count, slot) => count + (slot.material && slot.amount > 0 ? 1 : 0), 0),
    [effectiveSlots],
  );
  const selectedMaterials = useMemo(() => {
    return effectiveSlots
      .filter((slot): slot is { material: ResourceKey; amount: number } => Boolean(slot.material) && slot.amount > 0)
      .map((slot) => ({
        material: slot.material,
        amount: slot.amount,
      }));
  }, [effectiveSlots]);
  const totalOfferedAmount = useMemo(
    () => selectedMaterials.reduce((sum, slot) => sum + slot.amount, 0),
    [selectedMaterials],
  );
  const loadoutPreview = useMemo(() => selectedMaterials.slice(0, 2), [selectedMaterials]);
  const loadoutOverflowCount = Math.max(0, selectedMaterials.length - loadoutPreview.length);
  const loadoutCompactText = useMemo(() => {
    if (loadoutPreview.length === 0) {
      return "尚未放入材料";
    }
    const previewText = loadoutPreview
      .map((slot) => `${RESOURCE_LABELS[slot.material]}x${slot.amount}`)
      .join(" · ");
    return loadoutOverflowCount > 0 ? `${previewText} · +${loadoutOverflowCount}种` : previewText;
  }, [loadoutOverflowCount, loadoutPreview]);
  const selectedSlot = selectedSlotIndex !== null ? effectiveSlots[selectedSlotIndex] ?? null : null;
  const discoveredFormulas = useMemo(() => new Set(game.discoveredFormulas), [game.discoveredFormulas]);
  const nextGuidance = getNextFormulaGuidance(game);
  const formulaTarget = useMemo(() => {
    const offeredKeys = CIRCLE_INPUT_ORDER.filter((key) => (offered[key] ?? 0) > 0);
    const nextFormulaId = nextGuidance?.status === "ready_to_research" ? nextGuidance.formulaId : null;

    const candidates = ARCANE_FORMULAS.filter((formula) => rankToIndex(game.rank) >= rankToIndex(formula.minRank))
      .map((formula) => {
        const formulaKeys = Object.keys(formula.ingredients) as ResourceKey[];
        const foreignCount = offeredKeys.filter((key) => !formulaKeys.includes(key)).length;
        const overlapCount = formulaKeys.filter((key) => (offered[key] ?? 0) > 0).length;
        const missing = formulaKeys
          .map((key) => {
            const required = formula.ingredients[key] ?? 0;
            const current = offered[key] ?? 0;
            return {
              key,
              current,
              required,
              remaining: Math.max(0, required - current),
            };
          })
          .filter((item) => item.remaining > 0);

        return {
          formula,
          foreignCount,
          overlapCount,
          totalMissing: missing.reduce((sum, item) => sum + item.remaining, 0),
          missing,
          priority: formula.id === nextFormulaId ? 1 : 0,
        };
      })
      .filter((item) => item.priority > 0 || item.overlapCount > 0 || offeredKeys.length === 0)
      .sort((left, right) => {
        return (
          right.priority - left.priority ||
          left.foreignCount - right.foreignCount ||
          right.overlapCount - left.overlapCount ||
          left.totalMissing - right.totalMissing
        );
      });

    return candidates[0] ?? null;
  }, [game.rank, nextGuidance, offered]);
  const slotTargetHint = useMemo(() => {
    if (selectedSlotIndex === null) {
      return "将投入下一个空槽";
    }
    if (!selectedSlot) {
      return "将投入下一个空槽";
    }
    return selectedSlot.material ? `当前聚焦第 ${selectedSlotIndex + 1} 槽` : `当前优先第 ${selectedSlotIndex + 1} 槽`;
  }, [selectedSlotIndex, selectedSlot]);
  const slotTargetCompactHint = useMemo(() => {
    if (selectedSlotIndex === null || !selectedSlot) {
      return "下个空槽";
    }
    return selectedSlot.material ? `第${selectedSlotIndex + 1}槽补量` : `第${selectedSlotIndex + 1}槽优先`;
  }, [selectedSlotIndex, selectedSlot]);
  const formulaTargetLabel = useMemo(() => {
    if (!formulaTarget || formulaTarget.foreignCount > 0) {
      return "自由试配";
    }
    return formulaTarget.formula.name;
  }, [formulaTarget]);
  const formulaTargetHint = useMemo(() => {
    if (!formulaTarget || formulaTarget.foreignCount > 0) {
      return null;
    }
    if (formulaTarget.missing.length === 0) {
      return `已满足「${formulaTarget.formula.name}」`;
    }
    return `趋近「${formulaTarget.formula.name}」`;
  }, [formulaTarget]);
  const formulaProgressRows = useMemo(() => {
    if (!formulaTarget || formulaTarget.foreignCount > 0) {
      return [];
    }

    return (Object.keys(formulaTarget.formula.ingredients) as ResourceKey[])
      .map((key) => {
        const required = formulaTarget.formula.ingredients[key] ?? 0;
        const current = offered[key] ?? 0;
        return {
          key,
          label: RESOURCE_LABELS[key],
          current,
          required,
          remaining: Math.max(0, required - current),
        };
      })
      .sort((left, right) => left.remaining - right.remaining || left.label.localeCompare(right.label, "zh-Hans-CN"));
  }, [formulaTarget, offered]);
  const formulaAssistAction = useMemo(() => {
    const nextItem = formulaProgressRows.find((item) => item.remaining > 0);
    if (!nextItem) {
      return null;
    }

    const available = Math.max(0, game.resources[nextItem.key] - (usedMaterials[nextItem.key] ?? 0));
    if (available <= 0) {
      return null;
    }

    return {
      ...nextItem,
      available,
    };
  }, [formulaProgressRows, game.resources, usedMaterials]);
  const slotFocusSummary = useMemo(() => {
    if (selectedSlotIndex === null) {
      return "未锁定槽位，快捷投料会优先落到下一个空槽。";
    }
    if (!selectedSlot?.material) {
      if (formulaAssistAction) {
        return `第 ${selectedSlotIndex + 1} 槽空置，建议先补 ${formulaAssistAction.label}。`;
      }
      return `第 ${selectedSlotIndex + 1} 槽空置，当前可直接定向投入材料。`;
    }
    return `第 ${selectedSlotIndex + 1} 槽已放入 ${RESOURCE_LABELS[selectedSlot.material]} x ${selectedSlot.amount}，背包与快捷投料已优先该槽。`;
  }, [selectedSlotIndex, selectedSlot, formulaAssistAction]);
  const guidedInventoryRows = useMemo(() => {
    return inventoryBaseRows
      .map((item) => {
        const formulaRow = formulaProgressRows.find((row) => row.key === item.key);
        const isNextAssist = formulaAssistAction?.key === item.key;
        const selectedStage =
          selectedSlotIndex === null
            ? "none"
            : selectedSlot?.material === item.key
              ? "match"
              : !selectedSlot?.material && isNextAssist
                ? "empty_target"
                : "none";
        const formulaStage = formulaRow ? (formulaRow.remaining > 0 ? "missing" : "ready") : "none";
        const selectedPriority = selectedStage === "match" ? 0 : selectedStage === "empty_target" ? 1 : 2;
        const formulaPriority = formulaStage === "missing" ? (isNextAssist ? 0 : 1) : formulaStage === "ready" ? 2 : 3;

        return {
          ...item,
          formulaStage,
          formulaRemaining: formulaRow?.remaining ?? 0,
          formulaRequired: formulaRow?.required ?? 0,
          isNextAssist,
          selectedStage,
          selectedPriority,
          formulaPriority,
        };
      })
      .sort((left, right) => {
        if (left.selectedPriority !== right.selectedPriority) {
          return left.selectedPriority - right.selectedPriority;
        }
        if (left.formulaPriority !== right.formulaPriority) {
          return left.formulaPriority - right.formulaPriority;
        }
        if (left.formulaRemaining !== right.formulaRemaining) {
          return left.formulaRemaining - right.formulaRemaining;
        }
        if (materialSortMode === "value") {
          return right.value - left.value || right.available - left.available;
        }
        if (materialSortMode === "name") {
          return left.label.localeCompare(right.label, "zh-Hans-CN");
        }
        return right.available - left.available || right.value - left.value;
      });
  }, [inventoryBaseRows, formulaProgressRows, formulaAssistAction, selectedSlot, selectedSlotIndex, materialSortMode]);
  const inventoryGuideCopy = useMemo(() => {
    if (selectedSlot?.material) {
      return `当前正聚焦第 ${selectedSlotIndex! + 1} 槽，优先为 ${RESOURCE_LABELS[selectedSlot.material]} 补量或替换。`;
    }
    if (formulaAssistAction && formulaTarget) {
      return `正在逼近「${formulaTarget.formula.name}」，优先补入 ${formulaAssistAction.label}。`;
    }
    if (formulaTarget && formulaTarget.foreignCount === 0) {
      return `当前阵式贴近「${formulaTarget.formula.name}」，可以继续补齐剩余材料。`;
    }
    if (nextGuidance) {
      return `下一条稳定定式是「${nextGuidance.formulaName}」。`;
    }
    return "若已选中槽位，会优先投入该槽；否则放入下一个空槽。";
  }, [formulaAssistAction, formulaTarget, nextGuidance, selectedSlot, selectedSlotIndex]);
  const mobileDrawerLead = useMemo(() => {
    if (selectedSlot?.material) {
      return `当前正聚焦第 ${selectedSlotIndex! + 1} 槽，建议先决定是否继续补 ${RESOURCE_LABELS[selectedSlot.material]}。`;
    }
    if (formulaAssistAction && formulaTarget) {
      return `当前正在逼近「${formulaTarget.formula.name}」，建议先补 ${formulaAssistAction.label}。`;
    }
    if (formulaTargetHint) {
      return `若已选中槽位，优先投入该槽；当前${formulaTargetHint}。`;
    }
    return "若已选中槽位，优先投入该槽；否则放入下一个空槽。";
  }, [formulaAssistAction, formulaTarget, formulaTargetHint, selectedSlot, selectedSlotIndex]);
  const statusBadgeText = useMemo(() => {
    return formulaTargetHint ? `${nearHandReport.title} · ${formulaTargetHint}` : nearHandReport.title;
  }, [nearHandReport.title, formulaTargetHint]);
  const quickAccessMaterials = useMemo(() => {
    return inventoryBaseRows
      .filter((item) => item.available > 0)
      .map((item) => {
        const formulaRow = formulaProgressRows.find((row) => row.key === item.key);
        const selectedMatch = selectedSlot?.material === item.key;
        const isNextAssist = formulaAssistAction?.key === item.key;
        const selectedStage =
          selectedSlotIndex === null
            ? "none"
            : selectedMatch
              ? "match"
              : !selectedSlot?.material && isNextAssist
                ? "empty_target"
                : "none";
        const slotFocus =
          selectedSlotIndex !== null
            ? selectedSlot?.material === item.key
              ? `补第 ${selectedSlotIndex + 1} 槽`
              : `投入第 ${selectedSlotIndex + 1} 槽`
            : "投入空槽";
        const tag =
          selectedStage === "match"
            ? "当前槽补量"
            : selectedStage === "empty_target"
              ? "当前槽下一味"
              : isNextAssist
                ? "下一味"
                : formulaRow?.remaining
                  ? "定式缺口"
                  : "备用";
        const note = selectedMatch ? slotFocus : formulaRow?.remaining ? `还差 ${formulaRow.remaining}` : slotFocus;
        const priority =
          selectedStage === "match"
            ? 0
            : selectedStage === "empty_target"
              ? 1
              : isNextAssist
                ? 2
                : formulaRow?.remaining
                  ? 3
                  : 4;

        return {
          key: item.key,
          label: item.label,
          available: item.available,
          tag,
          note,
          priority,
          isNextAssist: isNextAssist || selectedStage === "match" || selectedStage === "empty_target",
        };
      })
      .sort((left, right) => {
        if (left.priority !== right.priority) {
          return left.priority - right.priority;
        }
        return right.available - left.available || left.label.localeCompare(right.label, "zh-Hans-CN");
      })
      .slice(0, 6);
  }, [inventoryBaseRows, formulaProgressRows, selectedSlot, selectedSlotIndex, formulaAssistAction]);
  const slotEditorSuggestions = useMemo(() => {
    if (formulaTarget && formulaTarget.foreignCount === 0) {
      if (formulaTarget.missing.length === 0) {
        return [];
      }

      const formulaRows = formulaTarget.missing
        .map((item) => {
          const available = Math.max(0, game.resources[item.key] - (usedMaterials[item.key] ?? 0));
          return {
            key: item.key,
            label: RESOURCE_LABELS[item.key],
            available,
            note: `靠近 ${formulaTarget.formula.name}`,
            actionLabel: "投入",
          };
        })
        .filter((item) => item.available > 0);

      if (formulaRows.length > 0) {
        return formulaRows.slice(0, 4);
      }
    }

    if (selectedSlotIndex !== null && selectedSlot?.material) {
      const remaining = Math.max(0, game.resources[selectedSlot.material] - (usedMaterials[selectedSlot.material] ?? 0));
      return remaining > 0
        ? [
            {
              key: selectedSlot.material,
              label: RESOURCE_LABELS[selectedSlot.material],
              available: remaining,
              note: `为第 ${selectedSlotIndex + 1} 槽补量`,
              actionLabel: "+1",
            },
          ]
        : [];
    }

    return quickAccessMaterials.slice(0, 4).map((item) => ({
      key: item.key,
      label: item.label,
      available: item.available,
      note: item.note,
      actionLabel: "投入",
    }));
  }, [formulaTarget, selectedSlotIndex, selectedSlot, game.resources, usedMaterials, quickAccessMaterials]);

  const effectTotals = useMemo(() => getEffectTotals(game.activeEffects), [game.activeEffects]);
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
  const actionBarMessage = useMemo(() => {
    if (busy) {
      return "炼成中";
    }
    if (nearHandReport.tone === "success") {
      return nearHandReport.meta?.startsWith("显化：") ? nearHandReport.meta : nearHandReport.title;
    }
    if (nearHandReport.tone === "error") {
      return nearHandReport.title;
    }
    if (filledSlotCount === 0) {
      return "先投料";
    }
    if (!canTransmute) {
      return game.actionsLeft <= 0 ? "行动已尽" : "暂不可刻印";
    }
    if (selectedSlotIndex !== null) {
      return selectedSlot?.material ? `第${selectedSlotIndex + 1}槽 ${RESOURCE_LABELS[selectedSlot.material]}x${selectedSlot.amount}` : `第${selectedSlotIndex + 1}槽待投料`;
    }
    return formulaTargetHint ?? "可刻印";
  }, [busy, canTransmute, filledSlotCount, formulaTargetHint, game.actionsLeft, nearHandReport, selectedSlot, selectedSlotIndex]);

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

  function publishNearHandResult(detail: string, report?: NearHandReport) {
    setNearHandReport(
      report ?? {
        tone: "neutral",
        title: "当前回响",
        detail,
      },
    );
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
    setSelectedSlotIndex(index);
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

  function clearAllSlots() {
    setSlots(createEmptySlots());
    setSelectedSlotIndex(null);
    publishNearHandResult("阵位已清空，可以重新刻印新的材料组合。", {
      tone: "neutral",
      title: "阵位已清空",
      detail: "可以重新刻印新的材料组合。",
    });
  }

  function insertIntoPreferredSlot(material: ResourceKey) {
    if (selectedSlotIndex !== null) {
      const preferredSlot = effectiveSlots[selectedSlotIndex];
      if (!preferredSlot) {
        setSelectedSlotIndex(null);
      } else if (!preferredSlot.material) {
        setSlotMaterial(selectedSlotIndex, material);
        publishNearHandResult(`已将 ${RESOURCE_LABELS[material]} 投入第 ${selectedSlotIndex + 1} 槽。`, {
          tone: "success",
          title: "投入成功",
          detail: `第 ${selectedSlotIndex + 1} 槽已收入 ${RESOURCE_LABELS[material]}。`,
        });
        return true;
      } else if (preferredSlot.material === material) {
        const usedElsewhere = getUsedByOtherSlots(material, selectedSlotIndex, effectiveSlots);
        const maxAllowed = Math.max(0, game.resources[material] - usedElsewhere);
        if (preferredSlot.amount >= maxAllowed) {
          publishNearHandResult(`${RESOURCE_LABELS[material]} 已达到该槽可投上限。`, {
            tone: "warning",
            title: "已达上限",
            detail: `${RESOURCE_LABELS[material]} 不能继续投入当前槽位。`,
          });
          return false;
        }
        setSlotAmount(selectedSlotIndex, preferredSlot.amount + 1);
        publishNearHandResult(`已为第 ${selectedSlotIndex + 1} 槽补入 1 份 ${RESOURCE_LABELS[material]}。`, {
          tone: "success",
          title: "补量完成",
          detail: `第 ${selectedSlotIndex + 1} 槽新增 1 份 ${RESOURCE_LABELS[material]}。`,
        });
        return true;
      } else {
        publishNearHandResult(
          `第 ${selectedSlotIndex + 1} 槽已被 ${RESOURCE_LABELS[preferredSlot.material]} 占用，先清空或改选其他槽位。`,
          {
            tone: "error",
            title: "槽位占用",
            detail: `第 ${selectedSlotIndex + 1} 槽当前是 ${RESOURCE_LABELS[preferredSlot.material]}，需先清空再切换。`,
          },
        );
        return false;
      }
    }

    const targetIndex = effectiveSlots.findIndex((slot) => !slot.material);
    if (targetIndex < 0) {
      publishNearHandResult("阵位已满，先清空一个槽位再继续投料。", {
        tone: "error",
        title: "阵位已满",
        detail: "先清空一个槽位，再继续投料。",
      });
      return false;
    }
    setSlotMaterial(targetIndex, material);
    publishNearHandResult(`已放入 ${RESOURCE_LABELS[material]}。`, {
      tone: "success",
      title: "投入成功",
      detail: `${RESOURCE_LABELS[material]} 已进入第 ${targetIndex + 1} 槽。`,
    });
    return true;
  }

  function focusRingStage() {
    if (typeof window === "undefined" || !window.matchMedia("(max-width: 1023px)").matches) {
      return;
    }
    window.requestAnimationFrame(() => {
      ringStageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function handleInventoryInsert(material: ResourceKey, closeAfterInsert = false) {
    const inserted = insertIntoPreferredSlot(material);
    if (inserted && closeAfterInsert) {
      setMobileInventoryOpen(false);
    }
    if (inserted) {
      focusRingStage();
    }
  }

  function focusSelectedOrNextEmptySlot() {
    const nextEmptyIndex = effectiveSlots.findIndex((slot) => !slot.material);
    setSelectedSlotIndex(nextEmptyIndex >= 0 ? nextEmptyIndex : 0);
    focusRingStage();
  }

  function adjustSelectedSlotAmount(delta: number) {
    if (selectedSlotIndex === null) {
      return;
    }
    const slot = effectiveSlots[selectedSlotIndex];
    if (!slot?.material) {
      return;
    }
    setSlotAmount(selectedSlotIndex, slot.amount + delta);
  }

  function handleFormulaAssistInsert() {
    if (!formulaAssistAction) {
      return;
    }

    const sameMaterialIndex = effectiveSlots.findIndex((slot) => slot.material === formulaAssistAction.key);
    if (sameMaterialIndex >= 0) {
      setSelectedSlotIndex(sameMaterialIndex);
      setSlotAmount(sameMaterialIndex, (effectiveSlots[sameMaterialIndex]?.amount ?? 0) + 1);
      publishNearHandResult(`已沿「${formulaTarget?.formula.name}」补入 1 份 ${formulaAssistAction.label}。`, {
        tone: "success",
        title: "定式补料",
        detail: `已为第 ${sameMaterialIndex + 1} 槽补入 ${formulaAssistAction.label}。`,
        meta: `继续逼近「${formulaTarget?.formula.name}」`,
      });
      focusRingStage();
      return;
    }

    const emptyIndex =
      selectedSlotIndex !== null && !selectedSlot?.material
        ? selectedSlotIndex
        : effectiveSlots.findIndex((slot) => !slot.material);
    if (emptyIndex >= 0) {
      setSlotMaterial(emptyIndex, formulaAssistAction.key);
      publishNearHandResult(`已沿「${formulaTarget?.formula.name}」补入 ${formulaAssistAction.label}。`, {
        tone: "success",
        title: "定式补料",
        detail: `${formulaAssistAction.label} 已投入第 ${emptyIndex + 1} 槽。`,
        meta: `继续逼近「${formulaTarget?.formula.name}」`,
      });
      focusRingStage();
      return;
    }

    publishNearHandResult("阵位已满，先清空一个槽位再继续补齐定式。", {
      tone: "error",
      title: "无法补齐",
      detail: "阵位已满，先清空一个槽位再继续补齐定式。",
    });
  }

	function renderInventoryPanel(closeAfterInsert = false) {
    return (
      <>
        <div className="alchemy-inventory-guide">
          <div>
            <p className="alchemy-inventory-guide__label">当前目标</p>
            <p className="alchemy-inventory-guide__title">
              {formulaTarget && formulaTarget.foreignCount === 0 ? formulaTarget.formula.name : "自由试配"}
            </p>
            <p className="alchemy-inventory-guide__copy">{inventoryGuideCopy}</p>
          </div>
          {formulaAssistAction ? (
            <button
              type="button"
              onClick={handleFormulaAssistInsert}
              className="alchemy-inventory-guide__button"
            >
              补下一味
            </button>
          ) : null}
        </div>
        <div className="alchemy-inventory-controls grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            type="text"
            value={materialQuery}
            onChange={(event) => setMaterialQuery(event.target.value)}
            placeholder="搜索材料"
            className="alchemy-inventory-controls__search rounded-md border border-[#8c7548]/40 bg-[#fffdf6] px-2.5 py-1.5 text-sm text-[#3f2f18]"
          />
          <select
            value={materialSortMode}
            onChange={(event) => setMaterialSortMode(event.target.value as MaterialSortMode)}
            className="alchemy-inventory-controls__sort rounded-md border border-[#8c7548]/40 bg-[#fffdf6] px-2 py-1.5 text-sm text-[#3f2f18]"
          >
            <option value="stock">按可投数量</option>
            <option value="value">按价值</option>
            <option value="name">按名称</option>
          </select>
        </div>
        <ul className="mt-2 space-y-2">
          {guidedInventoryRows.map((item) => (
            <li
              key={item.key}
              draggable={item.available > 0}
              onDragStart={(event) => {
                event.dataTransfer.setData("text/plain", item.key);
                setDraggingMaterial(item.key);
              }}
              onDragEnd={() => setDraggingMaterial(null)}
              className={`game-action-card alchemy-inventory-row rounded-lg border p-2 text-xs ${
                item.isNextAssist
                  ? "alchemy-inventory-row--next"
                  : item.formulaStage === "missing"
                    ? "alchemy-inventory-row--formula"
                    : ""
              } ${
                item.available > 0
                  ? "cursor-grab border-[#7d6a45]/55 bg-[#fffdf5] hover:bg-[#f4e7ca]"
                  : "cursor-not-allowed border-[#8f846f]/35 bg-[#f0e9d8] opacity-70"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-[#3f2f18]">
                    {item.label}（{item.value}）
                  </p>
                  {item.selectedStage === "match" ? (
                    <p className="alchemy-inventory-row__tag">当前槽补量</p>
                  ) : item.selectedStage === "empty_target" ? (
                    <p className="alchemy-inventory-row__tag">当前槽下一味</p>
                  ) : item.isNextAssist ? (
                    <p className="alchemy-inventory-row__tag">下一味</p>
                  ) : item.formulaStage === "missing" ? (
                    <p className="alchemy-inventory-row__tag">定式缺口</p>
                  ) : item.formulaStage === "ready" ? (
                    <p className="alchemy-inventory-row__tag alchemy-inventory-row__tag--muted">定式已就位</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => handleInventoryInsert(item.key, closeAfterInsert)}
                  disabled={item.available <= 0}
                  className="game-button alchemy-inventory-row__insert rounded border border-[#7d6a45]/45 px-1.5 py-0.5 text-[11px] hover:bg-[#f1e4c5] disabled:opacity-60"
                >
                  投入阵位
                </button>
              </div>
              <p className="mt-1 text-[11px] text-[#4d3b1f]">
                库存 {item.stock} · 阵内占用 {item.used} · 可投 {item.available}
              </p>
              {item.formulaStage !== "none" ? (
                <p className="mt-1 text-[11px] text-[#6a5330]">
                  定式进度 {item.formulaRequired - item.formulaRemaining}/{item.formulaRequired}
                  {item.formulaRemaining > 0 ? ` · 还差 ${item.formulaRemaining}` : " · 已满足"}
                </p>
              ) : null}
            </li>
          ))}
          {guidedInventoryRows.length === 0 ? (
            <li className="rounded-lg border border-dashed border-[#8f846f]/45 bg-[#f0e9d8] px-2 py-3 text-xs text-[#5e4d30]">
              未找到匹配材料。
            </li>
          ) : null}
        </ul>
      </>
    );
  }

  async function onTransmute() {
    const result = await doCircleTransmutation({ offered });
    setRingBurst(result.success ? "success" : "fail");
    const producedSummary = formatProducedResources(result.producedResources);
    publishNearHandResult(result.message, {
      tone: result.success ? "success" : "error",
      title: result.success ? "炼成完成" : "阵式紊乱",
      detail: result.message,
      meta: result.success ? (producedSummary ? `显化：${producedSummary}` : "本次未生成额外资源摘要。") : "检查材料组合或临时效果后再尝试。",
    });
    setRitualFeedback({
      id: Date.now(),
      kind: result.success ? "success" : "failure",
      body: result.success ? (producedSummary ? `显化：${producedSummary}` : "炼成完成") : "阵纹紊乱",
    });
    if (result.success) {
      setSlots(createEmptySlots());
      setSelectedSlotIndex(null);
    }
  }

  return (
    <div className="workshop-page alchemy-workbench pb-28 sm:pb-32 lg:pb-0">
      <section className="workshop-hero-card workshop-hero-card--compact alchemy-workbench__hero reveal-up">
        <p className="workshop-hero-card__eyebrow">Circle Hall</p>
        <h2 className="workshop-hero-card__title">魔法阵炼金</h2>
	        <p className="workshop-hero-card__lead">
	          把材料投入阵位即可显化产物；命中定式时，阵纹会稳定地回应你。
	        </p>
	        <div className="alchemy-hero-strip">
	          <span className="alchemy-hero-token">行动 {game.actionsLeft}/3 · {game.rank}</span>
	          <span className="alchemy-hero-token">
              {hasCurse ? "紊乱" : hasBlessing ? "受祝" : "平衡"} · 效果 {game.activeEffects.length} · 定式 {game.discoveredFormulas.length}
            </span>
	        </div>
	      </section>

      <div className="workshop-page__grid xl:grid-cols-[minmax(0,1fr)_23rem]">
        <section className="alchemy-workbench__main space-y-3 sm:space-y-4 reveal-up">
	          <article className="ritual-card rounded-2xl p-4 sm:p-5 alchemy-status-card">
	            <div className="alchemy-status-head">
	              <div>
	                <p className="ritual-card__eyebrow">Ritual Status</p>
	                <h3 className="ritual-card__title">当前阵式</h3>
	                <p className="alchemy-status-head__summary" title={`目标定式：${formulaTargetLabel} · ${slotTargetHint}`}>
                      <span className="alchemy-status-signature">{formulaTargetLabel}</span>
                      <span className="alchemy-status-head__dot" aria-hidden>·</span>
                      <span className="alchemy-status-signature alchemy-status-signature--muted">{slotTargetCompactHint}</span>
	                </p>
		              </div>
		              <div className="alchemy-status-head__badges">
		                <span className={`alchemy-status-badge ${formulaTargetHint ? "alchemy-status-badge--accent" : ""}`}>
                      {statusBadgeText}
                    </span>
		              </div>
		            </div>
	            <div className="alchemy-status-board alchemy-status-board--lead">
	              <div className="alchemy-status-panel">
	                <div className="alchemy-loadout">
	                  <div className="alchemy-loadout__head">
	                    <p className="alchemy-loadout__label">当前投料</p>
                      <span className="alchemy-loadout__compact">{loadoutCompactText}</span>
	                    <span className="alchemy-loadout__summary">
	                      {selectedMaterials.length > 0 ? `${selectedMaterials.length} 种 · ${totalOfferedAmount} 份` : "0 份"}
	                    </span>
	                  </div>
	                  <div className="alchemy-loadout__chips">
	                    {loadoutPreview.length > 0 ? (
	                      loadoutPreview.map((slot) => (
	                        <span key={`${slot.material}-${slot.amount}`} className="alchemy-loadout__chip">
	                          {RESOURCE_LABELS[slot.material]} x {slot.amount}
	                        </span>
	                      ))
	                    ) : (
	                      <span className="alchemy-loadout__empty">尚未放入材料</span>
	                    )}
	                    {loadoutOverflowCount > 0 ? (
	                      <span className="alchemy-loadout__more">+{loadoutOverflowCount} 种</span>
	                    ) : null}
	                  </div>
	                </div>
	              </div>
	              <div className="alchemy-status-panel alchemy-status-panel--quick">
	                <div className="alchemy-quick-picks">
	                  <div className="alchemy-quick-picks__header">
	                    <div className="alchemy-quick-picks__copy">
	                      <p className="alchemy-quick-picks__label">快捷投料</p>
	                      <p className="alchemy-quick-picks__hint">
	                        {slotTargetHint}
	                        {formulaTargetHint ? ` · ${formulaTargetHint}` : ""}
	                      </p>
	                    </div>
	                    <button
	                      type="button"
	                      onClick={() => setMobileInventoryOpen(true)}
	                      className="alchemy-quick-picks__drawer-trigger lg:hidden"
	                    >
                        <span className="sm:hidden">材料匣</span>
                        <span className="hidden sm:inline">打开材料匣</span>
	                    </button>
	                  </div>
	                  <div className="alchemy-quick-picks__list">
	                    {quickAccessMaterials.length > 0 ? (
	                      quickAccessMaterials.map((item) => (
	                        <button
	                          key={item.key}
	                          type="button"
	                          onClick={() => handleInventoryInsert(item.key)}
	                          className={`alchemy-quick-picks__item ${item.isNextAssist ? "alchemy-quick-picks__item--next" : ""}`}
	                        >
	                          <span>{item.label}</span>
	                          <span className="alchemy-quick-picks__tag">{item.tag}</span>
	                          <span className="alchemy-quick-picks__note">{item.note}</span>
	                          <span className="alchemy-quick-picks__stock">可投 {item.available}</span>
	                        </button>
	                      ))
	                    ) : (
	                      <span className="alchemy-loadout__empty">当前没有可投材料</span>
	                    )}
	                  </div>
	                </div>
	              </div>
	            </div>
	            <div ref={ringStageRef} className="alchemy-ring-stage grid gap-4 xl:grid-cols-[minmax(0,1fr)_14rem]">
              <div className="alchemy-ring-altar relative flex min-h-[22rem] items-center justify-center rounded-2xl border border-[#8f7446]/35 bg-[radial-gradient(circle_at_50%_30%,#fff4dd_0%,#f2e0bc_42%,#d2ad6b_100%)] px-1.5 py-2.5 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.4)] sm:min-h-[30rem] sm:px-4">
                <div className={`alchemy-ring relative aspect-square w-full max-w-[22rem] min-[420px]:max-w-[24rem] ${ringEffectClass} ${ringBurstClass} sm:max-w-[32rem]`}>
                  <div className="alchemy-ring__pulse" />
                  <div className="alchemy-ring__glow" />
                  <div className="alchemy-ring__burst" />
                  <div className="alchemy-ring__guide absolute inset-[14%] rounded-full border border-[#735630]/70" />
                  <div className="alchemy-ring__guide absolute inset-[28%] rounded-full border border-[#735630]/70" />
                  <div className="alchemy-ring__guide absolute inset-[42%] rounded-full border border-[#735630]/70" />

                  {effectiveSlots.map((slot, index) => (
                    <div
                      key={`slot-${index}`}
                      role="button"
                      tabIndex={0}
                      aria-pressed={selectedSlotIndex === index}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const dropped = toResourceKey(event.dataTransfer.getData("text/plain")) ?? draggingMaterial;
                        if (dropped) {
                          setSlotMaterial(index, dropped);
                        }
                        setDraggingMaterial(null);
                        setSelectedSlotIndex(index);
                      }}
                      onClick={() => setSelectedSlotIndex(index)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedSlotIndex(index);
                        }
                      }}
                      className={`absolute ${SLOT_POSITIONS[index]} w-[4.35rem] rounded-md border px-1 py-1 text-[9px] leading-tight shadow-sm transition sm:w-[6.2rem] sm:rounded-lg sm:px-2 sm:text-xs lg:w-[7rem] ${
                        slot.material
                          ? "alchemy-slot--filled border-[#6b5b37]/70 bg-[#fff8e6]/95"
                          : "alchemy-slot--empty border-dashed border-[#8f7c57]/70 bg-[#fff9ed]/80"
                      } ${selectedSlotIndex === index ? "alchemy-slot--selected" : ""}`}
                    >
                      {slot.material ? (
                        <>
                          <p className="font-semibold">
                            {RESOURCE_LABELS[slot.material]}（{RESOURCE_VALUES[slot.material]}）
                          </p>
                          <p className="mt-1 rounded border border-[#88724a]/30 bg-[#fffdf8]/85 px-1 py-0.5 text-[10px] sm:text-[11px]">
                            数量 {slot.amount}
                          </p>
                          <p className="mt-1 opacity-75">库存 {game.resources[slot.material]}</p>
                        </>
                      ) : (
                        <p className="py-2.5 text-center opacity-65">{selectedSlotIndex === index ? "已选中" : "点击选中"}</p>
                      )}
                    </div>
                  ))}

                  <div className="pointer-events-none absolute left-1/2 top-[16%] hidden -translate-x-1/2 sm:block">
                    {game.activeEffects.length > 0 ? (
                      <div className="flex flex-wrap justify-center gap-1 rounded border border-[#7f6b46]/45 bg-[#fff8e8]/90 px-2 py-1 text-[10px]">
                        {game.activeEffects.map((effect) => (
                          <span
                            key={effect.id}
                            className="rounded border border-[#8d7a56]/45 bg-[#fdf6e6] px-1.5 py-0.5"
                          >
                            {effect.kind === "tolerance_bonus"
                              ? "高阶"
                              : effect.kind === "tolerance_penalty"
                                ? "杂质"
                                : "细粒"}
                            +{effect.value} · {effect.remainingTransmutations}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {ritualFeedback ? (
                    <div key={ritualFeedback.id} className={`ritual-feedback ritual-feedback--${ritualFeedback.kind}`}>
                      <p className="ritual-feedback__title">
                        {ritualFeedback.kind === "success" ? "炼成完成" : "阵式紊乱"}
                      </p>
                      <p className="ritual-feedback__body">{ritualFeedback.body}</p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="alchemy-ring-stage__console grid content-start gap-3 lg:sticky lg:top-[7.25rem]">
                <div className="ritual-stat-grid sm:grid-cols-2 xl:grid-cols-1">
                  <div className="ritual-stat">
                    <p className="ritual-stat__label">投入价值</p>
                    <p className="ritual-stat__value">{offeredValue}</p>
                  </div>
                  <div className="ritual-stat">
                    <p className="ritual-stat__label">行动余量</p>
                    <p className="ritual-stat__value">{game.actionsLeft}/3</p>
                  </div>
                  <div className="ritual-stat">
                    <p className="ritual-stat__label">已解定式</p>
                    <p className="ritual-stat__value">{game.discoveredFormulas.length}</p>
                  </div>
                </div>
                <div className="ritual-list__item text-sm leading-7 text-[#4d381c]">
                  {hasCurse
                    ? "阵式受紊乱残渣影响，更容易出现低阶杂质。"
                    : hasBlessing
                      ? "阵式正处于祝福窗口，更容易显化稳定或高阶产物。"
                      : "当前阵式稳定，按标准等价交换执行。"}
                </div>
	                <div className="alchemy-slot-editor">
	                  <div className="alchemy-slot-editor__header">
	                    <div>
	                      <p className="alchemy-slot-editor__eyebrow">Slot Focus</p>
                      <h4 className="alchemy-slot-editor__title">近手调槽</h4>
                    </div>
                    <button
                      type="button"
                      onClick={focusSelectedOrNextEmptySlot}
                      className="alchemy-slot-editor__pick-button"
	                    >
	                      选中空槽
	                    </button>
	                  </div>
                      <div className="alchemy-slot-editor__status">
                        <p className="alchemy-slot-editor__status-label">当前手边</p>
                        <p className="alchemy-slot-editor__status-copy">{slotFocusSummary}</p>
                        <div className={`alchemy-slot-editor__report alchemy-slot-editor__report--${nearHandReport.tone}`}>
                          <div className="alchemy-slot-editor__report-head">
                            <span className="alchemy-slot-editor__report-pill">{nearHandReport.title}</span>
                          </div>
                          <p className="alchemy-slot-editor__report-detail">{nearHandReport.detail}</p>
                          {nearHandReport.meta ? (
                            <p className="alchemy-slot-editor__report-meta">{nearHandReport.meta}</p>
                          ) : null}
                        </div>
                      </div>
	                  {selectedSlotIndex !== null ? (
	                    <>
	                      <div className="alchemy-slot-editor__slot">
	                        <span className="alchemy-slot-editor__slot-index">第 {selectedSlotIndex + 1} 槽</span>
	                        <span className="alchemy-slot-editor__slot-material">
                          {selectedSlot?.material ? RESOURCE_LABELS[selectedSlot.material] : "空槽"}
                        </span>
                      </div>
                      {formulaTargetHint ? (
                        <p className="alchemy-slot-editor__formula-hint">{formulaTargetHint}</p>
                      ) : null}
                      {formulaProgressRows.length > 0 ? (
                        <div className="alchemy-slot-editor__formula-progress">
                          <div className="alchemy-slot-editor__formula-progress-head">
                            <div>
                              <p className="alchemy-slot-editor__formula-progress-label">定式刻线</p>
                              <p className="alchemy-slot-editor__formula-progress-title">
                                {formulaTarget?.formula.name} ·{" "}
                                {formulaProgressRows.filter((item) => item.remaining === 0).length}/{formulaProgressRows.length} 就位
                              </p>
                            </div>
                            {formulaAssistAction ? (
                              <button
                                type="button"
                                onClick={handleFormulaAssistInsert}
                                className="alchemy-slot-editor__formula-progress-button"
                              >
                                补下一味
                              </button>
                            ) : null}
                          </div>
                          <div className="alchemy-slot-editor__formula-progress-grid">
                            {formulaProgressRows.map((item) => (
                              <div
                                key={item.key}
                                className={`alchemy-slot-editor__formula-progress-item ${
                                  item.remaining === 0 ? "alchemy-slot-editor__formula-progress-item--ready" : ""
                                }`}
                              >
                                <span className="alchemy-slot-editor__formula-progress-name">{item.label}</span>
                                <span className="alchemy-slot-editor__formula-progress-meta">
                                  {item.current}/{item.required}
                                  {item.remaining > 0 ? ` · 还差 ${item.remaining}` : " · 已就位"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {selectedSlot?.material ? (
                        <>
                          <div className="alchemy-slot-editor__controls">
                            <button
                              type="button"
                              onClick={() => adjustSelectedSlotAmount(-1)}
                              className="alchemy-slot-editor__amount-button"
                            >
                              -1
                            </button>
                            <span className="alchemy-slot-editor__amount-value">{selectedSlot.amount}</span>
                            <button
                              type="button"
                              onClick={() => adjustSelectedSlotAmount(1)}
                              className="alchemy-slot-editor__amount-button"
                            >
                              +1
                            </button>
                          </div>
                          <div className="alchemy-slot-editor__actions">
                            <button
                              type="button"
                              onClick={() => {
                                clearSlot(selectedSlotIndex);
                                publishNearHandResult(`已清空第 ${selectedSlotIndex + 1} 槽。`, {
                                  tone: "neutral",
                                  title: "槽位已清空",
                                  detail: `第 ${selectedSlotIndex + 1} 槽可以重新投入材料。`,
                                });
                              }}
                              className="alchemy-slot-editor__secondary"
                            >
                              清空当前槽
                            </button>
                            <button
                              type="button"
                              onClick={() => setMobileInventoryOpen(true)}
                              className="alchemy-slot-editor__secondary lg:hidden"
                            >
                              打开材料匣
                            </button>
                          </div>
                        </>
                      ) : (
                        <p className="alchemy-slot-editor__empty-note">
                          当前已选中空槽。用快捷投料或材料匣，会优先把材料投入这里。
                        </p>
                      )}
                      <div className="alchemy-slot-editor__recommend">
                        <p className="alchemy-slot-editor__recommend-label">
                          当前推荐{formulaTarget && formulaTarget.foreignCount === 0 ? ` · ${formulaTarget.formula.name}` : ""}
                        </p>
                        {slotEditorSuggestions.length > 0 ? (
                          <div className="alchemy-slot-editor__recommend-list">
                            {slotEditorSuggestions.map((item) => (
                              <button
                                key={`${item.key}-${item.note}`}
                                type="button"
                                onClick={() => handleInventoryInsert(item.key)}
                                className="alchemy-slot-editor__recommend-item"
                              >
                                <span className="alchemy-slot-editor__recommend-name">{item.label}</span>
                                <span className="alchemy-slot-editor__recommend-note">{item.note}</span>
                                <span className="alchemy-slot-editor__recommend-meta">
                                  {item.actionLabel} · 可投 {item.available}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="alchemy-slot-editor__empty-note">
                            当前没有可补入的同材。可以先清空该槽，或切换到其他槽位。
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="alchemy-slot-editor__empty-note">
                      先点阵盘中的槽位，再在这里调整数量或定向投料。
                    </p>
                  )}
                  <div className="alchemy-slot-editor__desktop-actions hidden lg:grid">
                    <button
                      type="button"
                      onClick={clearAllSlots}
                      disabled={filledSlotCount === 0}
                      className="alchemy-slot-editor__secondary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      清空阵位
                    </button>
                    <button
                      type="button"
                      onClick={onTransmute}
                      disabled={!canTransmute}
                      className="alchemy-slot-editor__primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      刻印炼成
                    </button>
                  </div>
                </div>
              </div>
              <p className="mt-3 block text-xs leading-6 text-[#6a5330] sm:hidden">
                小屏设备上优先使用“材料匣”或上方快捷投料，会比拖拽更稳定。
              </p>
            </div>
          </article>

        </section>

        <aside className="workshop-page__sidebar reveal-up reveal-delay-2 lg:sticky lg:top-[7.1rem] lg:max-h-[calc(100dvh-8rem)]">
          <details className="alchemy-fold hidden lg:block" open>
            <summary className="alchemy-fold__summary">背包与投料</summary>
            <div className="alchemy-fold__content">{renderInventoryPanel()}</div>
          </details>

          <details className="alchemy-fold">
            <summary className="alchemy-fold__summary">炼金临时效果</summary>
            <div className="alchemy-fold__content">
              {game.activeEffects.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {game.activeEffects.map((effect) => (
                    <li key={effect.id} className="rounded border border-[#8b7954]/35 bg-[#fff8e8] p-2">
                      <p className="font-semibold">{effect.label}</p>
                      <p className="mt-1 opacity-85">{effect.description}</p>
                      <p className="text-xs opacity-75">剩余炼成：{effect.remainingTransmutations}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-7 opacity-80">
                  当前没有临时效果。你可以先去剧情页触发异象，获得祝福或负面状态。
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
                  const isActiveTarget = formulaTarget?.formula.id === formula.id && formulaTarget.foreignCount === 0;
                  return (
                    <li
                      key={formula.id}
                      className={`rounded-lg border p-2 ${
                        isActiveTarget
                          ? "alchemy-formula-list__item--active"
                          : unlocked
                          ? "border-[#7b6944]/50 bg-[#fff8e6]"
                          : "border-[#8d7f63]/35 bg-[#f4ecda] opacity-70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold">{discovered ? formula.name : "未解析定式"}</p>
                        {isActiveTarget ? (
                          <span className="alchemy-formula-list__status">
                            {formulaProgressRows.filter((item) => item.remaining === 0).length}/{formulaProgressRows.length}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs">
                        需求境界：{formula.minRank}
                        {isActiveTarget ? "（当前逼近）" : unlocked ? "（可触发）" : "（尚未达到）"}
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
                          尚未破译。尝试靠近正确组合，捕捉阵纹共振以解锁细节。
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

      <div className="alchemy-action-bar">
        <div className="alchemy-action-bar__panel">
          <div className="alchemy-action-bar__summary">
            <p className="alchemy-action-bar__label">当前刻印</p>
            <div className="alchemy-action-bar__stats">
              <span className="alchemy-action-bar__stat alchemy-action-bar__stat--compact">
                值 {offeredValue} · 阵 {filledSlotCount}/9 · 行动 {game.actionsLeft}/3
              </span>
              <span className="alchemy-action-bar__stat alchemy-action-bar__stat--desktop">值 {offeredValue} · 阵 {filledSlotCount}/9</span>
              <span className="alchemy-action-bar__stat alchemy-action-bar__stat--desktop">行动 {game.actionsLeft}/3</span>
            </div>
            <p className="alchemy-action-bar__message">{actionBarMessage}</p>
          </div>
          <div className="alchemy-action-bar__actions">
            <button
              type="button"
              onClick={() => setMobileInventoryOpen(true)}
              className="game-button rounded-lg border border-[#b48d54]/45 bg-[#f7ebcf] px-2 py-1.5 text-[12px] font-medium text-[#4d381c] hover:bg-[#efe0ba] sm:px-3 sm:py-2 sm:text-sm lg:hidden"
            >
              材料匣
            </button>
            <button
              type="button"
              onClick={clearAllSlots}
              disabled={filledSlotCount === 0}
              className="game-button min-w-[4.1rem] rounded-lg border border-[#8c7752]/45 bg-[#f4e8cc] px-2 py-1.5 text-[12px] font-medium text-[#4d381c] hover:bg-[#edddb6] disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-24 sm:px-3 sm:py-2 sm:text-sm"
            >
              <span className="sm:hidden">清空</span>
              <span className="hidden sm:inline">清空阵位</span>
            </button>
            <button
              type="button"
              onClick={onTransmute}
              disabled={!canTransmute}
              className="game-button rounded-lg border border-[#6b5b37] bg-[#ead8aa] px-2.5 py-1.5 text-[12px] font-semibold text-[#3f2d16] hover:bg-[#dfc993] disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:py-2 sm:text-sm"
            >
              <span className="sm:hidden">炼成</span>
              <span className="hidden sm:inline">刻印炼成</span>
            </button>
          </div>
        </div>
      </div>

      {mobileInventoryOpen ? (
        <div className="alchemy-mobile-drawer lg:hidden" role="dialog" aria-modal="true" aria-label="材料匣">
          <button
            type="button"
            aria-label="关闭材料匣"
            onClick={() => setMobileInventoryOpen(false)}
            className="alchemy-mobile-drawer__backdrop"
          />
          <div className="alchemy-mobile-drawer__panel">
            <div className="alchemy-mobile-drawer__header">
              <div>
                <p className="alchemy-mobile-drawer__eyebrow">Inventory Drawer</p>
                <h3 className="alchemy-mobile-drawer__title">材料匣</h3>
                <p className="alchemy-mobile-drawer__lead">{mobileDrawerLead}</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileInventoryOpen(false)}
                className="alchemy-mobile-drawer__close"
              >
                收起
              </button>
            </div>
            <div className="alchemy-mobile-drawer__meta">
              <span>阵位 {filledSlotCount}/9</span>
              <span>价值 {offeredValue}</span>
              <span>行动 {game.actionsLeft}/3</span>
            </div>
            <div className="alchemy-mobile-drawer__content">{renderInventoryPanel(true)}</div>
          </div>
        </div>
      ) : null}

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




