import { m } from "motion/react";
import { cardItemVariants } from "@/lib/animations";

import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
}

export function MetricCard({ icon: Icon, label, value, note }: MetricCardProps) {
  return (
    <m.div variants={cardItemVariants} className="rounded-xl border border-border bg-muted p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-3.5 w-3.5 text-primary/60" />
      </div>
      <p className="mt-2 font-display text-xl font-semibold text-foreground">{value}</p>
      <p className="mt-0.5 text-xs tracking-wide text-muted-foreground uppercase">{note}</p>
    </m.div>
  );
}
