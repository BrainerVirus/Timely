import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
}

export function MetricCard({ icon: Icon, label, value, note }: MetricCardProps) {
  return (
    <div className="rounded-2xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel)] p-3 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-3.5 w-3.5 text-primary/60" />
      </div>
      <p className="mt-2 font-display text-xl font-semibold text-foreground">{value}</p>
      <p className="mt-0.5 text-xs tracking-wide text-muted-foreground uppercase">{note}</p>
    </div>
  );
}
