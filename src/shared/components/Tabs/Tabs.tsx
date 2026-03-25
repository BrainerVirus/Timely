import * as TabsPrimitive from "@radix-ui/react-tabs";
import { m, useReducedMotion } from "motion/react";
import * as React from "react";
import { cn } from "@/shared/utils/utils";

/* ------------------------------------------------------------------ */
/*  Context for passing active value to triggers                       */
/* ------------------------------------------------------------------ */

interface TabsContextValue {
  activeValue: string | undefined;
  indicatorLayoutId: string;
  allowDecorativeAnimation: boolean;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

/* ------------------------------------------------------------------ */
/*  Tabs (root) — wraps in LayoutGroup for shared layoutId animations  */
/* ------------------------------------------------------------------ */

interface TabsProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  layoutId?: string;
  /** When false, disables tab indicator animation. Default true. */
  allowDecorativeAnimation?: boolean;
}

const Tabs = React.forwardRef<React.ComponentRef<typeof TabsPrimitive.Root>, TabsProps>(
  (
    {
      layoutId,
      value,
      defaultValue,
      onValueChange,
      allowDecorativeAnimation = true,
      children,
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
    const generatedLayoutId = React.useId();

    const activeValue = value ?? internalValue;
    const indicatorLayoutId = layoutId ?? `tabs-indicator-${generatedLayoutId}`;
    const contextValue = React.useMemo(
      () => ({ activeValue, indicatorLayoutId, allowDecorativeAnimation }),
      [activeValue, indicatorLayoutId, allowDecorativeAnimation],
    );

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
        {...props}
      >
        <TabsContext.Provider value={contextValue}>{children}</TabsContext.Provider>
      </TabsPrimitive.Root>
    );
  },
);
Tabs.displayName = "Tabs";

/* ------------------------------------------------------------------ */
/*  TabsList                                                           */
/* ------------------------------------------------------------------ */

const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, forwardedRef) => {
  return (
    <TabsPrimitive.List
      ref={forwardedRef}
      className={cn(
        "relative inline-flex h-auto items-center gap-1 rounded-2xl border-2 border-border-subtle bg-tray p-1.5 shadow-clay",
        className,
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.List>
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

/* ------------------------------------------------------------------ */
/*  TabsTrigger — with animated stretch indicator                      */
/* ------------------------------------------------------------------ */

const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, value, ...props }, ref) => {
  const tabsContext = React.useContext(TabsContext);
  const prefersReducedMotion = useReducedMotion();
  const allowDecorativeAnimation = tabsContext?.allowDecorativeAnimation ?? true;
  const activeValue = tabsContext?.activeValue;
  const isActive = activeValue === value;

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      className={cn(
        "relative z-10 inline-flex h-10 cursor-pointer items-center justify-center rounded-xl px-4 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        className,
      )}
      {...props}
    >
      {isActive && tabsContext ? (
        <m.span
          layoutId={tabsContext.indicatorLayoutId}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-xl border-2 border-border-subtle bg-tray-active shadow-clay"
          transition={
            prefersReducedMotion || !allowDecorativeAnimation
              ? { duration: 0 }
              : { type: "spring", stiffness: 420, damping: 34, mass: 0.7 }
          }
        />
      ) : null}
      <span className="relative z-10">{children}</span>
    </TabsPrimitive.Trigger>
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export { Tabs, TabsList, TabsTrigger };
