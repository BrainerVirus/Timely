import { m } from "motion/react";
import { cn } from "@/lib/utils";
import { FoxMascot, type FoxMood } from "@/components/shared/fox-mascot";
import { scaleInVariants, springBouncy } from "@/lib/animations";

interface EmptyStateProps {
  title: string;
  description?: string;
  mood?: FoxMood;
  foxSize?: number;
  action?: React.ReactNode;
  variant?: "card" | "plain";
}

export function EmptyState({
  title,
  description,
  mood = "idle",
  foxSize = 100,
  action,
  variant = "card",
}: EmptyStateProps) {
  return (
    <m.div
      variants={scaleInVariants}
      initial="initial"
      animate="animate"
      className={cn(
        "mx-auto flex max-w-xs flex-col items-center justify-center gap-4 px-6 py-8",
        variant === "card" &&
          "rounded-2xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] shadow-[var(--shadow-card)]",
      )}
    >
      <m.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...springBouncy, delay: 0.15 }}
      >
        <FoxMascot mood={mood} size={foxSize} />
      </m.div>
      <div className="text-center">
        <p className="font-display text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action && (
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springBouncy, delay: 0.25 }}
        >
          {action}
        </m.div>
      )}
    </m.div>
  );
}
