import type { Transition, Variants } from "motion/react";

/* ------------------------------------------------------------------ */
/*  Spring presets                                                     */
/* ------------------------------------------------------------------ */

/** Bouncy spring — playful elements, indicators, badges */
export const springBouncy: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 25,
  mass: 0.8,
};

/** Gentle spring — page content, large sections */
export const springGentle: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 30,
  mass: 1,
};

/** Data spring — progress bars, counters, rings */
export const springData: Transition = {
  type: "spring",
  duration: 0.5,
  bounce: 0.1,
};

/* ------------------------------------------------------------------ */
/*  Ease presets                                                       */
/* ------------------------------------------------------------------ */

/** Smooth material-style ease-out */
export const easeOut = [0.25, 0.1, 0, 1] as const;

/** Fade + slide up (larger offset for page-level content) */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { ...springGentle },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2, ease: [...easeOut] },
  },
};

/** Fade + scale for modals/dialogs */
export const scaleInVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { ...springBouncy },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15, ease: [...easeOut] },
  },
};

/* ------------------------------------------------------------------ */
/*  Stagger variants                                                   */
/* ------------------------------------------------------------------ */

/** Container that staggers children on mount */
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

/** Child for stagger — fade + slide up */
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { ...springGentle },
  },
};
