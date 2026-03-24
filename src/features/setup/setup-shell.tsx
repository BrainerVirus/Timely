import { m } from "motion/react";
import { cn } from "@/shared/utils/utils";

interface SetupShellProps {
  children: React.ReactNode;
  step: number;
  totalSteps: number;
}

export function SetupShell({ children, step, totalSteps }: Readonly<SetupShellProps>) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-app-frame to-page-canvas p-6">
      <div className="w-full max-w-lg space-y-8">
        <m.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
          className="rounded-2xl border-2 border-border-subtle bg-panel-elevated p-8 shadow-card"
        >
          {children}
        </m.div>
        <StepDots total={totalSteps} current={step} />
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
