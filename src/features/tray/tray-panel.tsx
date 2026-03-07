import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StreakDisplay } from "@/features/gamification/streak-display";
import { cn, formatHours } from "@/lib/utils";
import type { BootstrapPayload } from "@/types/dashboard";
import { Clock3, ExternalLink, RefreshCw } from "lucide-react";
import { useEffect } from "react";

interface TrayPanelProps {
  payload: BootstrapPayload;
  onClose: () => void;
  onActivated?: (cb: () => void) => () => void;
}

const toneBorder: Record<string, string> = {
  emerald: "border-l-accent/50",
  amber: "border-l-secondary/50",
  cyan: "border-l-primary/50",
  rose: "border-l-destructive/50",
  violet: "border-l-primary/50",
};

export function TrayPanel({ payload, onClose, onActivated }: TrayPanelProps) {
  useEffect(() => {
    if (!onActivated) return;
    return onActivated(() => {
      // Panel was re-activated (tray icon clicked while visible)
    });
  }, [onActivated]);

  const remaining = Math.max(
    payload.today.targetHours - payload.today.loggedHours,
    0,
  );

  return (
    <main className="min-h-screen bg-background p-2.5 text-foreground">
      <div className="rounded-xl border border-border bg-card p-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs tracking-wide uppercase text-muted-foreground">
              Tray
            </p>
            <h1 className="mt-0.5 font-display text-base font-semibold text-foreground">
              {payload.today.dateLabel}
            </h1>
          </div>
          <button
            className="cursor-pointer rounded-lg border border-border bg-muted px-2.5 py-1 text-xs tracking-wide uppercase text-muted-foreground transition hover:bg-card"
            onClick={onClose}
            type="button"
          >
            hide
          </button>
        </div>

        {/* Progress */}
        <div className="mt-3 flex items-center gap-3">
          <ProgressRing
            value={payload.today.loggedHours}
            max={payload.today.targetHours}
            size={80}
            strokeWidth={6}
          />
          <div className="space-y-1.5">
            <Badge tone={payload.today.status}>
              {payload.today.status.replaceAll("_", " ")}
            </Badge>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock3 className="h-3 w-3 text-primary/60" />
                {formatHours(payload.today.loggedHours)} logged
              </div>
              <div className="flex items-center gap-1.5">
                <Clock3 className="h-3 w-3 text-secondary/60" />
                {formatHours(remaining)} left
              </div>
            </div>
          </div>
        </div>

        <div className="my-3 h-px bg-border" />

        {/* Issues */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">Issues</p>
          {payload.today.topIssues.map((issue) => (
            <div
              key={issue.key}
              className={cn(
                "rounded-lg border border-border border-l-2 bg-muted p-2",
                toneBorder[issue.tone] ?? "border-l-primary/50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs tracking-wide uppercase text-muted-foreground">
                    {issue.key}
                  </p>
                  <p className="truncate text-xs font-semibold text-foreground">
                    {issue.title}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatHours(issue.hours)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Streak */}
        <div className="mt-3">
          <StreakDisplay streakDays={payload.profile.streakDays} />
        </div>

        {/* Actions */}
        <div className="mt-2.5 flex gap-1.5">
          <button
            className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border border-border bg-muted py-1.5 text-xs tracking-wide uppercase text-muted-foreground transition hover:bg-card"
            type="button"
          >
            <ExternalLink className="h-3 w-3" />
            Open
          </button>
          <button
            className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border border-border bg-muted py-1.5 text-xs tracking-wide uppercase text-muted-foreground transition hover:bg-card"
            type="button"
          >
            <RefreshCw className="h-3 w-3" />
            Sync
          </button>
        </div>
      </div>
    </main>
  );
}
