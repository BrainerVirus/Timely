import {
  Navigate,
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import Terminal from "lucide-react/dist/esm/icons/terminal.js";
import { LazyMotion, domAnimation } from "motion/react";
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { NavRail } from "@/layout/MainLayout/components/nav-rail";
import { TopBar } from "@/layout/MainLayout/components/top-bar";
import { AboutDialog } from "@/features/settings/components/about-dialog";
import { ReleaseHighlightsDialog } from "@/features/settings/components/release-highlights-dialog";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Toaster } from "@/shared/ui/toaster";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { HomePage } from "@/features/home/home-page";
import { prefetchPlaySnapshot } from "@/features/play/play-snapshot-cache";
import { getSetupStepPath } from "@/features/setup/setup-flow";
import { prefetchWorklogSnapshots } from "@/features/worklog/worklog-page-state";
import { applyTheme } from "@/hooks/use-theme";
import { getBootElapsedMs } from "@/lib/boot-timing";
import { buildInfo } from "@/lib/build-info";
import { useI18n } from "@/lib/i18n";
import { MotionProvider } from "@/lib/motion";
import { getAppPreferencesCached, saveAppPreferencesCached } from "@/lib/preferences-cache";
import { getReleaseHighlights } from "@/lib/release-highlights";
import { clearStartupAppSnapshot } from "@/lib/startup-app-state";
import { readStartupPrefs } from "@/lib/startup-prefs";
import {
  beginGitLabOAuth,
  checkForAppUpdateChannel,
  downloadAndInstallAppUpdate,
  logFrontendBootTiming,
  listenForGitLabOAuthCallback,
  listenDesktopEvent,
  restartApp,
  resolveGitLabOAuthCallback,
  resetAllData,
  saveGitLabConnection,
  saveGitLabPat,
  updateSchedule,
  updateTrayIcon,
  validateGitLabToken,
} from "@/lib/tauri";
import { cn } from "@/shared/utils/utils";
import { useAppStore } from "@/stores/app-store";
import { hasActiveConnection } from "@/types/dashboard";
import {
  SetupLayoutRoute,
  SetupDoneRouteComponent,
  SetupIndexRoute,
  SetupProviderRouteComponent,
  SetupScheduleRouteComponent,
  SetupSyncRouteComponent,
  SetupWelcomeRouteComponent,
} from "./setup-routes";

import type { WorklogMode } from "@/features/worklog/worklog-page";
import type { BootstrapPayload, GitLabConnectionInput, SyncState } from "@/types/dashboard";

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
/*  Route definitions                                                  */
/* ------------------------------------------------------------------ */

const rootRoute = createRootRoute({ component: AppShell });

const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: HomeRoute });
const worklogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/worklog",
  component: WorklogRoute,
  validateSearch: (search: Record<string, unknown>): WorklogRouteSearch => ({
    mode: search.mode as WorklogMode | undefined,
    detailDate: search.detailDate as string | undefined,
  }),
});
const playRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/play",
  component: PlayLayoutRoute,
});
const playIndexRoute = createRoute({
  getParentRoute: () => playRoute,
  path: "/",
  component: PlayRoute,
});
const playShopRoute = createRoute({
  getParentRoute: () => playRoute,
  path: "/shop",
  component: PlayShopRoute,
});
const playCollectionRoute = createRoute({
  getParentRoute: () => playRoute,
  path: "/collection",
  component: PlayCollectionRoute,
});
const playMissionsRoute = createRoute({
  getParentRoute: () => playRoute,
  path: "/missions",
  component: PlayMissionsRoute,
});
const playAchievementsRoute = createRoute({
  getParentRoute: () => playRoute,
  path: "/achievements",
  component: PlayAchievementsRoute,
});
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsRoute,
});
const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/setup",
  component: SetupLayoutRoute,
});
const setupIndexRoute = createRoute({
  getParentRoute: () => setupRoute,
  path: "/",
  component: SetupIndexRoute,
});
const setupWelcomeRoute = createRoute({
  getParentRoute: () => setupRoute,
  path: "/welcome",
  component: SetupWelcomeRouteComponent,
});
const setupProviderRoute = createRoute({
  getParentRoute: () => setupRoute,
  path: "/provider",
  component: SetupProviderRouteComponent,
});
const setupScheduleRoute = createRoute({
  getParentRoute: () => setupRoute,
  path: "/schedule",
  component: SetupScheduleRouteComponent,
});
const setupSyncRoute = createRoute({
  getParentRoute: () => setupRoute,
  path: "/sync",
  component: SetupSyncRouteComponent,
});
const setupDoneRoute = createRoute({
  getParentRoute: () => setupRoute,
  path: "/done",
  component: SetupDoneRouteComponent,
});

