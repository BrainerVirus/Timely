import { m } from "motion/react";
import { staggerContainer } from "@/shared/lib/animations/animations";

/* ------------------------------------------------------------------ */
/*  StaggerGroup                                                       */
/* ------------------------------------------------------------------ */

interface StaggerGroupProps {
  children: React.ReactNode;
  className?: string;
  "aria-busy"?: boolean;
  /** When false, disables stagger entrance. Default true. */
  allowDecorativeAnimation?: boolean;
  /** When "hidden", disables stagger entrance. Default "visible". */
  windowVisibility?: "visible" | "hidden";
}

/**
 * Container that staggers child `m.*` elements on mount.
 * Wrap cards, list items, or stat chips in this for a cascading entrance.
 *
 * Children should use `staggerItem` variants from `@/shared/lib/animations`.
 */
export function StaggerGroup({
  children,
  className,
  allowDecorativeAnimation = true,
  windowVisibility = "visible",
  ...rest
}: Readonly<StaggerGroupProps>) {
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
