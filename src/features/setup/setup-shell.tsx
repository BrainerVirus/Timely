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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.0, 1.0] }}
        >
          {children}
        </m.div>
        <StepDots total={totalSteps} current={step} />
      </div>
    </div>
  );
}

function stepDotStyle(i: number, current: number): string {
  if (i === current) return "w-6 bg-primary";
  if (i < current) return "w-2 bg-accent";
  return "w-2 bg-border";
}

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn("h-2 rounded-full transition-all", stepDotStyle(i, current))}
        />
      ))}
    </div>
  );
}