const playRouteChildren = buildInfo.playEnabled
  ? [playIndexRoute, playShopRoute, playCollectionRoute, playMissionsRoute, playAchievementsRoute]
  : [];

const OnboardingFlow = lazy(async () => {
  const module = await import("@/features/onboarding/onboarding-flow");
  return { default: module.OnboardingFlow };
});

const SetupConnectionGuide = lazy(async () => {
  const module = await import("@/features/onboarding/setup-connection-guide");
  return { default: module.SetupConnectionGuide };
});

const WorklogPage = lazy(async () => {
  const module = await import("@/features/worklog/worklog-page");
  return { default: module.WorklogPage };
});

const SettingsPage = lazy(async () => {
  const module = await import("@/features/settings/settings-page");
  return { default: module.SettingsPage };
});

const PlayLayout = lazy(async () => {
  const module = await import("@/features/play/play-layout");
  return { default: module.PlayLayout };
});

const PlayOverviewPage = lazy(async () => {
  const module = await import("@/features/play/play-route-pages");
  return { default: module.PlayOverviewPage };
});

const PlayShopPage = lazy(async () => {
  const module = await import("@/features/play/play-route-pages");
  return { default: module.PlayShopPage };
});

const PlayCollectionPage = lazy(async () => {
  const module = await import("@/features/play/play-route-pages");
  return { default: module.PlayCollectionPage };
});

const PlayMissionsPage = lazy(async () => {
  const module = await import("@/features/play/play-route-pages");
  return { default: module.PlayMissionsPage };
});

const PlayAchievementsPage = lazy(async () => {
  const module = await import("@/features/play/play-route-pages");
  return { default: module.PlayAchievementsPage };
});

interface WorklogRouteSearch {
  mode?: WorklogMode;
  detailDate?: string;
}

const routeTree = rootRoute.addChildren([
  homeRoute,
  worklogRoute,
  playRoute.addChildren(playRouteChildren),
  settingsRoute,
  setupRoute.addChildren([
    setupIndexRoute,
    setupWelcomeRoute,
    setupProviderRoute,
    setupScheduleRoute,
    setupSyncRoute,
    setupDoneRoute,
  ]),
]);

export function createAppRouter(initialEntries: Array<string> = ["/"]) {
  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries }),
  });
}

export const router = createAppRouter();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

/* ------------------------------------------------------------------ */
/*  Shared hooks & helpers                                             */
/* ------------------------------------------------------------------ */

function usePayload(): BootstrapPayload {
  const lifecycle = useAppStore((state) => state.lifecycle);
  if (lifecycle.phase !== "ready") throw new Error("usePayload called before ready");
  return lifecycle.payload;
}

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

/* ------------------------------------------------------------------ */
/*  Page title mapping                                                 */
/* ------------------------------------------------------------------ */

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
/*  AppShell                                                           */
/* ------------------------------------------------------------------ */

function AppShell() {
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

    // Only fire toasts when genuinely transitioning away from "syncing"
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
      void startSync(false); // silent — no toast
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
          }).catch(() => {
            // best effort - release highlights are skipped unless we can confirm an upgrade
          });
          return;
        }

        if (lastInstalledVersion === currentVersion) {
          return;
        }

        if (lastSeenReleaseHighlightsVersion === currentVersion) {
          void saveAppPreferencesCached({
            ...preferences,
            lastInstalledVersion: currentVersion,
          }).catch(() => {
            // best effort - avoid re-checking an already acknowledged version
          });
          return;
        }

        if (!onboardingCompleted) {
          return;
        }

        setReleaseHighlightsOpen(true);
      })
      .catch(() => {
        // best effort - skip release highlights unless we can verify this is an upgrade
      });

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
      .catch(() => {
        // best effort - keep the dialog dismissed for the current session
      });
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

      {/* Sync log dialog — opened from the toast "View log" action */}
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

/* ------------------------------------------------------------------ */
/*  Main route components                                              */
/* ------------------------------------------------------------------ */

