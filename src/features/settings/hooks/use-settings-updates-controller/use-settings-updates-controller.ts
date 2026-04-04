import { useState } from "react";
import { toast } from "sonner";
import { saveAppPreferencesCached } from "@/app/bootstrap/PreferencesCache/preferences-cache";
import { useI18n } from "@/app/providers/I18nService/i18n";

import type { UpdateSectionState } from "@/features/settings/lib/settings-summary-labels";
import type {
  AppPreferences,
  AppUpdateChannel,
  AppUpdateDownloadEvent,
  AppUpdateInfo,
} from "@/shared/types/dashboard";
import type { Dispatch, SetStateAction } from "react";

type TranslateFn = ReturnType<typeof useI18n>["t"];

interface UseSettingsUpdatesControllerOptions {
  preferences: AppPreferences;
  setPreferences: Dispatch<SetStateAction<AppPreferences>>;
  onCheckForUpdates: (channel: AppUpdateChannel) => Promise<AppUpdateInfo | null>;
  onInstallUpdate: (
    channel: AppUpdateChannel,
    onEvent?: (event: AppUpdateDownloadEvent) => void,
  ) => Promise<void>;
  onRestartToUpdate: () => Promise<void>;
  t: TranslateFn;
}

export function useSettingsUpdatesController({
  preferences,
  setPreferences,
  onCheckForUpdates,
  onInstallUpdate,
  onRestartToUpdate,
  t,
}: UseSettingsUpdatesControllerOptions) {
  const [updateSectionState, setUpdateSectionState] = useState<UpdateSectionState>({
    status: "idle",
  });

  async function handleUpdateChannelChange(channel: AppUpdateChannel) {
    const previous = preferences;
    const updated = { ...preferences, updateChannel: channel };
    setPreferences(updated);
    setUpdateSectionState({ status: "idle" });

    try {
      const persisted = await saveAppPreferencesCached(updated);
      setPreferences(persisted);
    } catch (error) {
      setPreferences(previous);
      toast.error(t("settings.updatesChannelSaveFailed"), {
        description: error instanceof Error ? error.message : t("settings.tryAgain"),
        duration: 5000,
      });
    }
  }

  async function handleCheckForUpdates() {
    setUpdateSectionState({ status: "checking" });
    toast.info(t("settings.updatesChecking"), {
      description: t("settings.updatesToastChecking"),
      duration: 2500,
    });

    try {
      const update = await onCheckForUpdates(preferences.updateChannel);

      if (!update) {
        setUpdateSectionState({ status: "upToDate" });
        toast.success(t("settings.updatesUpToDate"), {
          description: t("settings.updatesNoUpdate"),
          duration: 3500,
        });
        return;
      }

      setUpdateSectionState({ status: "available", update });
      toast.success(t("settings.updatesAvailable", { version: update.version }), {
        description: t("settings.updatesAvailableDescription"),
        duration: 4000,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("settings.tryAgain");
      setUpdateSectionState({
        status: "error",
        message,
      });
      toast.error(t("settings.updatesCheckFailed"), {
        description: message,
        duration: 5000,
      });
    }
  }

  async function handleInstallUpdate() {
    const currentState = updateSectionState;
    if (currentState.status !== "available") {
      return;
    }

    let downloadedBytes = 0;
    let totalBytes: number | undefined;

    setUpdateSectionState({
      status: "installing",
      update: currentState.update,
      downloadedBytes: 0,
      totalBytes: undefined,
    });

    try {
      await onInstallUpdate(preferences.updateChannel, (event) => {
        if (event.event === "Started") {
          totalBytes = event.data.contentLength;
          setUpdateSectionState({
            status: "installing",
            update: currentState.update,
            downloadedBytes,
            totalBytes,
          });
          toast.info(t("settings.updatesInstalling"), {
            description: t("settings.updatesToastInstalling"),
            duration: 2500,
          });
          return;
        }

        if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength;
          setUpdateSectionState({
            status: "installing",
            update: currentState.update,
            downloadedBytes,
            totalBytes,
          });
          return;
        }

        setUpdateSectionState({
          status: "readyToRestart",
          update: currentState.update,
        });
        toast.success(t("settings.updatesReady", { version: currentState.update.version }), {
          description: t("settings.updatesReadyDescription"),
          duration: 5000,
        });
      });

      setUpdateSectionState({
        status: "readyToRestart",
        update: currentState.update,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("settings.tryAgain");
      setUpdateSectionState({
        status: "error",
        message,
      });
      toast.error(t("settings.updatesInstallFailed"), {
        description: message,
        duration: 5000,
      });
    }
  }

  async function handleRestartToUpdate() {
    try {
      toast.info(t("settings.updatesRestart"), {
        description: t("settings.updatesToastRestarting"),
        duration: 2500,
      });
      await onRestartToUpdate();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("settings.tryAgain");
      setUpdateSectionState({
        status: "error",
        message,
      });
      toast.error(t("settings.updatesRestartFailed"), {
        description: message,
        duration: 5000,
      });
    }
  }

  return {
    updateSectionState,
    handleUpdateChannelChange,
    handleCheckForUpdates,
    handleInstallUpdate,
    handleRestartToUpdate,
  };
}
