import Clock3 from "lucide-react/dist/esm/icons/clock-3.js";
import ExternalLink from "lucide-react/dist/esm/icons/external-link.js";
import EyeOff from "lucide-react/dist/esm/icons/eye-off.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.js";
import { useEffect, useState } from "react";
import { m } from "motion/react";
import { getIssueToneBorderClass } from "@/components/shared/issue-tone";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "@/components/ui/progress-ring";
import { cn, formatHours } from "@/lib/utils";
import { springBouncy, springGentle } from "@/lib/animations";
import type { BootstrapPayload } from "@/types/dashboard";

type TrayStatus = "idle" | "syncing" | "error";

interface TrayPanelProps {
  payload: BootstrapPayload;
  onClose: () => void;
  onActivated?: (cb: () => void) => () => void;
}

export function TrayPanel({ payload: initialPayload, onClose, onActivated }: TrayPanelProps) {
  const [payload, setPayload] = useState(initialPayload);
  const [status, setStatus] = useState<TrayStatus>("idle");

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
  const syncing = status === "syncing";

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
    setStatus("syncing");
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("sync_gitlab");
      const fresh = await invoke<BootstrapPayload>("bootstrap_dashboard");
      setPayload(fresh);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <m.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springGentle}
      className="h-screen overflow-hidden bg-card text-foreground"
    >
      <div className="flex h-full flex-col p-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-display text-sm font-semibold text-foreground">
            {payload.today.dateLabel}
          </h1>
          <button
            className="flex cursor-pointer items-center gap-1 rounded-xl border-2 border-border bg-muted px-2 py-1 text-xs font-bold text-muted-foreground shadow-[1px_1px_0_0_var(--color-border)] transition-all hover:bg-card active:translate-y-[1px] active:shadow-none"
            onClick={onClose}
            type="button"
          >
            <EyeOff className="h-3 w-3" />
            Hide
          </button>
        </div>

        {/* Progress section */}
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...springBouncy, delay: 0.1 }}
          className="mt-3 flex items-center gap-3 rounded-xl border-2 border-border/50 bg-muted/30 p-2.5"
        >
          <ProgressRing
            value={payload.today.loggedHours}
            max={payload.today.targetHours}
            size={64}
            strokeWidth={5}
          />
          <div className="space-y-1">
            <Badge tone={payload.today.status}>
              {payload.today.status.replaceAll("_", " ")}
            </Badge>
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
        </m.div>

        {/* Divider */}
        <div className="my-2.5 h-px bg-border/50" />

        {/* Issues */}
        <div className="flex-1 space-y-1 overflow-y-auto">
          <p className="text-xs font-semibold text-muted-foreground">Issues</p>
          {payload.today.topIssues.slice(0, 4).map((issue, i) => (
            <m.div
              key={issue.key}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...springGentle, delay: 0.15 + i * 0.04 }}
              className={cn(
                "rounded-xl border-2 border-border bg-muted/40 p-1.5 shadow-[var(--shadow-clay-inset)]",
                getIssueToneBorderClass(issue.tone),
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-xs font-medium text-foreground">
                  {issue.title}
                </p>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {formatHours(issue.hours)}
                </span>
              </div>
            </m.div>
          ))}
        </div>

        {/* Error banner */}
        {status === "error" && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-1.5 rounded-lg border-2 border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-center text-xs font-semibold text-destructive"
          >
            Sync failed — try again
          </m.div>
        )}

        {/* Actions */}
        <div className="mt-2.5 flex gap-1.5">
          <button
            className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-xl border-2 border-border bg-muted py-1.5 text-xs font-bold text-muted-foreground shadow-[1px_1px_0_0_var(--color-border)] transition-all hover:bg-card active:translate-y-[1px] active:shadow-none"
            type="button"
            onClick={handleOpen}
          >
            <ExternalLink className="h-3 w-3" />
            Open
          </button>
          <button
            className={cn(
              "flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-xl border-2 py-1.5 text-xs font-bold shadow-[1px_1px_0_0_var(--color-border)] transition-all active:translate-y-[1px] active:shadow-none",
              syncing
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-muted text-muted-foreground hover:bg-card",
            )}
            type="button"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            {syncing ? "Syncing" : "Sync"}
          </button>
        </div>
      </div>
    </m.main>
  );
}
