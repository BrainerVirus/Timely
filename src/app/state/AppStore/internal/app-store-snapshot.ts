import {
  createDefaultStartupAppSnapshot,
  readStartupAppSnapshot,
  writeStartupAppSnapshot,
} from "@/app/bootstrap/StartupAppState/startup-app-state";
import { updateTrayIcon } from "@/app/desktop/TauriService/tauri";

import type { AppState } from "@/app/state/AppStore/internal/app-store-types";
import type {
  BootstrapPayload,
  ProviderConnection,
  SetupState,
  TimeFormat,
} from "@/shared/types/dashboard";

export const initialStartupSnapshot = readStartupAppSnapshot().snapshot;

export function syncTrayIcon(payload: BootstrapPayload): void {
  updateTrayIcon(payload.today.loggedHours, payload.today.targetHours);
}

export function persistStartupSnapshot(input: {
  payload: BootstrapPayload;
  connections: ProviderConnection[];
  setupState: SetupState;
  timeFormat: TimeFormat;
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number;
  onboardingCompleted: boolean;
}): void {
  writeStartupAppSnapshot({
    ...createDefaultStartupAppSnapshot(),
    ...input,
  });
}

export function persistStartupSnapshotFromStore(state: AppState): void {
  if (state.lifecycle.phase !== "ready") {
    return;
  }

  persistStartupSnapshot({
    payload: state.lifecycle.payload,
    connections: state.connections,
    setupState: state.setupState,
    timeFormat: state.timeFormat,
    autoSyncEnabled: state.autoSyncEnabled,
    autoSyncIntervalMinutes: state.autoSyncIntervalMinutes,
    onboardingCompleted: state.onboardingCompleted,
  });
}
