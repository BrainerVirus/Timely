import * as React from "react";
import { cn } from "@/lib/utils";

interface ScrollFadeProps {
  children: React.ReactNode;
  /** Outer wrapper — height/layout classes (flex-1, max-h-48, etc.). overflow-hidden is added automatically. */
  className?: string;
  /** Extra classes on the inner scroll div (padding, etc.). */
  scrollClassName?: string;
  /** CSS color for the gradient edges. Defaults to var(--color-card). */
  fromColor?: string;
  /** Show top fade. Default true. */
  fadeTop?: boolean;
  /** Show bottom fade. Default true. */
  fadeBottom?: boolean;
  /** Ref forwarded to the inner scroll div (for auto-scroll via scrollTop). */
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  /** tabIndex forwarded to the inner scroll div (e.g. -1 for programmatic focus). */
  tabIndex?: number;
}

/**
 * ScrollFade — wraps any scrollable content with gradient fade overlays at
 * the top and bottom so the edges dissolve into the surface background.
 *
 * Layout contract:
 *  - Outer div: relative + overflow-hidden + caller's layout classes (flex-1, max-h-*, etc.)
 *  - Inner div: absolute inset-0 + overflow-y-auto (fills the positioned parent)
 *
 * Both flex-1 (fill-height) and max-height containers work because
 * `absolute inset-0` always fills the nearest positioned ancestor.
 */
export function ScrollFade({
  children,
  className,
  scrollClassName,
  fromColor = "var(--color-card)",
  fadeTop = true,
  fadeBottom = true,
  scrollRef,
  tabIndex,
}: ScrollFadeProps) {
  const topStyle: React.CSSProperties = {
    background: `linear-gradient(to bottom, ${fromColor} 0%, transparent 100%)`,
  };
  const bottomStyle: React.CSSProperties = {
    background: `linear-gradient(to top, ${fromColor} 0%, transparent 100%)`,
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {fadeTop && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6"
          style={topStyle}
        />
      )}
      {fadeBottom && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12"
          style={bottomStyle}
        />
      )}
      <div
        ref={scrollRef}
        tabIndex={tabIndex}
        className={cn("absolute inset-0 overflow-y-auto", scrollClassName)}
      >
        {children}
      </div>
    </div>
  );
}
