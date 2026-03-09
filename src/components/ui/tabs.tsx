import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { LayoutGroup, m } from "motion/react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Context for passing active value to triggers                       */
/* ------------------------------------------------------------------ */

const TabsActiveCtx = React.createContext<string | undefined>(undefined);

/* ------------------------------------------------------------------ */
/*  Tabs (root) — wraps in LayoutGroup for shared layoutId animations  */
/* ------------------------------------------------------------------ */

interface TabsProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  /** Unique id for layoutId animations when multiple Tabs exist on the same page */
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
        {...props}
      >
        <TabsActiveCtx.Provider value={activeValue}>
          <LayoutGroup id={layoutId}>{children}</LayoutGroup>
        </TabsActiveCtx.Provider>
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
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-auto items-center gap-1 rounded-2xl border-2 border-border bg-muted/35 p-1.5 shadow-[var(--shadow-clay)]",
      className,
    )}
    {...props}
  />
));
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
        "relative inline-flex cursor-pointer items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        isActive ? "text-foreground" : "text-muted-foreground",
        className,
      )}
      {...props}
    >
      {/* Animated background pill — only rendered in the active trigger */}
      {isActive && (
        <m.span
          layoutId="tabs-active-pill"
          className="absolute inset-0 rounded-xl bg-background shadow-[1px_1px_0_0_var(--color-border)]"
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
            mass: 0.8,
          }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </TabsPrimitive.Trigger>
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

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
