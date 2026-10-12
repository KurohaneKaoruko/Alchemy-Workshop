"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import {
  getFirstDayGuideSignature,
  type FirstDayGuide,
  type FirstDayGuideStepId,
} from "@/features/game/logic/firstDayGuide";

interface FirstDayGuideHintProps {
  guide: FirstDayGuide | null;
  currentStepId?: FirstDayGuideStepId;
  variant?: "default" | "compact";
}

const FIRST_DAY_GUIDE_DISMISS_KEY = "alchemy-workshop-first-day-guide-dismissed-v1";
const FIRST_DAY_GUIDE_STORE_EVENT = "alchemy-workshop-first-day-guide-store";

function subscribeToDismissedSignature(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(FIRST_DAY_GUIDE_STORE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(FIRST_DAY_GUIDE_STORE_EVENT, onStoreChange);
  };
}

function readDismissedSignature(): string {
  try {
    return window.localStorage.getItem(FIRST_DAY_GUIDE_DISMISS_KEY) ?? "";
  } catch {
    return "";
  }
}

function readDismissedSignatureOnServer(): string {
  return "";
}

function writeDismissedSignature(signature: string | null): void {
  try {
    if (signature === null) {
      window.localStorage.removeItem(FIRST_DAY_GUIDE_DISMISS_KEY);
    } else {
      window.localStorage.setItem(FIRST_DAY_GUIDE_DISMISS_KEY, signature);
    }
  } catch {}
  window.dispatchEvent(new Event(FIRST_DAY_GUIDE_STORE_EVENT));
}

function getStepStateLabel(state: "pending" | "active" | "done"): string {
  if (state === "done") {
    return "已完成";
  }
  if (state === "active") {
    return "当前步骤";
  }
  return "稍后再来";
}

