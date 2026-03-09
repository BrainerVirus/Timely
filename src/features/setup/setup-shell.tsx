import { m } from "motion/react";
import { cn } from "@/lib/utils";

interface SetupShellProps {
  children: React.ReactNode;
  step: number;
  totalSteps: number;
}

export function SetupShell({ children, step, totalSteps }: SetupShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 p-6">
      <div className="w-full max-w-lg space-y-8">
        <m.div
          key={step}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
          className="rounded-2xl border-2 border-border bg-card p-8 shadow-[var(--shadow-clay)]"
        >
          {children}
        </m.div>
        <StepDots total={totalSteps} current={step} />
      </div>
    </div>
  );
}

function stepDotStyle(i: number, current: number): string {
  if (i === current) return "w-6 bg-primary border-2 border-primary/40 shadow-[1px_1px_0_0_var(--color-border)]";
  if (i < current) return "w-2 bg-primary/60";
  return "w-2 bg-border";
}

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <m.div
          key={i}
          layout
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={cn("h-2.5 rounded-full transition-colors", stepDotStyle(i, current))}
        />
      ))}
    </div>
  );
}
