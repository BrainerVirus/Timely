import { cn } from "@/lib/utils";

export const controlHeightClasses = {
  compact: "h-[var(--control-height-compact)]",
  dense: "h-[var(--control-height-dense)]",
  default: "h-[var(--control-height-default)]",
  layout: "h-[var(--control-height-layout)]",
} as const;

export const controlSizeClasses = {
  compactSquare: "size-[var(--control-height-compact)]",
  denseSquare: "size-[var(--control-height-dense)]",
  defaultSquare: "size-[var(--control-height-default)]",
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

export function getNeutralSegmentedControlClassName(active: boolean, className?: string) {
  return cn(
    "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 px-3 text-sm font-bold transition-all active:translate-y-[1px] active:shadow-none disabled:pointer-events-none disabled:opacity-50",
    controlHeightClasses.compact,
    active
      ? "border-border bg-card text-foreground shadow-[2px_2px_0_0_var(--color-border)]"
      : "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-card hover:text-foreground",
    className,
  );
}

export function getCompactActionButtonClassName(className?: string) {
  return cn(
    "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-border bg-muted px-3 text-xs font-bold text-muted-foreground shadow-[2px_2px_0_0_var(--color-border)] transition-all hover:bg-card hover:text-foreground active:translate-y-[1px] active:shadow-none disabled:pointer-events-none disabled:opacity-50",
    controlHeightClasses.compact,
    className,
  );
}

export function getCompactIconButtonClassName(active = false, className?: string) {
  return cn(
    "inline-flex cursor-pointer items-center justify-center rounded-xl border-2 transition-all active:translate-y-[1px] active:shadow-none disabled:pointer-events-none disabled:opacity-50",
    controlSizeClasses.compactSquare,
    active
      ? "border-primary/30 bg-primary text-primary-foreground shadow-[var(--shadow-button-primary)]"
      : "border-border bg-muted text-muted-foreground shadow-[2px_2px_0_0_var(--color-border)] hover:bg-card hover:text-foreground",
    className,
  );
}
