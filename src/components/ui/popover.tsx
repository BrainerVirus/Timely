import { Popover as PopoverPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-2xl border-2 border-[color:var(--color-border-strong)] bg-popover p-4 text-popover-foreground shadow-[var(--shadow-clay-popup)] outline-hidden data-[state=closed]:[animation:popoverOut_150ms_ease-in_both] data-[state=open]:[animation:popoverIn_200ms_ease-out_both]",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
};
