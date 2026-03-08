import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left.js";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right.js";
import { Card } from "@/components/ui/card";
import { SetupProgress } from "@/features/setup/setup-progress";
import { setupSteps, type SetupStep } from "@/features/setup/setup-flow";

import type { ReactNode } from "react";

export function SetupShell({
  step,
  eyebrow,
  title,
  description,
  children,
  onBack,
  onNext,
  nextLabel = "Continue",
  backLabel = "Back",
  nextDisabled,
  secondaryAction,
}: {
  step: SetupStep;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  backLabel?: string;
  nextDisabled?: boolean;
  secondaryAction?: ReactNode;
}) {
  const currentIndex = setupSteps.indexOf(step);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4 p-5 sm:p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              {eyebrow}
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-semibold text-foreground">{title}</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground transition hover:bg-background"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {backLabel}
                </button>
              ) : null}

              {onNext ? (
                <button
                  type="button"
                  onClick={onNext}
                  disabled={nextDisabled}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {nextLabel}
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : null}

              {secondaryAction}
            </div>
          </div>

          <div className="border-t border-border/70 bg-muted/35 p-5 xl:border-t-0 xl:border-l sm:p-6">
            <SetupProgress currentStep={step} currentIndex={currentIndex} />
          </div>
        </div>
      </Card>

      {children}
    </div>
  );
}
