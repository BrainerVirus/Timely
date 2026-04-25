import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import XIcon from "lucide-react/dist/esm/icons/x.js";
import { cn } from "@/shared/lib/utils";

export function ComboboxClear({
  className,
  disabled,
  ...props
}: ComboboxPrimitive.Clear.Props & { disabled?: boolean }) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      disabled={disabled}
      className={cn(
        "flex size-6 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <XIcon className="size-3.5" />
    </ComboboxPrimitive.Clear>
  );
}
