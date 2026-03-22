import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.js";
import CheckCircle2 from "lucide-react/dist/esm/icons/circle-check.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.js";
import ScrollText from "lucide-react/dist/esm/icons/scroll-text.js";
import Terminal from "lucide-react/dist/esm/icons/terminal.js";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { BootstrapPayload, SyncState } from "@/types/dashboard";

export function ProviderSyncCard({
  payload,
  syncState,
  syncing,
  onStartSync,
  onViewLog,
}: Readonly<{
  payload: BootstrapPayload;
  syncState: SyncState;
  syncing: boolean;
  onStartSync: () => Promise<void>;
  onViewLog?: () => void;
}>) {
  const { t } = useI18n();
  const shouldShowLog = syncing || syncState.log.length > 0;
  const hasLog = syncState.log.length > 0;
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (syncState.status !== "error") {
      lastErrorRef.current = null;
      return;
    }

    if (lastErrorRef.current === syncState.error) {
      return;
    }

    lastErrorRef.current = syncState.error;
    toast.error(t("sync.toastFailedTitle"), {
      description: syncState.error,
      duration: 8000,
    });
  }, [syncState, t]);

  return (
    <Card>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">
              {t("settings.providerSync")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {payload.demoMode ? t("setup.syncDescriptionConnected") : t("settings.pullLatest")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasLog && onViewLog && !syncing && (
              <Button variant="ghost" onClick={onViewLog}>
                <ScrollText className="mr-1.5 h-3.5 w-3.5" />
                {t("common.viewLog")}
              </Button>
            )}
            <Button onClick={onStartSync} disabled={syncing}>
              {syncing ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              )}
              {syncing ? t("common.syncing") : t("settings.syncNow")}
            </Button>
          </div>
        </div>

        {shouldShowLog ? <SyncLogPanel log={syncState.log} syncing={syncing} /> : null}

        {syncState.status === "done" ? (
          <div className="flex items-center gap-2 rounded-xl border-2 border-accent/30 bg-accent/5 p-3 text-sm shadow-clay">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
            <span className="text-foreground">
              {t("sync.toastCompleteDescription", {
                projects: syncState.result.projectsSynced,
                entries: syncState.result.entriesSynced,
                issues: syncState.result.issuesSynced,
              })}
            </span>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function SyncLogPanel({ log, syncing }: Readonly<{ log: string[]; syncing: boolean }>) {
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(true);
  const autoCollapseTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const previousSyncingRef = useRef(syncing);

  useEffect(() => {
    if (autoCollapseTimeoutRef.current) {
      globalThis.clearTimeout(autoCollapseTimeoutRef.current);
      autoCollapseTimeoutRef.current = null;
    }

    if (!syncing && previousSyncingRef.current && log.length > 0) {
      autoCollapseTimeoutRef.current = globalThis.setTimeout(() => {
        setExpanded(false);
        autoCollapseTimeoutRef.current = null;
      }, 3000);
    }

    previousSyncingRef.current = syncing;

    return () => {
      if (autoCollapseTimeoutRef.current) {
        globalThis.clearTimeout(autoCollapseTimeoutRef.current);
        autoCollapseTimeoutRef.current = null;
      }
    };
  }, [syncing, log.length]);

  useEffect(() => {
    if (scrollRef.current && expanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log.length, expanded]);

  const lastLine = log.length > 0 ? log[log.length - 1] : t("sync.starting");
  const keyedLogLines = createKeyedLogLines(log);
  const isExpanded = syncing || expanded;

  return (
    <div className="rounded-xl border-2 border-border-subtle bg-panel shadow-clay">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 transition-colors hover:bg-field-hover"
      >
        <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">{t("sync.logTitle")}</span>
        {syncing ? <Loader2 className="h-3 w-3 animate-spin text-primary" /> : null}
        {syncing || expanded ? null : (
          <span className="ml-1 flex-1 truncate text-left text-xs text-foreground/60">
            {lastLine}
          </span>
        )}
        <ChevronDown
          className={cn(
            "ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform",
            isExpanded ? "rotate-180" : null,
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {isExpanded ? (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border-subtle" />
            <div
              ref={scrollRef}
              className="max-h-48 overflow-y-auto overscroll-contain scroll-smooth p-3 font-mono text-xs leading-relaxed"
            >
              {log.length === 0 && syncing ? (
                <p className="text-muted-foreground">{t("sync.starting")}</p>
              ) : null}
              {keyedLogLines.map(({ key, line, lineNumber }) => (
                <p key={key} className={cn("flex gap-3", getSyncLogLineClassName(line))}>
                  <span className="w-5 shrink-0 text-right text-muted-foreground/40 select-none">
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