function HomeRoute() {
  const payload = usePayload();
  const navigate = useNavigate();
  const connections = useAppStore((state) => state.connections);
  const requestSetupAssist = useAppStore((state) => state.requestSetupAssist);

  return (
    <HomePage
      payload={payload}
      needsSetup={!hasActiveConnection(connections)}
      onOpenSetup={() => {
        requestSetupAssist("connection");
        navigate({ to: "/settings" });
      }}
      onOpenWorklog={(mode) => navigate({ to: "/worklog", search: { mode } })}
    />
  );
}

function WorklogRoute() {
  const payload = usePayload();
  const navigate = useNavigate();
  const syncVersion = useAppStore((s) => s.syncVersion);
  const search = worklogRoute.useSearch();
  const mode =
    search.mode === "month" || search.mode === "range" ? "period" : (search.mode ?? "day");
  const detailDate = parseWorklogDetailDate(search.detailDate);

  return (
    <Suspense fallback={null}>
      <WorklogPage
        key={mode}
        payload={payload}
        mode={mode}
        syncVersion={syncVersion}
        detailDate={detailDate}
        onModeChange={(nextMode) => navigate({ to: "/worklog", search: { mode: nextMode } })}
        onOpenNestedDay={(date: Date) =>
          navigate({ to: "/worklog", search: { mode, detailDate: toWorklogDetailDate(date) } })
        }
        onCloseNestedDay={() => navigate({ to: "/worklog", search: { mode } })}
      />
    </Suspense>
  );
}

function parseWorklogDetailDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, (month ?? 1) - 1, day ?? 1);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toWorklogDetailDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function PlayRoute() {
  const navigate = useNavigate();
  if (!buildInfo.playEnabled) {
    return <Navigate to="/" />;
  }

  return (
    <Suspense fallback={null}>
      <PlayOverviewPage
        onOpenShop={() => navigate({ to: "/play/shop" })}
        onOpenCollection={() => navigate({ to: "/play/collection" })}
        onOpenMissions={() => navigate({ to: "/play/missions" })}
        onOpenAchievements={() => navigate({ to: "/play/achievements" })}
      />
    </Suspense>
  );
}

function PlayLayoutRoute() {
  const payload = usePayload();
  if (!buildInfo.playEnabled) {
    return <Navigate to="/" />;
  }

  return (
    <Suspense fallback={null}>
      <PlayLayout payload={payload} />
    </Suspense>
  );
}

function PlayShopRoute() {
  if (!buildInfo.playEnabled) {
    return <Navigate to="/" />;
  }

  return (
    <Suspense fallback={null}>
      <PlayShopPage />
    </Suspense>
  );
}

function PlayCollectionRoute() {
  if (!buildInfo.playEnabled) {
    return <Navigate to="/" />;
  }

  return (
    <Suspense fallback={null}>
      <PlayCollectionPage />
    </Suspense>
  );
}

function PlayMissionsRoute() {
  if (!buildInfo.playEnabled) {
    return <Navigate to="/" />;
  }

  return (
    <Suspense fallback={null}>
      <PlayMissionsPage />
    </Suspense>
  );
}

function PlayAchievementsRoute() {
  if (!buildInfo.playEnabled) {
    return <Navigate to="/" />;
  }

  return (
    <Suspense fallback={null}>
      <PlayAchievementsPage />
    </Suspense>
  );
}

