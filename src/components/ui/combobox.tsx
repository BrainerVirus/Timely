import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import CheckIcon from "lucide-react/dist/esm/icons/check.js";
import ChevronDownIcon from "lucide-react/dist/esm/icons/chevron-down.js";
import XIcon from "lucide-react/dist/esm/icons/x.js";
import * as React from "react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

const Combobox = ComboboxPrimitive.Root;

function ComboboxValue({ ...props }: ComboboxPrimitive.Value.Props) {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
}

function ComboboxTrigger({ className, children, ...props }: ComboboxPrimitive.Trigger.Props) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      className={cn("[&_svg:not([class*='size-'])]:size-4", className)}
      {...props}
    >
      {children}
      <ChevronDownIcon
        data-slot="combobox-trigger-icon"
        className="pointer-events-none size-4 text-muted-foreground"
      />
    </ComboboxPrimitive.Trigger>
  );
}

function ComboboxClear({
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

function ComboboxInput({
  className,
  children,
  disabled = false,
  showTrigger = true,
  showClear = false,
  ...props
}: ComboboxPrimitive.Input.Props & {
  showTrigger?: boolean;
  showClear?: boolean;
}) {
  return (
    <InputGroup
      className={cn(
        "w-auto min-w-0 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20",
        className,
      )}
    >
      <ComboboxPrimitive.Input
        data-slot="combobox-input"
        disabled={disabled}
        render={
          <InputGroupInput className="h-full bg-transparent shadow-none hover:bg-transparent focus:bg-transparent focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent dark:focus:bg-transparent" />
        }
        {...props}
      />
      {(showTrigger || showClear) && (
        <InputGroupAddon align="inline-end" className="self-stretch">
          {showClear && <ComboboxClear disabled={disabled} />}
          {showTrigger && (
            <ComboboxPrimitive.Trigger
              data-slot="combobox-trigger"
              disabled={disabled}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              <ChevronDownIcon className="size-4" />
            </ComboboxPrimitive.Trigger>
          )}
        </InputGroupAddon>
      )}
      {children}
    </InputGroup>
  );
}

function ComboboxContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    "side" | "align" | "sideOffset" | "alignOffset" | "anchor"
  >) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            "group/combobox-content relative max-h-96 w-(--anchor-width) max-w-(--available-width) min-w-[calc(var(--anchor-width)+1.75rem)] origin-(--transform-origin) overflow-hidden rounded-2xl border-2 border-[color:var(--color-border-strong)] bg-[color:var(--color-popover)] text-card-foreground shadow-[var(--shadow-clay-popup)] data-closed:[animation:popoverOut_150ms_ease-in_both] data-starting-style:scale-[0.96] data-starting-style:opacity-0 data-[side=bottom]:[animation:popoverIn_200ms_ease-out_both] data-[side=left]:[animation:popoverIn_200ms_ease-out_both] data-[side=right]:[animation:popoverIn_200ms_ease-out_both] data-[side=top]:[animation:popoverIn_200ms_ease-out_both]",
            className,
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn(
        "max-h-72 scroll-py-1 overflow-y-auto overscroll-contain scroll-smooth p-2 data-empty:p-0",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxItem({ className, children, ...props }: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-xl px-3 py-2 pr-8 text-sm outline-hidden transition-all select-none",
        "text-muted-foreground",
        "data-highlighted:bg-[color:var(--color-field-hover)] data-highlighted:text-foreground",
        "data-selected:bg-primary/12 data-selected:text-foreground data-selected:shadow-[var(--shadow-clay-inset)]",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        data-slot="combobox-item-indicator"
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none size-4" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

function ComboboxGroup({ className, ...props }: ComboboxPrimitive.Group.Props) {
  return (
    <ComboboxPrimitive.Group
      data-slot="combobox-group"
      className={cn("grid gap-0.5", className)}
      {...props}
    />
  );
}

function ComboboxLabel({ className, ...props }: ComboboxPrimitive.GroupLabel.Props) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-label"
      className={cn(
        "px-3 py-1.5 text-[11px] font-bold tracking-[0.2em] text-muted-foreground uppercase",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxCollection({ ...props }: ComboboxPrimitive.Collection.Props) {
  return <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />;
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(
        "hidden w-full justify-center py-8 text-center text-sm text-muted-foreground group-data-empty/combobox-content:flex",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxSeparator({ className, ...props }: ComboboxPrimitive.Separator.Props) {
  return (
    <ComboboxPrimitive.Separator
      data-slot="combobox-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
  ComboboxClear,
};
