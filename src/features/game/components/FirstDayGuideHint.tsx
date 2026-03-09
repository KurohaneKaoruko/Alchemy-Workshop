import Link from "next/link";
import type { FirstDayGuide, FirstDayGuideStepId } from "@/features/game/logic/firstDayGuide";

interface FirstDayGuideHintProps {
  guide: FirstDayGuide | null;
  currentStepId: FirstDayGuideStepId;
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

export function FirstDayGuideHint({ guide, currentStepId }: FirstDayGuideHintProps) {
  if (!guide) {
    return null;
  }

  const currentStep = guide.steps.find((step) => step.id === currentStepId) ?? guide.steps[0];
  const activeStep = guide.steps.find((step) => step.status === "active") ?? currentStep;
  const nextStep = guide.steps.find((step) => step.status !== "done" && step.id !== activeStep.id) ?? null;
  const isRecommendedHere = guide.currentStepId === currentStepId;
  const showMilestoneAction = Boolean(guide.milestone && guide.milestone.nextHref !== guide.currentHref);

  const headline = isRecommendedHere
    ? `首日引导：当前就该做「${currentStep.title}」`
    : currentStep.status === "done"
      ? "首日引导：这一步已经完成"
      : "首日引导：这里适合放在后一步";

  const summary = isRecommendedHere
    ? nextStep
      ? `先完成这一步，再去「${nextStep.title}」。`
      : "这一步完成后，记得回档案确认今天的收获。"
    : currentStep.status === "done"
      ? `你已经完成「${currentStep.title}」，现在更建议${guide.currentActionLabel}。`
      : `当前更建议先做「${activeStep.title}」，完成后再回到这里。`;

  return (
    <section className="ritual-card reveal-up reveal-delay-1 rounded-2xl p-5 first-day-hint">
      <div className="first-day-hint__head">
        <div className="min-w-0 flex-1">
          <p className="ritual-card__eyebrow">学徒首日引导</p>
          <h3 className="ritual-card__title">{headline}</h3>
          <p className="ritual-card__copy">{summary}</p>
        </div>
        {!isRecommendedHere ? (
          <Link
            href={guide.currentHref}
            className="game-button inline-flex min-h-10 items-center justify-center rounded-xl border border-[#6b5b37] bg-[#ead8aa] px-4 py-2 text-sm font-semibold text-[#3f2d16] hover:bg-[#dfc993]"
          >
            {guide.currentActionLabel}
          </Link>
        ) : null}
      </div>

      {guide.milestone ? (
        <div className="first-day-hint__milestone mt-4">
          <div className="min-w-0 flex-1">
            <p className="first-day-hint__milestone-label">阶段完成反馈</p>
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
        {guide.steps.map((step) => (
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
