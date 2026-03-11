import { cn } from "@/lib/utils";

export const controlHeightClasses = {
  compact: "h-[var(--control-height-compact)]",
  dense: "h-[var(--control-height-dense)]",
  default: "h-[var(--control-height-default)]",
  layout: "h-[var(--control-height-layout)]",
} as const;

export function getSegmentedControlClassName(active: boolean, className?: string) {
  return cn(
    "inline-flex cursor-pointer items-center justify-center rounded-xl border-2 px-3 text-sm font-bold transition-all",
    controlHeightClasses.default,
    active
      ? "border-primary/30 bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--color-border)] active:translate-y-[1px] active:shadow-none"
      : "border-border bg-muted text-muted-foreground shadow-[var(--shadow-clay-inset)] hover:text-foreground",
    className,
  );
}

export function getChoiceButtonClassName(active: boolean, className?: string) {
  return cn(
    "flex cursor-pointer items-center rounded-xl border-2 px-4 text-sm font-bold transition-all",
    controlHeightClasses.default,
    active
      ? "border-primary/30 bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--color-border)] active:translate-y-[1px] active:shadow-none"
      : "border-border bg-muted text-muted-foreground shadow-[var(--shadow-clay-inset)] hover:text-foreground",
    className,
  );
}
