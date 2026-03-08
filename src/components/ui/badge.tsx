import { cn } from "@/lib/utils";

import type { HTMLAttributes } from "react";

const tones = {
  live: "border-accent/30 bg-accent/10 text-accent",
  beta: "border-primary/30 bg-primary/10 text-primary",
  planned: "border-border bg-muted text-muted-foreground",
  high: "border-destructive/30 bg-destructive/10 text-destructive",
  medium: "border-secondary/30 bg-secondary/10 text-secondary",
  low: "border-border bg-muted text-muted-foreground",
  on_track: "border-primary/30 bg-primary/10 text-primary",
  met_target: "border-accent/30 bg-accent/10 text-accent",
  under_target: "border-secondary/30 bg-secondary/10 text-secondary",
  over_target: "border-destructive/30 bg-destructive/10 text-destructive",
  empty: "border-border bg-muted text-muted-foreground",
  non_workday: "border-primary/30 bg-primary/10 text-primary",
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
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase",
        tones[tone as Tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
