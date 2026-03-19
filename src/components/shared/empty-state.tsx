import { m } from "motion/react";
import { FoxMascot, type FoxMood } from "@/components/shared/fox-mascot";
import { scaleInVariants, springBouncy } from "@/lib/animations";
import { useMotionSettings } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  mood?: FoxMood;
  foxSize?: number;
  action?: React.ReactNode;
  variant?: "card" | "plain";
  animationStyle?: "staged" | "together";
  disableInnerAnimation?: boolean;
}

export function EmptyState({
  title,
  description,
  mood = "idle",
  foxSize = 100,
  action,
  variant = "card",
  animationStyle = "staged",
  disableInnerAnimation = false,
}: EmptyStateProps) {
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();
  const shouldEnter = allowDecorativeAnimation && windowVisibility === "visible";
  const foxDelay = animationStyle === "together" ? 0 : 0.15;
  const actionDelay = animationStyle === "together" ? 0.08 : 0.25;

  return (
    <m.div
      variants={scaleInVariants}
      initial={shouldEnter ? "initial" : false}
      animate="animate"
      className={cn(
        "mx-auto flex max-w-xs flex-col items-center justify-center gap-4 px-6 py-8",
        variant === "card" &&
          "rounded-2xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] shadow-[var(--shadow-card)]",
      )}
    >
      {disableInnerAnimation ? (
        <div>
          <FoxMascot mood={mood} size={foxSize} animationMode="none" />
        </div>
      ) : (
        <m.div
          initial={shouldEnter ? { scale: 0.8, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={shouldEnter ? { ...springBouncy, delay: foxDelay } : { duration: 0 }}
        >
          <FoxMascot mood={mood} size={foxSize} animationMode="none" />
        </m.div>
      )}
      <div className="text-center">
        <p className="font-display text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action
        ? disableInnerAnimation
          ? <div>{action}</div>
          : (
              <m.div
                initial={shouldEnter ? { opacity: 0, y: 8 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={shouldEnter ? { ...springBouncy, delay: actionDelay } : { duration: 0 }}
              >
                {action}
              </m.div>
            )
        : null}
    </m.div>
  );
}
