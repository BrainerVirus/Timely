import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { animate } from "motion";
import { m, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Context for passing active value to triggers                       */
/* ------------------------------------------------------------------ */

const TabsActiveCtx = React.createContext<string | undefined>(undefined);

/* ------------------------------------------------------------------ */
/*  Tabs (root) — wraps in LayoutGroup for shared layoutId animations  */
/* ------------------------------------------------------------------ */

interface TabsProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  layoutId?: string;
}

const Tabs = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Root>, TabsProps>(
  ({ layoutId, value, defaultValue, onValueChange, children, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");

    const activeValue = value ?? internalValue;

    const handleValueChange = React.useCallback(
      (v: string) => {
        setInternalValue(v);
        onValueChange?.(v);
      },
      [onValueChange],
    );

    return (
      <TabsPrimitive.Root
        ref={ref}
        value={activeValue}
        onValueChange={handleValueChange}
        data-layout-id={layoutId}
        {...props}
      >
        <TabsActiveCtx.Provider value={activeValue}>{children}</TabsActiveCtx.Provider>
      </TabsPrimitive.Root>
    );
  },
);
Tabs.displayName = "Tabs";

/* ------------------------------------------------------------------ */
/*  TabsList                                                           */
/* ------------------------------------------------------------------ */

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, forwardedRef) => {
  const activeValue = React.useContext(TabsActiveCtx);
  const prefersReducedMotion = useReducedMotion();
  const listRef = React.useRef<React.ElementRef<typeof TabsPrimitive.List> | null>(null);
  const indicatorRef = React.useRef<HTMLSpanElement | null>(null);
  const previousRectRef = React.useRef<IndicatorRect | null>(null);

  const setRefs = React.useCallback(
    (node: React.ElementRef<typeof TabsPrimitive.List> | null) => {
      listRef.current = node;

      if (typeof forwardedRef === "function") {
        forwardedRef(node);
        return;
      }

      if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef],
  );

  React.useLayoutEffect(() => {
    const list = listRef.current;
    const indicator = indicatorRef.current;

    if (!list || !indicator) {
      return;
    }

    const updateIndicator = (shouldAnimate: boolean) => {
      const nextRect = getActiveIndicatorRect(list);

      if (!nextRect) {
        indicator.style.opacity = "0";
        previousRectRef.current = null;
        return;
      }

      indicator.style.opacity = "1";

      if (!shouldAnimate || prefersReducedMotion || previousRectRef.current == null) {
        applyIndicatorRect(indicator, nextRect);
        previousRectRef.current = nextRect;
        return;
      }

      const previousRect = previousRectRef.current;
      const stretchRect = getStretchRect(previousRect, nextRect);

      // Single animation call for all 4 properties — avoids the double-transform
      // conflict that caused Y misalignment, and gives both phases consistent timing.
      // times[1]=0.28 means stretch-out finishes in ~107ms; snap-back takes ~273ms.
      // Per-segment easing: easeOut for the stretch, fast-then-smooth for the snap.
      animate(
        indicator,
        {
          x: [previousRect.x, stretchRect.x, nextRect.x],
          width: [previousRect.width, stretchRect.width, nextRect.width],
          y: [previousRect.y, nextRect.y, nextRect.y],
          height: [previousRect.height, nextRect.height, nextRect.height],
        },
        {
          duration: 0.38,
          times: [0, 0.28, 1],
          ease: ["easeOut", [0.0, 0.0, 0.2, 1.0]],
        },
      );

      previousRectRef.current = nextRect;
    };

    updateIndicator(true);

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateIndicator(false);
    });

    observer.observe(list);
    Array.from(list.querySelectorAll<HTMLElement>("[role='tab']")).forEach((tab) => {
      observer.observe(tab);
    });

    return () => {
      observer.disconnect();
    };
  }, [activeValue, prefersReducedMotion]);

  return (
    <TabsPrimitive.List
      ref={setRefs}
      className={cn(
        "relative inline-flex h-auto items-center gap-1 rounded-2xl border-2 border-border bg-muted/35 p-1.5 shadow-[var(--shadow-clay)]",
        className,
      )}
      {...props}
    >
      <m.span
        ref={indicatorRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 rounded-xl bg-background shadow-[1px_1px_0_0_var(--color-border)]"
        style={{ opacity: 0 }}
      />
      {children}
    </TabsPrimitive.List>
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

/* ------------------------------------------------------------------ */
/*  TabsTrigger — with animated stretch indicator                      */
/* ------------------------------------------------------------------ */

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, value, ...props }, ref) => {
  const activeValue = React.useContext(TabsActiveCtx);
  const isActive = activeValue === value;

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      className={cn(
        "relative z-10 inline-flex cursor-pointer items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        isActive ? "text-foreground" : "text-muted-foreground",
        className,
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </TabsPrimitive.Trigger>
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

type IndicatorRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function getActiveIndicatorRect(list: HTMLElement): IndicatorRect | null {
  const activeTab = list.querySelector<HTMLElement>("[role='tab'][data-state='active']");

  if (!activeTab) {
    return null;
  }

  const listRect = list.getBoundingClientRect();
  const tabRect = activeTab.getBoundingClientRect();

  return {
    x: tabRect.left - listRect.left,
    y: tabRect.top - listRect.top,
    width: tabRect.width,
    height: tabRect.height,
  };
}

function applyIndicatorRect(indicator: HTMLSpanElement, rect: IndicatorRect) {
  // Use Motion's animate() even for instant placement so it owns the transform
  // properties exclusively — mixing style.transform with animate({ y }) caused
  // double-offset Y misalignment.
  animate(indicator, { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, { duration: 0 });
}

function getStretchRect(from: IndicatorRect, to: IndicatorRect): IndicatorRect {
  const left = Math.min(from.x, to.x);
  const right = Math.max(from.x + from.width, to.x + to.width);

  return {
    x: left,
    y: to.y,
    width: right - left,
    height: to.height,
  };
}

/* ------------------------------------------------------------------ */
/*  TabsContent                                                        */
/* ------------------------------------------------------------------ */

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn("mt-4 outline-none", className)} {...props} />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsContent, TabsList, TabsTrigger };