function SettingsRoute() {
  const payload = usePayload();
  const connections = useAppStore((s) => s.connections);
  const setupAssistMode = useAppStore((s) => s.setupAssistMode);
  const clearSetupAssist = useAppStore((s) => s.clearSetupAssist);
  const refreshConnections = useAppStore((s) => s.refreshConnections);
  const refreshPayload = useAppStore((s) => s.refreshPayload);
  const syncState = useAppStore((s) => s.syncState);
  const startSync = useAppStore((s) => s.startSync);
  const clearSetupProgress = useAppStore((s) => s.clearSetupState);
  const showSetupConnectionGuide =
    setupAssistMode === "connection" && !hasActiveConnection(connections);

  useEffect(() => {
    if (setupAssistMode === "connection" && hasActiveConnection(connections)) {
      clearSetupAssist();
    }
  }, [clearSetupAssist, connections, setupAssistMode]);

  return (
    <>
      <Suspense fallback={null}>
        <SettingsPage
          payload={payload}
          connections={connections}
          syncState={syncState}
          onStartSync={startSync}
          onSaveConnection={async (input: GitLabConnectionInput) => {
            const saved = await saveGitLabConnection(input);
            await refreshConnections();
            return saved;
          }}
          onSavePat={async (host: string, token: string) => {
            const saved = await saveGitLabPat(host, token);
            await refreshConnections();
            return saved;
          }}
          onBeginOAuth={beginGitLabOAuth}
          onResolveCallback={(sessionId: string, callbackUrl: string) =>
            resolveGitLabOAuthCallback({ sessionId, callbackUrl })
          }
          onValidateToken={validateGitLabToken}
          onListenOAuthEvents={listenForGitLabOAuthCallback}
          onCheckForUpdates={checkForAppUpdateChannel}
          onInstallUpdate={downloadAndInstallAppUpdate}
          onRestartToUpdate={restartApp}
          onUpdateSchedule={updateSchedule}
          onRefreshBootstrap={refreshPayload}
          onResetAllData={async () => {
            await resetAllData();
            clearStartupAppSnapshot();
            await clearSetupProgress();
            globalThis.location.reload();
          }}
        />
      </Suspense>
      {showSetupConnectionGuide ? (
        <Suspense fallback={null}>
          <SetupConnectionGuide active onFinish={clearSetupAssist} />
        </Suspense>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  App (entry point)                                                  */
/* ------------------------------------------------------------------ */

export default function App({
  routerInstance,
}: {
  routerInstance?: typeof router;
} = {}) {
  const lifecycle = useAppStore((state) => state.lifecycle);
  const bootstrap = useAppStore((state) => state.bootstrap);
  const motionPreference = useAppStore((state) => state.motionPreference);
  const logBoot = useCallback((message: string) => {
    const elapsed = getBootElapsedMs();
    void logFrontendBootTiming(`[app] ${message}`, elapsed).catch(() => {
      // best effort logging only
    });
  }, []);

  useEffect(() => {
    logBoot("theme apply effect started");
    applyTheme(readStartupPrefs().themeMode);
  }, [logBoot]);

  useEffect(() => {
    logBoot("bootstrap effect started");
    const start = performance.now();

    void bootstrap()
      .then(() => {
        logBoot(`bootstrap effect resolved in ${Math.round(performance.now() - start)}ms`);
      })
      .catch(() => {
        logBoot(`bootstrap effect rejected in ${Math.round(performance.now() - start)}ms`);
      });
  }, [bootstrap, logBoot]);

  useEffect(() => {
    logBoot(`lifecycle changed to ${lifecycle.phase}`);
  }, [lifecycle.phase, logBoot]);

  useEffect(() => {
    if (lifecycle.phase !== "ready") return;

    const { loggedHours, targetHours } = lifecycle.payload.today;
    void updateTrayIcon(loggedHours, targetHours);
  }, [lifecycle]);

  useEffect(() => {
    if (lifecycle.phase !== "ready") {
      return;
    }

    logBoot("ready lifecycle prefetch started");
    const start = performance.now();

    prefetchWorklogSnapshots(lifecycle.payload, useAppStore.getState().syncVersion);
    void prefetchPlaySnapshot();
    void import("@/features/worklog/worklog-page");
    void import("@/features/settings/settings-page");
    void import("@/features/play/play-layout");
    void import("@/features/play/play-route-pages");
    logBoot(`ready lifecycle prefetch queued in ${Math.round(performance.now() - start)}ms`);
  }, [lifecycle, logBoot]);

  if (lifecycle.phase === "error") {
    return <AppErrorState error={lifecycle.error} />;
  }

  return (
    <MotionProvider motionPreference={motionPreference}>
      <LazyMotion features={domAnimation} strict>
        <TooltipProvider>
          <RouterProvider router={routerInstance ?? router} />
        </TooltipProvider>
        <Toaster />
      </LazyMotion>
    </MotionProvider>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared loading / error states                                      */
/* ------------------------------------------------------------------ */

function AppErrorState({ error }: Readonly<{ error: string }>) {
  const { t } = useI18n();

  return (
    <main className="min-h-screen bg-page-canvas text-foreground">
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="font-display text-base font-semibold text-foreground">
          {t("app.failedToLoad")}
        </p>
        <p className="max-w-md text-center text-sm text-muted-foreground">{error}</p>
        <Button size="sm" onClick={() => globalThis.location.reload()}>
          {t("common.retry")}
        </Button>
      </div>
      <Toaster />
    </main>
  );
}
