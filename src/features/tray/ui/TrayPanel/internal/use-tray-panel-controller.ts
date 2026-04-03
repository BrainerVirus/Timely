import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { loadWorklogSnapshot } from "@/app/desktop/TauriService/tauri";
import {
  clearTransientStatus,
  getErrorMessage,
  parseDateInputValue,
  shiftDate,
  toDateInputValue,
} from "@/features/tray/ui/TrayPanel/internal/tray-panel-helpers";

import type { BootstrapPayload, DayOverview } from "@/shared/types/dashboard";

export type TrayStatus = "idle" | "syncing" | "success" | "error";

const SYNC_FEEDBACK_DURATION_MS = 1600;

interface UseTrayPanelControllerArgs {
  payload: BootstrapPayload;
  onClose: () => void;
  onActivated?: (cb: () => void) => () => void;
}

export function useTrayPanelController({
  payload,
  onClose,
  onActivated,
}: UseTrayPanelControllerArgs) {
  const [selectedDay, setSelectedDay] = useState(payload.today);
  const [selectedDate, setSelectedDate] = useState(() => parseDateInputValue(payload.today.date));
  const [status, setStatus] = useState<TrayStatus>("idle");
  const [dayLoading, setDayLoading] = useState(false);
  const [dayError, setDayError] = useState<string | null>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const selectedDateRef = useRef(selectedDate);
  const { formatDate, t } = useI18n();

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
    if (!onActivated) {
      return;
    }

    return onActivated(() => {
      void refreshCurrentDay();
    });
  }, [onActivated, refreshCurrentDay]);

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

  const syncing = status === "syncing";
  const pagerBusy = syncing || dayLoading;
  const pagerLabel = selectedDay.isToday
    ? t("common.today")
    : formatDate(selectedDate, {
        weekday: "short",
        month: "short",
        day: "2-digit",
      });

  return {
    selectedDay,
    status,
    pagerBusy,
    pagerLabel,
    handleOpen,
    handleSync,
    handlePreviousDay,
    handleCurrentDay,
    handleNextDay,
  };
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
