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

/** Snappy spring — UI interactions, toggles, tabs */
export const springSnappy: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 35,
  mass: 0.5,
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
export const easeOut = [0.25, 0.1, 0.0, 1.0] as const;

/** Ease for overlays (slightly slower) */
export const easeOverlay = [0.32, 0.72, 0, 1] as const;

/* ------------------------------------------------------------------ */
/*  Fade + slide variants                                              */
/* ------------------------------------------------------------------ */

/** Subtle fade + slide up for content sections */
export const fadeInVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [...easeOut] },
  },
};

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

/** Slide from right — for drawers, sheets */
export const slideRightVariants: Variants = {
  initial: { x: "100%" },
  animate: {
    x: 0,
    transition: { ...springSnappy },
  },
  exit: {
    x: "100%",
    transition: { duration: 0.25, ease: [...easeOverlay] },
  },
};

/** Slide from left */
export const slideLeftVariants: Variants = {
  initial: { x: "-100%" },
  animate: {
    x: 0,
    transition: { ...springSnappy },
  },
  exit: {
    x: "-100%",
    transition: { duration: 0.25, ease: [...easeOverlay] },
  },
};

/** Slide from bottom — for bottom sheets, tray */
export const slideUpVariants: Variants = {
  initial: { y: "100%" },
  animate: {
    y: 0,
    transition: { ...springSnappy },
  },
  exit: {
    y: "100%",
    transition: { duration: 0.25, ease: [...easeOverlay] },
  },
};

/** Backdrop/overlay fade */
export const backdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.25, ease: [...easeOverlay] },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: [...easeOverlay] },
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

/** Child for stagger — fade + slide from left */
export const staggerItemLeft: Variants = {
  initial: { opacity: 0, x: -8 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { ...springGentle },
  },
};

/** Child for stagger — fade + scale */
export const staggerItemScale: Variants = {
  initial: { opacity: 0, scale: 0.85 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { ...springBouncy },
  },
};

/* ------------------------------------------------------------------ */
/*  Kept for backward compat                                           */
/* ------------------------------------------------------------------ */

/** @deprecated Use springData instead */
export const springTransition: Transition = springData;
