import { AnimatePresence, m } from "motion/react";
import { pageVariants, staggerContainer } from "@/lib/animations";
import { useMotionSettings } from "@/lib/motion";

/* ------------------------------------------------------------------ */
/*  PageTransition                                                     */
/* ------------------------------------------------------------------ */

interface PageTransitionProps {
  /** Unique key for AnimatePresence — typically the route path */
  pageKey: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps page content with fade + slide entrance/exit animation.
 * Uses AnimatePresence so outgoing pages animate out before the
 * incoming page animates in.
 */
export function PageTransition({ pageKey, children, className }: PageTransitionProps) {
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();
  const shouldEnter = allowDecorativeAnimation && windowVisibility === "visible";

  return (
    <AnimatePresence initial={false} mode="wait">
      <m.div
        key={pageKey}
        variants={pageVariants}
        initial={shouldEnter ? "initial" : false}
        animate="animate"
        exit={shouldEnter ? "exit" : undefined}
        className={className}
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  StaggerGroup                                                       */
/* ------------------------------------------------------------------ */

interface StaggerGroupProps {
  children: React.ReactNode;
  className?: string;
  "aria-busy"?: boolean;
}

/**
 * Container that staggers child `m.*` elements on mount.
 * Wrap cards, list items, or stat chips in this for a cascading entrance.
 *
 * Children should use `staggerItem`, `staggerItemLeft`, or `staggerItemScale`
 * variants from `@/lib/animations`.
 */
export function StaggerGroup({ children, className, ...rest }: StaggerGroupProps) {
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();
  const shouldEnter = allowDecorativeAnimation && windowVisibility === "visible";

  return (
    <m.div
      variants={staggerContainer}
      initial={shouldEnter ? "initial" : false}
      animate="animate"
      className={className}
      {...rest}
    >
      {children}
    </m.div>
  );
}
