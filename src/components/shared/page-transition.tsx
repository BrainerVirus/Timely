import { AnimatePresence, m } from "motion/react";
import { pageVariants, staggerContainer } from "@/lib/animations";

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
  return (
    <AnimatePresence mode="wait">
      <m.div
        key={pageKey}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
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
}

/**
 * Container that staggers child `m.*` elements on mount.
 * Wrap cards, list items, or stat chips in this for a cascading entrance.
 *
 * Children should use `staggerItem`, `staggerItemLeft`, or `staggerItemScale`
 * variants from `@/lib/animations`.
 */
export function StaggerGroup({ children, className }: StaggerGroupProps) {
  return (
    <m.div variants={staggerContainer} initial="initial" animate="animate" className={className}>
      {children}
    </m.div>
  );
}
