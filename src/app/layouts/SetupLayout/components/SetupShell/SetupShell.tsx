import { m } from "motion/react";
import { cn } from "@/shared/lib/utils";
import { ScrollArea } from "@/shared/ui/ScrollArea/ScrollArea";

interface SetupShellProps {
  children: React.ReactNode;
  step: number;
  totalSteps: number;
  width?: "default" | "wide";
}

export function SetupShell({
  children,
  step,
  totalSteps,
  width = "default",
}: Readonly<SetupShellProps>) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-app-frame to-page-canvas p-6">
      <div
        className={cn(
          "flex min-h-0 w-full max-h-[calc(100dvh-3rem)] flex-col gap-8",
          width === "wide" ? "max-w-5xl" : "max-w-lg",
        )}
      >
        <m.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border-2 border-border-subtle bg-panel-elevated shadow-card"
        >
          <ScrollArea className="min-h-0 flex-1" scrollbars="vertical">
            <div className="p-8">{children}</div>
          </ScrollArea>
        </m.div>
        <div className="shrink-0">
          <StepDots total={totalSteps} current={step} />
        </div>
      </div>
    </div>
  );
}

function stepDotStyle(i: number, current: number): string {
  if (i === current)
    return "w-6 bg-primary border-2 border-primary/40 shadow-[1px_1px_0_0_var(--color-border)]";
  if (i < current) return "w-2 bg-primary/60";
  return "w-2 bg-border";
}

function StepDots({ total, current }: Readonly<{ total: number; current: number }>) {
  const stepNumbers = Array.from({ length: total }, (_, value) => value + 1);

  return (
    <div className="flex justify-center gap-2">
      {stepNumbers.map((stepNumber) => (
        <m.div
          key={`step-${stepNumber}`}
          layout
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={cn(
            "h-2.5 rounded-full transition-colors",
            stepDotStyle(stepNumber - 1, current),
          )}
        />
      ))}
    </div>
  );
}
