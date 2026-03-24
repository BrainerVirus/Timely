import { cn } from "@/shared/utils/utils";

const controlHeightClasses = {
  compact: "h-8",
  dense: "h-9",
  default: "h-10",
  layout: "h-12",
} as const;

const controlSizeClasses = {
  compactSquare: "w-8 h-8",
  denseSquare: "w-9 h-9",
  defaultSquare: "w-10 h-10",
} as const;

export function getSegmentedControlClassName(active: boolean, className?: string) {
  return cn(
    "inline-flex cursor-pointer items-center justify-center rounded-xl border-2 px-3 text-sm font-bold transition-all",
    controlHeightClasses.default,
    active
      ? "border-primary/35 bg-primary text-primary-foreground shadow-button-primary active:translate-y-px active:shadow-none"
      : "border-border-subtle bg-tray text-muted-foreground shadow-clay-inset hover:border-border-strong hover:bg-field-hover hover:text-foreground",
    className,
  );
}

export function getChoiceButtonClassName(active: boolean, className?: string) {
  return cn(
    "flex cursor-pointer items-center rounded-xl border-2 px-4 text-sm font-bold transition-all",
    controlHeightClasses.default,
    active
      ? "border-primary/35 bg-primary text-primary-foreground shadow-button-primary active:translate-y-px active:shadow-none"
      : "border-border-subtle bg-panel text-muted-foreground shadow-clay hover:border-border-strong hover:bg-panel-elevated hover:text-foreground",
    className,
  );
}

export function getNeutralSegmentedControlClassName(active: boolean, className?: string) {
  return cn(
    "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 px-3 text-sm font-bold transition-all active:translate-y-px active:shadow-none disabled:pointer-events-none disabled:opacity-50",
    controlHeightClasses.compact,
    active
      ? "border-border-strong bg-tray-active text-foreground shadow-clay"
      : "border-transparent bg-transparent text-muted-foreground hover:border-border-subtle hover:bg-field-hover hover:text-foreground",
    className,
  );
}

export function getCompactActionButtonClassName(className?: string) {
  return cn(
    "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-border-subtle bg-panel px-3 text-xs font-bold text-muted-foreground shadow-clay transition-all hover:border-border-strong hover:bg-panel-elevated hover:text-foreground active:translate-y-px active:shadow-none disabled:pointer-events-none disabled:opacity-50",
    controlHeightClasses.compact,
    className,
  );
}

export function getCompactIconButtonClassName(active = false, className?: string) {
  return cn(
    "inline-flex cursor-pointer items-center justify-center rounded-xl border-2 transition-all active:translate-y-px active:shadow-none disabled:pointer-events-none disabled:opacity-50",
    controlSizeClasses.compactSquare,
    active
      ? "border-primary/30 bg-primary text-primary-foreground shadow-button-primary"
      : "border-border-subtle bg-panel text-muted-foreground shadow-clay hover:border-border-strong hover:bg-panel-elevated hover:text-foreground",
    className,
  );
}
