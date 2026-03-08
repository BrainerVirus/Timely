import { m } from "motion/react";
import { cardItemVariants } from "@/lib/animations";

interface StatPanelProps {
  title: string;
  value: string;
  note: string;
}

export function StatPanel({ title, value, note }: StatPanelProps) {
  return (
    <m.div
      variants={cardItemVariants}
      className="rounded-xl border border-border bg-muted p-3 sm:p-4"
    >
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{title}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-foreground sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </m.div>
  );
}
