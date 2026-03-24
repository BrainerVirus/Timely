import { Tooltip as TooltipPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "@/shared/utils/utils";

function TooltipProvider({
  delayDuration = 0,
  ...props
}: Readonly<React.ComponentProps<typeof TooltipPrimitive.Provider>>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({ ...props }: Readonly<React.ComponentProps<typeof TooltipPrimitive.Root>>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-xl border-2 border-foreground/20 bg-foreground px-3 py-1.5 text-xs font-semibold text-balance text-background shadow-[2px_2px_0_0_var(--color-border)] data-[state=closed]:animate-[popoverOut_100ms_ease-out_both] data-[state=open]:animate-[popoverIn_200ms_cubic-bezier(0.34,1.56,0.64,1)_both]",
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-xs bg-foreground fill-foreground" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
