import type {
  BootstrapPayload,
  ProviderConnection,
  SetupState,
  SyncState,
  TimeFormat,
} from "@/shared/types/dashboard";

export type AppLifecycle =
  | { phase: "ready"; payload: BootstrapPayload }
  | { phase: "error"; error: string };

export interface AppState {
  lifecycle: AppLifecycle;
  connections: ProviderConnection[];
  syncState: SyncState;
  setupState: SetupState;
  timeFormat: TimeFormat;
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number;
  onboardingCompleted: boolean;
  syncVersion: number;
  lastSyncWasManual: boolean;
  syncLogOpen: boolean;
  setupAssistMode: "none" | "connection";
  bootstrap: () => Promise<void>;
  refreshConnections: () => Promise<void>;
  refreshPayload: () => Promise<void>;
  startSync: (manual?: boolean) => Promise<void>;
  refreshSetupState: () => Promise<void>;
  setSetupState: (next: SetupState) => Promise<void>;
  completeSetupStep: (step: SetupState["currentStep"]) => Promise<void>;
  markSetupComplete: () => Promise<void>;
  clearSetupState: () => Promise<void>;
  setTimeFormat: (format: TimeFormat) => void;
  setAutoSyncPrefs: (enabled: boolean, intervalMinutes: number) => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
  setSyncLogOpen: (open: boolean) => void;
  requestSetupAssist: (mode: "connection") => void;
  clearSetupAssist: () => void;
}

export type AppStoreSet = (
  partial: Partial<AppState> | ((state: AppState) => Partial<AppState>),
) => void;

export type AppStoreGet = () => AppState;
