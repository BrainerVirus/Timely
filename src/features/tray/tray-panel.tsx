import { invoke } from "@tauri-apps/api/core";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import CheckCircle2 from "lucide-react/dist/esm/icons/circle-check.js";
import CircleX from "lucide-react/dist/esm/icons/circle-x.js";
import ExternalLink from "lucide-react/dist/esm/icons/external-link.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.js";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useFormatHours } from "@/hooks/use-format-hours";
import {
  getCompactIconButtonClassName,
  getNeutralSegmentedControlClassName,
} from "@/lib/control-styles";
import { useI18n } from "@/lib/i18n";
import { useMotionSettings } from "@/lib/motion";
import { loadWorklogSnapshot } from "@/lib/tauri";

import type { BootstrapPayload, DayOverview } from "@/types/dashboard";

type TrayStatus = "idle" | "syncing" | "success" | "error";

const SYNC_FEEDBACK_DURATION_MS = 1600;

interface TrayPanelProps {
  payload: BootstrapPayload;
  onClose: () => void;
  onActivated?: (cb: () => void) => () => void;
}

export function TrayPanel({
  payload: initialPayload,
  onClose,
  onActivated,
}: Readonly<TrayPanelProps>) {
  const [selectedDay, setSelectedDay] = useState(initialPayload.today);
  const [selectedDate, setSelectedDate] = useState(() =>
    parseDateInputValue(initialPayload.today.date),
  );
  const [status, setStatus] = useState<TrayStatus>("idle");
  const [dayLoading, setDayLoading] = useState(false);
  const [dayError, setDayError] = useState<string | null>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const selectedDateRef = useRef(selectedDate);
  const fh = useFormatHours();
  const { formatDate, t } = useI18n();
  const { allowDecorativeAnimation } = useMotionSettings();

  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  useEffect(() => {
    if (!dayError) {
      return;
    }

    toast.error(t("tray.refreshFailedTitle"), {
      description: t("tray.dayRefreshFailed", { error: dayError }),
      duration: 7000,
    });
  }, [dayError, t]);

  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current !== null) {
        globalThis.clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);

  const refreshCurrentDay = useCallback(async () => {
    await refreshSelectedDay(selectedDateRef.current, setSelectedDay, setDayLoading, setDayError);
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
    } catch (error) {
      setDayError(getErrorMessage(error));
    }
  }, [onClose]);

  const handleSync = useCallback(async () => {
    const syncDate = selectedDateRef.current;
    clearTransientStatus(statusTimeoutRef);
    setStatus("syncing");

    try {
      await invoke("sync_gitlab");
      await refreshSelectedDay(syncDate, setSelectedDay, setDayLoading, setDayError);
      setStatus("success");
      statusTimeoutRef.current = globalThis.setTimeout(() => {
        setStatus("idle");
        statusTimeoutRef.current = null;
      }, SYNC_FEEDBACK_DURATION_MS);
    } catch {
      setStatus("error");
      statusTimeoutRef.current = globalThis.setTimeout(() => {
        setStatus("idle");
        statusTimeoutRef.current = null;
      }, SYNC_FEEDBACK_DURATION_MS);
    }
  }, []);

  const handleSelectDate = useCallback(async (date: Date) => {
    selectedDateRef.current = date;
    setSelectedDate(date);
    await refreshSelectedDay(date, setSelectedDay, setDayLoading, setDayError);
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
    <main className="relative flex h-full w-full flex-col overflow-hidden rounded-xl bg-panel text-foreground">
      <div
        aria-hidden="true"
        className={
          allowDecorativeAnimation
            ? "pointer-events-none absolute inset-x-10 top-0 h-20 rounded-full bg-primary/10 blur-3xl"
            : "hidden"
        }
      />
      <div
        aria-hidden="true"
        className={
          allowDecorativeAnimation
            ? "pointer-events-none absolute right-0 bottom-0 h-28 w-28 rounded-full bg-primary/8 blur-3xl"
            : "hidden"
        }
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
          <div className="rounded-2xl border-2 border-border-subtle bg-panel-elevated p-4 shadow-card">
            <p className="text-[0.62rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              {t("worklog.logged")} / {t("worklog.target")}
            </p>
            <p className="mt-3 font-display text-[2rem] leading-none font-semibold tracking-tight text-foreground">
              {progressLabel}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{t("worklog.loggedNote")}</p>
          </div>

          <TrayActionRow onOpen={handleOpen} onSync={handleSync} status={status} />
        </div>
      </div>
    </main>
  );
}

const TrayActionRow = memo(function TrayActionRow({
  status,
  onSync,
  onOpen,
}: {
  status: TrayStatus;
  onSync: () => Promise<void>;
  onOpen: () => Promise<void>;
}) {
  const { t } = useI18n();
  const syncing = status === "syncing";

  const getSyncIcon = () => {
    if (status === "success") {
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    }
    if (status === "error") {
      return <CircleX className="h-3.5 w-3.5" />;
    }
    if (syncing) {
      return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
    }
    return <RefreshCw className="h-3.5 w-3.5" />;
  };

  const getSyncLabel = () => {
    if (status === "success") {
      return t("sync.done");
    }
    if (status === "error") {
      return t("tray.syncFailed");
    }
    if (syncing) {
      return t("common.syncing");
    }
    return t("common.sync");
  };

  const syncIcon = getSyncIcon();
  const syncLabel = getSyncLabel();

  return (
    <div className="mt-1">
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => void onSync()}
          disabled={syncing}
          variant="primary"
          size="sm"
          className="w-full gap-1.5 rounded-xl"
        >
          {syncIcon}
          {syncLabel}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-1.5 rounded-xl"
          type="button"
          onClick={() => void onOpen()}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {t("common.open")}
        </Button>
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
}: Readonly<{
  label: string;
  onPrevious: () => void;
  onCurrent: () => void;
  onNext: () => void;
  disabled: boolean;
}>) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border-2 border-border-subtle bg-tray p-0.5 shadow-clay">
      <button
        type="button"
        onClick={onPrevious}
        disabled={disabled}
        className={getCompactIconButtonClassName(
          false,
          "size-7 rounded-md border-transparent bg-transparent text-muted-foreground shadow-none hover:border-border-subtle hover:bg-field-hover",
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
          "h-7 min-w-16 rounded-md border-transparent bg-transparent px-2 text-xs hover:bg-field-hover",
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
          "size-7 rounded-md border-transparent bg-transparent text-muted-foreground shadow-none hover:border-border-subtle hover:bg-field-hover",
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
  setDayError: (error: string | null) => void,
) {
  setDayLoading(true);
  try {
    const snapshot = await loadWorklogSnapshot({
      mode: "day",
      anchorDate: toDateInputValue(date),
    });
    setSelectedDay(snapshot.selectedDay);
    setDayError(null);
  } catch (error) {
    setDayError(getErrorMessage(error));
  } finally {
    setDayLoading(false);
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return String(error);
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

function clearTransientStatus(timeoutRef: {
  current: ReturnType<typeof globalThis.setTimeout> | null;
}) {
  if (timeoutRef.current !== null) {
    globalThis.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
}
