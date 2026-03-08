import CheckCircle2 from "lucide-react/dist/esm/icons/circle-check.js";
import Dot from "lucide-react/dist/esm/icons/dot.js";
import { cn } from "@/lib/utils";
import { setupSteps, type SetupStep } from "./setup-flow";

const labels: Record<SetupStep, { title: string; note: string }> = {
  welcome: { title: "Welcome", note: "Start from Home with a guided first-run flow." },
  provider: { title: "Provider", note: "Connect GitLab and future providers here." },
  schedule: { title: "Schedule", note: "Set workdays, shift hours, and week rhythm." },
  sync: { title: "Sync", note: "Pull real data and prepare the app for daily use." },
  done: { title: "Finish", note: "Drop into the redesigned app shell." },
};

export function SetupProgress({
  currentStep,
  currentIndex,
}: {
  currentStep: SetupStep;
  currentIndex: number;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Setup journey</p>
        <p className="mt-2 font-display text-lg font-semibold text-foreground">
          Step {currentIndex + 1} of {setupSteps.length}
        </p>
      </div>

      <div className="space-y-3">
        {setupSteps.map((step, index) => {
          const meta = labels[step];
          const isCurrent = step === currentStep;
          const isComplete = index < currentIndex;

          return (
            <div
              key={step}
              className={cn(
                "rounded-2xl border p-4 transition-colors",
                isCurrent
                  ? "border-primary/25 bg-background text-foreground"
                  : "border-border bg-background/70 text-muted-foreground",
              )}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <Dot className={cn("h-5 w-5", isCurrent ? "text-primary" : "text-muted-foreground/60")} />
                  )}
                </div>
                <div>
                  <p className={cn("text-sm font-semibold", isCurrent ? "text-foreground" : "text-foreground/80")}>
                    {meta.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{meta.note}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
