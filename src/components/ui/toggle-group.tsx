import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const toggleGroupItemVariants = cva(
  "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=on]:border data-[state=on]:border-[color:var(--color-border-subtle)] data-[state=on]:bg-[color:var(--color-tray-active)] data-[state=on]:text-foreground data-[state=on]:shadow-[var(--shadow-clay)]",
  {
    variants: {
      variant: {
        default: "text-muted-foreground hover:text-foreground",
        outline:
          "border-2 border-transparent bg-transparent text-muted-foreground hover:bg-[color:var(--color-field-hover)] hover:text-foreground data-[state=on]:border-[color:var(--color-border-subtle)]",
      },
      size: {
        default: "h-[var(--control-height-default)]",
        sm: "h-[var(--control-height-compact)] px-2.5 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const ToggleGroupContext = React.createContext<VariantProps<typeof toggleGroupItemVariants>>({
  size: "default",
  variant: "default",
});

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
    VariantProps<typeof toggleGroupItemVariants>
>(({ className, variant, size, children, ...props }, ref) => {
  const contextValue = React.useMemo(() => ({ variant, size }), [size, variant]);

  return (
    <ToggleGroupPrimitive.Root
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 rounded-2xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-tray)] p-1.5 shadow-[var(--shadow-clay)]",
        className,
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={contextValue}>{children}</ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
});
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> &
    VariantProps<typeof toggleGroupItemVariants>
>(({ className, children, variant, size, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext);

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        toggleGroupItemVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
});
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
