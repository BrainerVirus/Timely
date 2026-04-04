import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import Terminal from "lucide-react/dist/esm/icons/terminal.js";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { cn } from "@/shared/lib/utils";

interface SyncLogPanelProps {
  log: string[];
  syncing: boolean;
}

export function SyncLogPanel({ log, syncing }: Readonly<SyncLogPanelProps>) {
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

  if (line.startsWith("WARN")) {
    return "text-warning";
  }

  if (
    line.startsWith("Done.") ||
    line.startsWith("Sync complete") ||
    line.startsWith("Synced ")
  ) {
    return "text-success";
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
