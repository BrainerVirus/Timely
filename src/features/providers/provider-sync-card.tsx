import CheckCircle2 from "lucide-react/dist/esm/icons/circle-check.js";
import XCircle from "lucide-react/dist/esm/icons/circle-x.js";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.js";
import ScrollText from "lucide-react/dist/esm/icons/scroll-text.js";
import Terminal from "lucide-react/dist/esm/icons/terminal.js";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { BootstrapPayload, SyncState } from "@/types/dashboard";

export function ProviderSyncCard({
  payload,
  syncState,
  syncing,
  onStartSync,
  onViewLog,
}: {
  payload: BootstrapPayload;
  syncState: SyncState;
  syncing: boolean;
  onStartSync: () => Promise<void>;
  onViewLog?: () => void;
}) {
  const shouldShowLog = syncing || syncState.log.length > 0;
  const hasLog = syncState.log.length > 0;

  return (
    <Card>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">Provider sync</h3>
            <p className="text-xs text-muted-foreground">
              {payload.demoMode
                ? "Fetch your real worklogs from GitLab."
                : "Refresh provider data and update local summaries."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasLog && onViewLog && !syncing && (
              <Button variant="ghost" size="sm" onClick={onViewLog}>
                <ScrollText className="mr-1.5 h-3.5 w-3.5" />
                View log
              </Button>
            )}
            <Button onClick={onStartSync} disabled={syncing} size="sm">
              {syncing ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              )}
              {syncing ? "Syncing..." : "Sync now"}
            </Button>
          </div>
        </div>

        {shouldShowLog ? <SyncLogPanel log={syncState.log} syncing={syncing} /> : null}

        {syncState.status === "done" ? (
          <div className="flex items-center gap-2 rounded-xl border-2 border-accent/30 bg-accent/5 p-3 text-sm shadow-[var(--shadow-clay-inset)]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
            <span className="text-foreground">
              Synced {syncState.result.projectsSynced} projects, {syncState.result.entriesSynced} time
              entries, {syncState.result.issuesSynced} issues
            </span>
          </div>
        ) : null}

        {syncState.status === "error" ? (
          <div className="flex items-center gap-2 rounded-xl border-2 border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive shadow-[var(--shadow-clay-inset)]">
            <XCircle className="h-4 w-4 shrink-0" />
            {syncState.error}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export function SyncLogPanel({ log, syncing }: { log: string[]; syncing: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(true);
  const autoCollapseTimeoutRef = useRef<number | null>(null);
  const previousSyncingRef = useRef(syncing);

  useEffect(() => {
    if (syncing && !previousSyncingRef.current) {
      setExpanded(true);
    }

    if (autoCollapseTimeoutRef.current) {
      window.clearTimeout(autoCollapseTimeoutRef.current);
      autoCollapseTimeoutRef.current = null;
    }

    if (!syncing && previousSyncingRef.current && log.length > 0) {
      autoCollapseTimeoutRef.current = window.setTimeout(() => {
        setExpanded(false);
        autoCollapseTimeoutRef.current = null;
      }, 3000);
    }

    previousSyncingRef.current = syncing;

    return () => {
      if (autoCollapseTimeoutRef.current) {
        window.clearTimeout(autoCollapseTimeoutRef.current);
        autoCollapseTimeoutRef.current = null;
      }
    };
  }, [syncing, log.length]);

  useEffect(() => {
    if (scrollRef.current && expanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log.length, expanded]);

  const lastLine = log.length > 0 ? log[log.length - 1] : "Starting sync...";
  const keyedLogLines = createKeyedLogLines(log);

  return (
    <div className="rounded-xl border-2 border-border bg-background shadow-[var(--shadow-clay-inset)]">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 transition-colors hover:bg-muted"
      >
        <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Sync log</span>
        {syncing ? <Loader2 className="h-3 w-3 animate-spin text-primary" /> : null}
        {!expanded ? (
          <span className="ml-1 flex-1 truncate text-left text-xs text-foreground/60">{lastLine}</span>
        ) : null}
        <ChevronDown
          className={cn(
            "ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform",
            expanded ? "rotate-180" : null,
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {expanded ? (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.0, 1.0] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border" />
            <div ref={scrollRef} className="max-h-48 overflow-y-auto p-3 font-mono text-xs leading-relaxed">
              {log.length === 0 && syncing ? <p className="text-muted-foreground">Starting sync...</p> : null}
              {keyedLogLines.map(({ key, line, lineNumber }) => (
                <p key={key} className={cn("flex gap-3", getSyncLogLineClassName(line))}>
                  <span className="w-5 shrink-0 select-none text-right text-muted-foreground/40">
                    {lineNumber}
                  </span>
                  <span>{line}</span>
                </p>
              ))}
              {syncing ? <p className="animate-pulse text-muted-foreground">_</p> : null}
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function getSyncLogLineClassName(line: string): string {
  if (line.startsWith("ERROR")) {
    return "text-destructive";
  }

  if (line.startsWith("Done.") || line.startsWith("Sync complete")) {
    return "text-accent";
  }

  return "text-foreground/80";
}

function createKeyedLogLines(log: string[]) {
  const counts = new Map<string, number>();

  return log.map((line, index) => {
    const nextCount = (counts.get(line) ?? 0) + 1;
    counts.set(line, nextCount);

    return {
      key: `${line}-${nextCount.toString()}`,
      line,
      lineNumber: index + 1,
    };
  });
}
