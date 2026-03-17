import { invoke } from "@tauri-apps/api/core";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import CheckCircle2 from "lucide-react/dist/esm/icons/circle-check.js";
import CircleX from "lucide-react/dist/esm/icons/circle-x.js";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.js";
import ExternalLink from "lucide-react/dist/esm/icons/external-link.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.js";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useFormatHours } from "@/hooks/use-format-hours";
import {
  getCompactActionButtonClassName,
  getCompactIconButtonClassName,
  getNeutralSegmentedControlClassName,
} from "@/lib/control-styles";
import { useI18n } from "@/lib/i18n";
import { loadWorklogSnapshot, openAboutWindow, openSettingsWindow, quitApp } from "@/lib/tauri";
import { cn } from "@/lib/utils";

import type { BootstrapPayload, DayOverview } from "@/types/dashboard";

type TrayStatus = "idle" | "syncing" | "success" | "error";

const SYNC_FEEDBACK_DURATION_MS = 1600;

interface TrayPanelProps {
  payload: BootstrapPayload;
  onClose: () => void;
  onActivated?: (cb: () => void) => () => void;
  showOverflowActions?: boolean;
}

export function TrayPanel({
  payload: initialPayload,
  onClose,
  onActivated,
  showOverflowActions = true,
}: TrayPanelProps) {
  const [selectedDay, setSelectedDay] = useState(initialPayload.today);
  const [selectedDate, setSelectedDate] = useState(() =>
    parseDateInputValue(initialPayload.today.date),
  );
  const [status, setStatus] = useState<TrayStatus>("idle");
  const [dayLoading, setDayLoading] = useState(false);
  const statusTimeoutRef = useRef<number | null>(null);
  const selectedDateRef = useRef(selectedDate);
  const fh = useFormatHours();
  const { formatDate, t } = useI18n();

  selectedDateRef.current = selectedDate;

  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current !== null) {
        window.clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);

  const refreshCurrentDay = useCallback(async () => {
    await refreshSelectedDay(selectedDateRef.current, setSelectedDay, setDayLoading);
  }, []);

  useEffect(() => {
    if (!onActivated) return;
    return onActivated(() => {
      void refreshCurrentDay();
    });
  }, [onActivated, refreshCurrentDay]);

  const syncing = status === "syncing";
  const pagerBusy = syncing || dayLoading;
  const pagerLabel = selectedDay.isToday
    ? t("common.today")
    : formatDate(selectedDate, {
        weekday: "short",
        month: "short",
        day: "2-digit",
      });

  const handleOpen = useCallback(async () => {
    try {
      await invoke("show_main_window");
      onClose();
    } catch {
      // silently fail
    }
  }, [onClose]);

  const handleSync = useCallback(async () => {
    const syncDate = selectedDateRef.current;
    clearTransientStatus(statusTimeoutRef);
    setStatus("syncing");

    try {
      await invoke("sync_gitlab");
      await refreshSelectedDay(syncDate, setSelectedDay, setDayLoading);
      setStatus("success");
      statusTimeoutRef.current = window.setTimeout(() => {
        setStatus("idle");
        statusTimeoutRef.current = null;
      }, SYNC_FEEDBACK_DURATION_MS);
    } catch {
      setStatus("error");
      statusTimeoutRef.current = window.setTimeout(() => {
        setStatus("idle");
        statusTimeoutRef.current = null;
      }, SYNC_FEEDBACK_DURATION_MS);
    }
  }, []);

  const handleSelectDate = useCallback(async (date: Date) => {
    selectedDateRef.current = date;
    setSelectedDate(date);
    await refreshSelectedDay(date, setSelectedDay, setDayLoading);
  }, []);

  const handlePreviousDay = useCallback(() => {
    void handleSelectDate(shiftDate(selectedDateRef.current, -1));
  }, [handleSelectDate]);

  const handleCurrentDay = useCallback(() => {
    void handleSelectDate(new Date());
  }, [handleSelectDate]);

  const handleNextDay = useCallback(() => {
    void handleSelectDate(shiftDate(selectedDateRef.current, 1));
  }, [handleSelectDate]);

  const progressLabel = `${fh(selectedDay.loggedHours)} / ${fh(selectedDay.targetHours)}`;

  return (
    <main className="relative flex h-full w-full flex-col overflow-hidden rounded-[20px] bg-[color:var(--color-panel)] text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-20 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 bottom-0 h-28 w-28 rounded-full bg-primary/8 blur-3xl"
      />

      <div className="relative flex min-h-0 flex-1 flex-col gap-4 px-4 py-4">
        <header className="flex items-end justify-between gap-3">
          <h1 className="font-display text-[1.15rem] font-semibold tracking-tight text-foreground">
            {t("worklog.daySummary")}
          </h1>
          <TrayPagerControl
            label={pagerLabel}
            onPrevious={handlePreviousDay}
            onCurrent={handleCurrentDay}
            onNext={handleNextDay}
            disabled={pagerBusy}
          />
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="rounded-2xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] p-4 shadow-[var(--shadow-card)]">
            <p className="text-[0.62rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              {t("worklog.logged")} / {t("worklog.target")}
            </p>
            <p className="mt-3 font-display text-[2rem] leading-none font-semibold tracking-tight text-foreground">
              {progressLabel}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{t("worklog.loggedNote")}</p>
          </div>

          <TrayActionRow
            onOpen={handleOpen}
            onOpenAbout={openAboutWindow}
            onOpenSettings={openSettingsWindow}
            onQuit={quitApp}
            onSync={handleSync}
            showOverflowActions={showOverflowActions}
            status={status}
          />
        </div>
      </div>
    </main>
  );
}

