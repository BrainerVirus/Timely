import type { Transition, Variants } from "motion/react";

/** Page/view transition variants */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const pageTransition: Transition = {
  duration: 0.25,
  ease: [0.25, 0.1, 0.0, 1.0],
};

/** Staggered card mount */
export const cardContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.06 },
  },
};

export const cardItemVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.1, 0.0, 1.0] },
  },
};

/** Sidebar slide-in */
export const sidebarVariants: Variants = {
  initial: { opacity: 0, x: -32 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};
