import type { Transition, Variants } from "motion/react";

/** Subtle fade + slide for content sections */
export const fadeInVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.0, 1.0] },
  },
};

/** Spring transition for data-driven values (progress bars, counters) */
export const springTransition: Transition = {
  type: "spring",
  duration: 0.5,
  bounce: 0.1,
};
