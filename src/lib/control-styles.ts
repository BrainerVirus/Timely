import { cn } from "@/lib/utils";

const controlHeightClasses = {
  compact: "h-[var(--control-height-compact)]",
  dense: "h-[var(--control-height-dense)]",
  default: "h-[var(--control-height-default)]",
  layout: "h-[var(--control-height-layout)]",
} as const;

const controlSizeClasses = {
  compactSquare: "size-[var(--control-height-compact)]",
  denseSquare: "size-[var(--control-height-dense)]",
  defaultSquare: "size-[var(--control-height-default)]",
} as const;

export function getSegmentedControlClassName(active: boolean, className?: string) {
  return cn(
    "inline-flex cursor-pointer items-center justify-center rounded-xl border-2 px-3 text-sm font-bold transition-all",
    controlHeightClasses.default,
    active
      ? "border-primary/35 bg-primary text-primary-foreground shadow-[var(--shadow-button-primary)] active:translate-y-[1px] active:shadow-none"
      : "border-[color:var(--color-border-subtle)] bg-[color:var(--color-tray)] text-muted-foreground shadow-[var(--shadow-clay-inset)] hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-field-hover)] hover:text-foreground",
    className,
  );
}

export function getChoiceButtonClassName(active: boolean, className?: string) {
  return cn(
    "flex cursor-pointer items-center rounded-xl border-2 px-4 text-sm font-bold transition-all",
    controlHeightClasses.default,
    active
      ? "border-primary/35 bg-primary text-primary-foreground shadow-[var(--shadow-button-primary)] active:translate-y-[1px] active:shadow-none"
      : "border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel)] text-muted-foreground shadow-[var(--shadow-clay)] hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-panel-elevated)] hover:text-foreground",
    className,
  );
}

export function getNeutralSegmentedControlClassName(active: boolean, className?: string) {
  return cn(
    "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 px-3 text-sm font-bold transition-all active:translate-y-[1px] active:shadow-none disabled:pointer-events-none disabled:opacity-50",
    controlHeightClasses.compact,
    active
      ? "border-[color:var(--color-border-strong)] bg-[color:var(--color-tray-active)] text-foreground shadow-[var(--shadow-clay)]"
      : "border-transparent bg-transparent text-muted-foreground hover:border-[color:var(--color-border-subtle)] hover:bg-[color:var(--color-field-hover)] hover:text-foreground",
    className,
  );
}

export function getCompactActionButtonClassName(className?: string) {
  return cn(
    "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel)] px-3 text-xs font-bold text-muted-foreground shadow-[var(--shadow-clay)] transition-all hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-panel-elevated)] hover:text-foreground active:translate-y-[1px] active:shadow-none disabled:pointer-events-none disabled:opacity-50",
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
      : "border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel)] text-muted-foreground shadow-[var(--shadow-clay)] hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-panel-elevated)] hover:text-foreground",
    className,
  );
}
