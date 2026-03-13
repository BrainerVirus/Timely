import { cn } from "@/lib/utils";

import type { HTMLAttributes } from "react";

const tones = {
  live: "border-primary/30 bg-primary/10 text-primary",
  beta: "border-primary/30 bg-primary/10 text-primary",
  planned: "border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] text-muted-foreground",
  high: "border-destructive/30 bg-destructive/10 text-destructive",
  medium: "border-secondary/30 bg-secondary/10 text-secondary",
  low: "border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] text-muted-foreground",
  holiday:
    "border-warning/70 bg-warning/10 text-warning shadow-[2px_2px_0_0_color-mix(in_oklab,var(--color-warning)_55%,var(--color-border))]",
  on_track: "border-primary/30 bg-primary/10 text-primary",
  met_target: "border-accent/30 bg-accent/10 text-accent",
  under_target: "border-secondary/30 bg-secondary/10 text-secondary",
  over_target: "border-destructive/30 bg-destructive/10 text-destructive",
  empty: "border-[color:var(--color-border-subtle)] bg-[color:var(--color-tray)] text-muted-foreground",
  non_workday: "border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] text-foreground/80",
} as const;

type Tone = keyof typeof tones;

export function Badge({
  className,
  children,
  tone = "planned",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg border-2 px-2 py-0.5 text-[0.68rem] font-bold tracking-wide uppercase shadow-[1px_1px_0_0_var(--color-border)]",
        tones[tone as Tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
