import { m } from "motion/react";
import { staggerContainer } from "@/lib/animations";
import { useMotionSettings } from "@/lib/motion";

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
 * Children should use `staggerItem` variants from `@/lib/animations`.
 */
export function StaggerGroup({ children, className, ...rest }: Readonly<StaggerGroupProps>) {
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