export function FirstDayGuideHint({
  guide,
  currentStepId,
  variant = "default",
}: FirstDayGuideHintProps) {
  const guideSignature = useMemo(() => (guide ? getFirstDayGuideSignature(guide) : ""), [guide]);
  const dismissedSignature = useSyncExternalStore(
    subscribeToDismissedSignature,
    readDismissedSignature,
    readDismissedSignatureOnServer,
  );

  if (!guide) {
    return null;
  }

  const isDismissed = dismissedSignature !== "" && dismissedSignature === guideSignature;
  const isOverview = currentStepId === undefined;
  const isCompact = variant === "compact";

  function dismissGuide() {
    writeDismissedSignature(guideSignature);
  }

  function reopenGuide() {
    writeDismissedSignature(null);
  }

  if (isDismissed) {
    return (
      <section className="ritual-card reveal-up reveal-delay-1 rounded-2xl p-4 first-day-hint first-day-hint--collapsed">
        <div className="first-day-hint__collapsed">
          <div className="min-w-0 flex-1">
            <p className="ritual-card__eyebrow">{guide.mode === "recap" ? "首日回顾" : "学徒首日引导"}</p>
            <p className="first-day-hint__collapsed-copy">
              {guide.mode === "recap" ? "首日回顾提示已收起，需要时可以重新展开。" : "当前阶段提示已收起，需要时可以重新展开。"}
            </p>
          </div>
          <button
            type="button"
            onClick={reopenGuide}
            className="game-button rounded-lg border border-[#8f7448]/20 bg-[rgba(255,252,245,0.82)] px-3 py-2 text-sm font-semibold text-[#4f3a1c] hover:bg-[rgba(246,237,214,0.92)]"
          >
            重新展开
          </button>
        </div>
      </section>
    );
  }

  if (guide.mode === "recap") {
    return (
      <section
        className={`ritual-card reveal-up reveal-delay-1 rounded-2xl p-4 first-day-hint first-day-hint--recap ${
          isCompact ? "first-day-hint--compact" : ""
        }`}
      >
        <div className="first-day-hint__head">
          <div className="min-w-0 flex-1">
            <p className="ritual-card__eyebrow">首日回顾</p>
            <h3 className="ritual-card__title">{guide.headline}</h3>
            <p className="ritual-card__copy">{guide.summary}</p>
          </div>
          <div className="first-day-hint__head-actions">
            <Link
              href={guide.currentHref}
              className="game-button inline-flex min-h-10 items-center justify-center rounded-xl border border-[#6b5b37] bg-[#ead8aa] px-4 py-2 text-sm font-semibold text-[#3f2d16] hover:bg-[#dfc993]"
            >
              {guide.currentActionLabel}
            </Link>
            <button
              type="button"
              onClick={dismissGuide}
              className="game-button rounded-lg border border-[#8f7448]/20 bg-[rgba(255,252,245,0.82)] px-3 py-2 text-sm font-semibold text-[#4f3a1c] hover:bg-[rgba(246,237,214,0.92)]"
            >
              收起回顾
            </button>
          </div>
        </div>
      </section>
    );
  }

  const currentStep = guide.steps.find((step) => step.id === (currentStepId ?? guide.currentStepId)) ?? guide.steps[0];
  if (!currentStep) {
    return null;
  }
  const activeStep = guide.steps.find((step) => step.status === "active") ?? currentStep;
  const nextStep = guide.steps.find((step) => step.status !== "done" && step.id !== activeStep.id) ?? null;
  const isRecommendedHere = !isOverview && guide.currentStepId === currentStepId;
  const showMilestoneAction = Boolean(guide.milestone && guide.milestone.nextHref !== guide.currentHref);
  const stepCandidates: Array<typeof currentStep | null> = isOverview
    ? guide.steps
    : currentStep.status === "done"
      ? [currentStep, activeStep]
      : currentStep.status === "active"
        ? [currentStep, nextStep]
        : [activeStep, currentStep];
  const visibleSteps = Array.from(
    new Map(
      stepCandidates
        .filter((step): step is typeof currentStep => step !== null)
        .map((step) => [step.id, step]),
    ).values(),
  );

  const headline = isOverview
    ? guide.headline
    : isRecommendedHere
      ? `首日引导：当前就该做「${currentStep.title}」`
      : currentStep.status === "done"
        ? "首日引导：这一步已经完成"
        : "首日引导：这里适合放在后一步";

  const summary = isOverview
    ? guide.summary
    : isRecommendedHere
      ? nextStep
        ? `先完成这一步，再去「${nextStep.title}」。`
        : "这一步完成后，记得回档案确认今天的收获。"
      : currentStep.status === "done"
        ? `你已经完成「${currentStep.title}」，现在更建议${guide.currentActionLabel}。`
        : `当前更建议先做「${activeStep.title}」，完成后再回到这里。`;

  if (isCompact) {
    return (
      <section className="ritual-card reveal-up reveal-delay-1 rounded-2xl p-4 first-day-hint first-day-hint--compact">
        <div className="first-day-hint__head">
          <div className="min-w-0 flex-1">
            <p className="ritual-card__eyebrow">学徒首日引导</p>
            <h3 className="ritual-card__title">{headline}</h3>
            <p className="ritual-card__copy">{summary}</p>
          </div>
          <div className="first-day-hint__head-actions">
            {(isOverview || !isRecommendedHere) ? (
              <Link
                href={guide.currentHref}
                className="game-button inline-flex min-h-10 items-center justify-center rounded-xl border border-[#6b5b37] bg-[#ead8aa] px-4 py-2 text-sm font-semibold text-[#3f2d16] hover:bg-[#dfc993]"
              >
                {guide.currentActionLabel}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={dismissGuide}
              className="game-button rounded-lg border border-[#8f7448]/20 bg-[rgba(255,252,245,0.82)] px-3 py-2 text-sm font-semibold text-[#4f3a1c] hover:bg-[rgba(246,237,214,0.92)]"
            >
              我知道了
            </button>
          </div>
        </div>
        {guide.milestone ? (
          <div className="first-day-hint__milestone mt-3">
            <div className="min-w-0 flex-1">
              <p className="first-day-hint__milestone-label">{guide.milestone.label}</p>
              <strong className="first-day-hint__milestone-title">{guide.milestone.title}</strong>
              <p className="first-day-hint__milestone-copy">{guide.milestone.summary}</p>
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="ritual-card reveal-up reveal-delay-1 rounded-2xl p-5 first-day-hint">
      <div className="first-day-hint__head">
        <div className="min-w-0 flex-1">
          <p className="ritual-card__eyebrow">学徒首日引导</p>
          <h3 className="ritual-card__title">{headline}</h3>
          <p className="ritual-card__copy">{summary}</p>
        </div>
        <div className="first-day-hint__head-actions">
          {(isOverview || !isRecommendedHere) ? (
            <Link
              href={isOverview ? guide.currentHref : guide.currentHref}
              className="game-button inline-flex min-h-10 items-center justify-center rounded-xl border border-[#6b5b37] bg-[#ead8aa] px-4 py-2 text-sm font-semibold text-[#3f2d16] hover:bg-[#dfc993]"
            >
              {guide.currentActionLabel}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={dismissGuide}
            className="game-button rounded-lg border border-[#8f7448]/20 bg-[rgba(255,252,245,0.82)] px-3 py-2 text-sm font-semibold text-[#4f3a1c] hover:bg-[rgba(246,237,214,0.92)]"
          >
            我知道了
          </button>
        </div>
      </div>

      {guide.milestone ? (
        <div className="first-day-hint__milestone mt-4">
          <div className="min-w-0 flex-1">
            <p className="first-day-hint__milestone-label">{guide.milestone.label}</p>
            <strong className="first-day-hint__milestone-title">{guide.milestone.title}</strong>
            <p className="first-day-hint__milestone-copy">{guide.milestone.summary}</p>
          </div>
          {showMilestoneAction ? (
            <Link
              href={guide.milestone.nextHref}
              className="game-button inline-flex min-h-10 items-center justify-center rounded-xl border border-[#6b5b37] bg-[#ead8aa] px-4 py-2 text-sm font-semibold text-[#3f2d16] hover:bg-[#dfc993]"
            >
              {guide.milestone.nextActionLabel}
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="first-day-hint__steps mt-4">
        {visibleSteps.map((step) => (
          <article
            key={step.id}
            className={`first-day-hint__step ${
              step.status === "done"
                ? "first-day-hint__step--done"
                : step.status === "active"
                  ? "first-day-hint__step--active"
                  : ""
            }`}
          >
            <span className="first-day-hint__step-label">{getStepStateLabel(step.status)}</span>
            <strong className="first-day-hint__step-title">{step.title}</strong>
            <p className="first-day-hint__step-copy">{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