const TrayActionRow = memo(function TrayActionRow({
  status,
  onSync,
  onOpen,
  onOpenSettings,
  onOpenAbout,
  onQuit,
  showOverflowActions,
}: {
  status: TrayStatus;
  onSync: () => Promise<void>;
  onOpen: () => Promise<void>;
  onOpenSettings: () => Promise<void>;
  onOpenAbout: () => Promise<void>;
  onQuit: () => Promise<void>;
  showOverflowActions: boolean;
}) {
  const { t } = useI18n();
  const syncing = status === "syncing";
  const [menuOpen, setMenuOpen] = useState(false);

  const handleMenuAction = useCallback(
    async (action: () => Promise<void>) => {
      setMenuOpen(false);
      await action();
    },
    [],
  );

  return (
    <div className="mt-1">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
        <Button
          onClick={() => void onSync()}
          disabled={syncing}
          variant="primary"
          size="sm"
          className="w-full gap-1.5 rounded-xl"
        >
          {status === "success" ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : status === "error" ? (
            <CircleX className="h-3.5 w-3.5" />
          ) : syncing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {status === "success"
            ? t("sync.done")
            : status === "error"
              ? t("common.failed")
              : syncing
                ? t("common.syncing")
                : t("settings.syncNow")}
        </Button>
        <div className="flex min-w-0 rounded-xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel)] shadow-[var(--shadow-clay)]">
          <button
            type="button"
            className={cn(
              "inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 px-3 text-sm font-bold text-foreground transition-colors hover:bg-[color:var(--color-panel-elevated)] active:translate-y-[1px]",
              showOverflowActions ? "rounded-l-[10px]" : "rounded-[10px]",
              syncing && "pointer-events-none opacity-80",
            )}
            onClick={() => void onOpen()}
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{t("common.open")}</span>
          </button>
          {showOverflowActions ? (
            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="More actions"
                className="inline-flex shrink-0 items-center justify-center rounded-r-[10px] border-l-2 border-[color:var(--color-border-subtle)] px-2.5 text-muted-foreground transition-colors hover:bg-[color:var(--color-panel-elevated)] hover:text-foreground active:translate-y-[1px]"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-52 p-2">
              <PopoverHeader className="px-2 pb-2">
                <PopoverTitle className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  More actions
                </PopoverTitle>
              </PopoverHeader>
              <div className="space-y-1">
                <button
                  type="button"
                  className={getCompactActionButtonClassName("w-full justify-start")}
                  onClick={() => void handleMenuAction(onOpenSettings)}
                >
                  {t("common.settings")}
                </button>
                <button
                  type="button"
                  className={getCompactActionButtonClassName("w-full justify-start")}
                  onClick={() => void handleMenuAction(onOpenAbout)}
                >
                  About
                </button>
                <button
                  type="button"
                  className={getCompactActionButtonClassName("w-full justify-start")}
                  onClick={() => void handleMenuAction(onQuit)}
                >
                  {t("common.quit")}
                </button>
              </div>
            </PopoverContent>
          </Popover>
          ) : null}
        </div>
      </div>
    </div>
  );
});

function TrayPagerControl({
  label,
  onPrevious,
  onCurrent,
  onNext,
  disabled,
}: {
  label: string;
  onPrevious: () => void;
  onCurrent: () => void;
  onNext: () => void;
  disabled: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-tray)] p-0.5 shadow-[var(--shadow-clay)]">
      <button
        type="button"
        onClick={onPrevious}
        disabled={disabled}
        className={getCompactIconButtonClassName(
          false,
          "size-7 rounded-md border-transparent bg-transparent text-muted-foreground shadow-none hover:border-[color:var(--color-border-subtle)] hover:bg-[color:var(--color-field-hover)]",
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onCurrent}
        disabled={disabled}
        className={getNeutralSegmentedControlClassName(
          false,
          "h-7 min-w-[4rem] rounded-md border-transparent bg-transparent px-2 text-xs hover:bg-[color:var(--color-field-hover)]",
        )}
      >
        {label}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={disabled}
        className={getCompactIconButtonClassName(
          false,
          "size-7 rounded-md border-transparent bg-transparent text-muted-foreground shadow-none hover:border-[color:var(--color-border-subtle)] hover:bg-[color:var(--color-field-hover)]",
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

async function refreshSelectedDay(
  date: Date,
  setSelectedDay: (day: DayOverview) => void,
  setDayLoading: (loading: boolean) => void,
) {
  setDayLoading(true);
  try {
    const snapshot = await loadWorklogSnapshot({
      mode: "day",
      anchorDate: toDateInputValue(date),
    });
    setSelectedDay(snapshot.selectedDay);
  } catch {
    // silently fail and keep current tray contents
  } finally {
    setDayLoading(false);
  }
}

function parseDateInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftDate(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function clearTransientStatus(timeoutRef: { current: number | null }) {
  if (timeoutRef.current !== null) {
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
}
