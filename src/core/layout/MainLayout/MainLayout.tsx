import { Navigate, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import Terminal from "lucide-react/dist/esm/icons/terminal.js";
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { NavRail } from "@/core/layout/MainLayout/components/NavRail/NavRail";
import { TopBar } from "@/core/layout/MainLayout/components/TopBar/TopBar";
import { buildInfo } from "@/core/services/BuildInfo/build-info";
import { useI18n } from "@/core/services/I18nService/i18n";
import {
  getAppPreferencesCached,
  saveAppPreferencesCached,
} from "@/core/services/PreferencesCache/preferences-cache";
import { getReleaseHighlights } from "@/core/services/ReleaseHighlights/release-highlights";
import { listenDesktopEvent } from "@/core/services/TauriService/tauri";
import { useAppStore } from "@/core/stores/AppStore/app-store";
import { AboutDialog } from "@/features/settings/components/AboutDialog/AboutDialog";
import { ReleaseHighlightsDialog } from "@/features/settings/components/ReleaseHighlightsDialog/ReleaseHighlightsDialog";
import { getSetupStepPath } from "@/features/setup/services/setup-flow/setup-flow";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/Dialog/Dialog";
import { cn } from "@/shared/utils/utils";

import type { SyncState } from "@/shared/types/dashboard";

const OnboardingFlow = lazy(async () => {
  const module = await import("@/features/onboarding/components/OnboardingFlow/OnboardingFlow");
  return { default: module.OnboardingFlow };
});

/* ------------------------------------------------------------------ */
/*  Sync log dialog                                                    */
/* ------------------------------------------------------------------ */

function syncLogLineClass(line: string): string {
  if (line.startsWith("ERROR")) return "text-destructive";
  if (line.startsWith("Done.") || line.startsWith("Sync complete")) return "text-success";
  return "text-foreground/80";
}

function buildKeyedLogLines(log: string[]) {
  const counts = new Map<string, number>();
  return log.map((line, index) => {
    const n = (counts.get(line) ?? 0) + 1;
    counts.set(line, n);
    return { key: `${line}-${n}`, line, lineNumber: index + 1 };
  });
}

function SyncLogDialog({
  open,
  onOpenChange,
  syncState,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  syncState: SyncState;
}>) {
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const syncing = syncState.status === "syncing";

  useEffect(() => {
    if (scrollRef.current && open) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [syncState.log.length, open]);

  const lines = buildKeyedLogLines(syncState.log);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[70vh] max-w-3xl flex-col gap-0 overflow-hidden p-0"
        closeButtonClassName="top-2.5 right-5"
        closeButtonAriaLabel={t("ui.close")}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          scrollRef.current?.focus();
        }}
      >
        <DialogHeader className="border-b-2 border-border-subtle px-5 py-3.5 pr-16">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <DialogTitle className="font-display text-base font-semibold">
              {t("sync.logTitle")}
            </DialogTitle>
            {syncing && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
          </div>
        </DialogHeader>

        <div
          ref={scrollRef}
          tabIndex={-1}
          className="flex-1 overflow-y-auto overscroll-contain scroll-smooth bg-field p-4 font-mono text-xs leading-relaxed outline-none"
        >
          {lines.length === 0 && syncing && (
            <p className="text-muted-foreground">{t("sync.starting")}</p>
          )}
          {lines.length === 0 && !syncing && (
            <p className="text-muted-foreground">{t("sync.noEntries")}</p>
          )}
          {lines.map(({ key, line, lineNumber }) => (
            <p key={key} className={cn("flex gap-3", syncLogLineClass(line))}>
              <span className="w-6 shrink-0 text-right text-muted-foreground/40 select-none">
                {lineNumber}
              </span>
              <span className="flex-1 break-all">{line}</span>
            </p>
          ))}
          {syncing && <p className="mt-1 animate-pulse text-muted-foreground">_</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

type SyncDotStatus = "syncing" | "error" | "stale" | "fresh";

const STALE_THRESHOLD_MS = 30 * 60 * 1000;

function deriveSyncStatus(status: SyncState["status"], lastSyncedAt: Date | null): SyncDotStatus {
  if (status === "syncing") return "syncing";
  if (status === "error") return "error";
  if (!lastSyncedAt) return "stale";
  return Date.now() - lastSyncedAt.getTime() > STALE_THRESHOLD_MS ? "stale" : "fresh";
}

function parseSyncedAt(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function deriveCurrentPath(location: string, playEnabled: boolean): string {
  if (location.startsWith("/play")) {
    return playEnabled ? "/play" : "/";
  }
  if (location.startsWith("/worklog")) {
    return "/worklog";
  }
  if (location.startsWith("/settings")) {
    return "/settings";
  }
  return "/";
}

function derivePageTitle(currentPath: string, t: ReturnType<typeof useI18n>["t"]): string {
  switch (currentPath) {
    case "/":
      return t("common.home");
    case "/worklog":
      return t("common.worklog");
    case "/play":
      return t("common.play");
    case "/settings":
      return t("common.settings");
    default:
      return t("app.name");
  }
}

/* ------------------------------------------------------------------ */
/*  MainLayout                                                          */
/* ------------------------------------------------------------------ */

export function MainLayout() {
  const { locale, t } = useI18n();
  const setupState = useAppStore((s) => s.setupState);
  const syncState = useAppStore((s) => s.syncState);
  const lastSyncWasManual = useAppStore((s) => s.lastSyncWasManual);
  const startSync = useAppStore((s) => s.startSync);
  const autoSyncEnabled = useAppStore((s) => s.autoSyncEnabled);
  const autoSyncIntervalMinutes = useAppStore((s) => s.autoSyncIntervalMinutes);
  const syncLogOpen = useAppStore((s) => s.syncLogOpen);
  const setSyncLogOpen = useAppStore((s) => s.setSyncLogOpen);
  const setupAssistMode = useAppStore((s) => s.setupAssistMode);
  const onboardingCompleted = useAppStore((s) => s.onboardingCompleted);
  const persistedLastSyncedAt = useAppStore((s) =>
    s.lifecycle.phase === "ready" ? s.lifecycle.payload.lastSyncedAt : null,
  );
  const navigate = useNavigate();
  const location = useRouterState({ select: (s) => s.location.pathname });
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(() =>
    parseSyncedAt(persistedLastSyncedAt),
  );
  const [aboutOpen, setAboutOpen] = useState(false);
  const [releaseHighlightsOpen, setReleaseHighlightsOpen] = useState(false);
  const releaseHighlights = getReleaseHighlights(buildInfo.appVersion, locale);
  const currentVersion = buildInfo.appVersion;

  const isSetupRoute = location.startsWith("/setup");
  const currentPath = deriveCurrentPath(location, buildInfo.playEnabled);
  const pageTitle = derivePageTitle(currentPath, t);
  const syncStatus = deriveSyncStatus(syncState.status, lastSyncedAt);

  const handleNavigate = useCallback(
    (path: string) => {
      navigate({ to: path });
    },
    [navigate],
  );

  const prevSyncStatusRef = useRef<SyncState["status"]>(syncState.status);

  useEffect(() => {
    setLastSyncedAt(parseSyncedAt(persistedLastSyncedAt));
  }, [persistedLastSyncedAt]);

  useEffect(() => {
    const prev = prevSyncStatusRef.current;
    prevSyncStatusRef.current = syncState.status;

    if (prev !== "syncing") return;

    if (syncState.status === "done") {
      setLastSyncedAt(new Date());
      if (lastSyncWasManual) {
        const { result } = syncState;
        toast.success(t("sync.toastCompleteTitle"), {
          description: t("sync.toastCompleteDescription", {
            projects: result.projectsSynced,
            entries: result.entriesSynced,
            issues: result.issuesSynced,
          }),
          duration: 8000,
          action: {
            label: t("common.viewLog"),
            onClick: () => useAppStore.getState().setSyncLogOpen(true),
          },
        });
      }
    } else if (syncState.status === "error") {
      if (lastSyncWasManual) {
        toast.error(t("sync.toastFailedTitle"), {
          description: syncState.error,
          duration: 10000,
          action: {
            label: t("common.viewLog"),
            onClick: () => useAppStore.getState().setSyncLogOpen(true),
          },
        });
      }
    }
  }, [lastSyncWasManual, syncState, t]);

  useEffect(() => {
    if (!autoSyncEnabled) return;
    const ms = autoSyncIntervalMinutes * 60 * 1000;
    const interval = setInterval(() => {
      void startSync(false);
    }, ms);
    return () => clearInterval(interval);
  }, [autoSyncEnabled, autoSyncIntervalMinutes, startSync]);

  useEffect(() => {
    let disposeSettings = () => {};
    let disposeAbout = () => {};

    void (async () => {
      try {
        disposeSettings = await listenDesktopEvent<boolean>("open-settings", () => {
          navigate({ to: "/settings" });
        });

        disposeAbout = await listenDesktopEvent<boolean>("open-about", () => {
          setAboutOpen(true);
        });
      } catch {
        disposeSettings = () => {};
        disposeAbout = () => {};
      }
    })();

    return () => {
      disposeSettings();
      disposeAbout();
    };
  }, [navigate]);

  useEffect(() => {
    if (!setupState.isComplete || releaseHighlights == null) {
      return;
    }

    let cancelled = false;

    void getAppPreferencesCached()
      .then((preferences) => {
        if (cancelled) {
          return;
        }

        const lastInstalledVersion = preferences.lastInstalledVersion?.trim();
        const lastSeenReleaseHighlightsVersion =
          preferences.lastSeenReleaseHighlightsVersion?.trim();

        if (!lastInstalledVersion) {
          void saveAppPreferencesCached({
            ...preferences,
            lastInstalledVersion: currentVersion,
          }).catch(() => {});
          return;
        }

        if (lastInstalledVersion === currentVersion) {
          return;
        }

        if (lastSeenReleaseHighlightsVersion === currentVersion) {
          void saveAppPreferencesCached({
            ...preferences,
            lastInstalledVersion: currentVersion,
          }).catch(() => {});
          return;
        }

        if (!onboardingCompleted) {
          return;
        }

        setReleaseHighlightsOpen(true);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [currentVersion, onboardingCompleted, releaseHighlights, setupState.isComplete]);

  const acknowledgeReleaseHighlights = useCallback(() => {
    if (!releaseHighlightsOpen) {
      return;
    }

    setReleaseHighlightsOpen(false);

    void getAppPreferencesCached()
      .then((preferences) =>
        saveAppPreferencesCached({
          ...preferences,
          lastInstalledVersion: currentVersion,
          lastSeenReleaseHighlightsVersion: currentVersion,
        }),
      )
      .catch(() => {});
  }, [currentVersion, releaseHighlightsOpen]);

  const handleReleaseHighlightsOpenChange = useCallback(
    (open: boolean) => {
      if (!open && releaseHighlightsOpen) {
        acknowledgeReleaseHighlights();
        return;
      }

      setReleaseHighlightsOpen(open);
    },
    [acknowledgeReleaseHighlights, releaseHighlightsOpen],
  );

  if (isSetupRoute) {
    return (
      <main className="min-h-screen bg-page-canvas text-foreground">
        <Outlet />
      </main>
    );
  }

  if (!setupState.isComplete) {
    return (
      <main className="min-h-screen bg-page-canvas text-foreground">
        <Navigate to={getSetupStepPath(setupState.currentStep)} />
      </main>
    );
  }

  return (
    <main className="flex h-screen bg-linear-to-br from-app-frame via-app-bar to-page-canvas text-foreground">
      <NavRail currentPath={currentPath} onNavigate={handleNavigate} syncStatus={syncStatus} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          title={pageTitle}
          lastSyncedAt={lastSyncedAt}
          syncing={syncState.status === "syncing"}
          onSync={() => void startSync(true)}
        />

        <div className="scrollbar-gutter-stable flex flex-1 flex-col overflow-y-auto overscroll-contain scroll-smooth bg-page-canvas">
          <div className="flex-1 bg-page-canvas">
            <div className="@container min-h-full bg-page-canvas p-6">
              <Outlet />
            </div>
          </div>
        </div>
      </div>

      {setupState.isComplete &&
        setupAssistMode === "none" &&
        buildInfo.onboardingTourEnabled &&
        !onboardingCompleted && (
          <Suspense fallback={null}>
            <OnboardingFlow onNavigate={handleNavigate} />
          </Suspense>
        )}

      <SyncLogDialog open={syncLogOpen} onOpenChange={setSyncLogOpen} syncState={syncState} />
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
      {releaseHighlights ? (
        <ReleaseHighlightsDialog
          open={releaseHighlightsOpen}
          content={releaseHighlights}
          onOpenChange={handleReleaseHighlightsOpenChange}
          onAcknowledge={acknowledgeReleaseHighlights}
        />
      ) : null}
    </main>
  );
}
