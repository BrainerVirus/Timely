import Clock3 from "lucide-react/dist/esm/icons/clock-3.js";
import ExternalLink from "lucide-react/dist/esm/icons/external-link.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.js";
import { useEffect, useState } from "react";
import { getIssueToneBorderClass } from "@/components/shared/issue-tone";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "@/components/ui/progress-ring";
import { cn, formatHours } from "@/lib/utils";
import type { BootstrapPayload } from "@/types/dashboard";

interface TrayPanelProps {
  payload: BootstrapPayload;
  onClose: () => void;
  onActivated?: (cb: () => void) => () => void;
}

export function TrayPanel({ payload: initialPayload, onClose, onActivated }: TrayPanelProps) {
  const [payload, setPayload] = useState(initialPayload);
  const [syncing, setSyncing] = useState(false);

  // Auto-refresh on panel activation
  useEffect(() => {
    if (!onActivated) return;
    return onActivated(async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const fresh = await invoke<BootstrapPayload>("bootstrap_dashboard");
        setPayload(fresh);
      } catch {
        // silently fail
      }
    });
  }, [onActivated]);

  const remaining = Math.max(payload.today.targetHours - payload.today.loggedHours, 0);

  async function handleOpen() {
    try {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const main = await WebviewWindow.getByLabel("main");
      if (main) {
        await main.show();
        await main.setFocus();
      }
    } catch {
      // silently fail
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("sync_gitlab");
      const fresh = await invoke<BootstrapPayload>("bootstrap_dashboard");
      setPayload(fresh);
    } catch {
      // silently fail
    } finally {
      setSyncing(false);
    }
  }

  return (
    <main className="min-h-screen bg-background p-2.5 text-foreground">
      <div className="rounded-xl border border-border bg-card p-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-display text-sm font-semibold text-foreground">
            {payload.today.dateLabel}
          </h1>
          <button
            className="cursor-pointer rounded-lg border border-border bg-muted px-2 py-1 text-xs text-muted-foreground transition hover:bg-card"
            onClick={onClose}
            type="button"
          >
            hide
          </button>
        </div>

        {/* Progress */}
        <div className="mt-3 flex items-center gap-3">
          <ProgressRing value={payload.today.loggedHours} max={payload.today.targetHours} size={72} strokeWidth={5} />
          <div className="space-y-1">
            <Badge tone={payload.today.status}>{payload.today.status.replaceAll("_", " ")}</Badge>
            <div className="space-y-0.5 text-xs text-muted-foreground">
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

        <div className="my-2.5 h-px bg-border" />

        {/* Issues */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">Issues</p>
          {payload.today.topIssues.slice(0, 4).map((issue) => (
            <div key={issue.key} className={cn("rounded-lg border border-l-2 border-border bg-muted p-1.5", getIssueToneBorderClass(issue.tone))}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">{issue.title}</p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatHours(issue.hours)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-2.5 flex gap-1.5">
          <button
            className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border border-border bg-muted py-1.5 text-xs text-muted-foreground transition hover:bg-card"
            type="button"
            onClick={handleOpen}
          >
            <ExternalLink className="h-3 w-3" />
            Open
          </button>
          <button
            className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border border-border bg-muted py-1.5 text-xs text-muted-foreground transition hover:bg-card"
            type="button"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {syncing ? "Syncing" : "Sync"}
          </button>
        </div>
      </div>
    </main>
  );
}
