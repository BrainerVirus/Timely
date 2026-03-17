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
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { NavRail } from "@/components/layout/nav-rail";
import { AboutDialog } from "@/components/shared/about-dialog";
import { TopBar } from "@/components/layout/top-bar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HomePage } from "@/features/home/home-page";
import { OnboardingFlow } from "@/features/onboarding/onboarding-flow";
import { SetupConnectionGuide } from "@/features/onboarding/setup-connection-guide";
import { getSetupStepPath } from "@/features/setup/setup-flow";
import { buildInfo } from "@/lib/build-info";
import { useI18n } from "@/lib/i18n";
import {
  beginGitLabOAuth,
  listenForGitLabOAuthCallback,
  listenDesktopEvent,
  resolveGitLabOAuthCallback,
  resetAllData,
  saveGitLabConnection,
  saveGitLabPat,
  updateSchedule,
  updateTrayIcon,
  validateGitLabToken,
} from "@/lib/tauri";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { hasActiveConnection } from "@/types/dashboard";
import { RouteLoadingState } from "./loading-states";
import {
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  syncState: SyncState;
}) {
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
        closeButtonClassName="top-3.5 right-5"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          scrollRef.current?.focus();
        }}
      >
        <DialogHeader className="border-b-2 border-[color:var(--color-border-subtle)] px-5 py-3.5 pr-16">
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
          className="flex-1 overflow-y-auto overscroll-contain scroll-smooth bg-[color:var(--color-field)] p-4 font-mono text-xs leading-relaxed outline-none"
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
/*  Lazy page imports                                                  */
/* ------------------------------------------------------------------ */

const WorklogPage = lazy(() =>
  import("@/features/worklog/worklog-page").then((mod) => ({ default: mod.WorklogPage })),
);
const PlayLayout = lazy(() =>
  import("@/features/play/play-layout").then((mod) => ({ default: mod.PlayLayout })),
);
const PlayOverviewPage = lazy(() =>
  import("@/features/play/play-route-pages").then((mod) => ({ default: mod.PlayOverviewPage })),
);
const PlayShopPage = lazy(() =>
  import("@/features/play/play-route-pages").then((mod) => ({ default: mod.PlayShopPage })),
);
const PlayCollectionPage = lazy(() =>
  import("@/features/play/play-route-pages").then((mod) => ({ default: mod.PlayCollectionPage })),
);
const PlayMissionsPage = lazy(() =>
  import("@/features/play/play-route-pages").then((mod) => ({ default: mod.PlayMissionsPage })),
);
const PlayAchievementsPage = lazy(() =>
  import("@/features/play/play-route-pages").then((mod) => ({ default: mod.PlayAchievementsPage })),
);
const SettingsPage = lazy(() =>
  import("@/features/settings/settings-page").then((mod) => ({ default: mod.SettingsPage })),
);

/* ------------------------------------------------------------------ */
/*  Route definitions                                                  */
/* ------------------------------------------------------------------ */

const rootRoute = createRootRoute({ component: AppShell });

const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: HomeRoute });
const worklogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/worklog",
  component: WorklogRoute,
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
  component: SetupIndexRoute,
});
const setupWelcomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/setup/welcome",
  component: SetupWelcomeRouteComponent,
});
const setupProviderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/setup/provider",
  component: SetupProviderRouteComponent,
});
const setupScheduleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/setup/schedule",
  component: SetupScheduleRouteComponent,
});
const setupSyncRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/setup/sync",
  component: SetupSyncRouteComponent,
});
const setupDoneRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/setup/done",
  component: SetupDoneRouteComponent,
});

const playRouteChildren = buildInfo.playEnabled
  ? [playIndexRoute, playShopRoute, playCollectionRoute, playMissionsRoute, playAchievementsRoute]
  : [];

interface WorklogRouteSearch {
  mode?: WorklogMode;
  detailDate?: string;
}

const routeTree = rootRoute.addChildren([
  homeRoute,
  worklogRoute,
  playRoute.addChildren(playRouteChildren),
  settingsRoute,
  setupRoute,
  setupWelcomeRoute,
  setupProviderRoute,
  setupScheduleRoute,
  setupSyncRoute,
  setupDoneRoute,
]);

export const router = createRouter({
  routeTree,
  history: createMemoryHistory({ initialEntries: ["/"] }),
});

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

/* ------------------------------------------------------------------ */
/*  Page title mapping                                                 */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  AppShell                                                           */
/* ------------------------------------------------------------------ */

function AppShell() {
  const { t } = useI18n();
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
  const navigate = useNavigate();
  const location = useRouterState({ select: (s) => s.location.pathname });
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  const isSetupRoute = location.startsWith("/setup");

  const currentPath = location.startsWith("/play")
    ? buildInfo.playEnabled
      ? "/play"
      : "/"
    : location.startsWith("/worklog")
      ? "/worklog"
      : location.startsWith("/settings")
        ? "/settings"
        : "/";
  const pageTitle =
    currentPath === "/"
      ? t("common.home")
      : currentPath === "/worklog"
        ? t("common.worklog")
        : currentPath === "/play"
          ? t("common.play")
          : currentPath === "/settings"
            ? t("common.settings")
            : t("app.name");
  const syncStatus = deriveSyncStatus(syncState.status, lastSyncedAt);

  const handleNavigate = useCallback(
    (path: string) => {
      navigate({ to: path });
    },
    [navigate],
  );

  const prevSyncStatusRef = useRef<SyncState["status"]>(syncState.status);

  useEffect(() => {
    const prev = prevSyncStatusRef.current;
    prevSyncStatusRef.current = syncState.status;

    // Only fire toasts when genuinely transitioning away from "syncing"
    if (prev !== "syncing") return;

    // Suppress toasts when the user is already on the settings page —
    // the inline sync row there gives direct feedback.
    const onSettingsPage = location === "/settings";

    if (syncState.status === "done") {
      setLastSyncedAt(new Date());
      if (lastSyncWasManual && !onSettingsPage) {
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
      if (lastSyncWasManual && !onSettingsPage) {
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
  }, [lastSyncWasManual, location, syncState, t]);

  const startSyncRef = useRef(startSync);
  startSyncRef.current = startSync;
  const autoSyncEnabledRef = useRef(autoSyncEnabled);
  autoSyncEnabledRef.current = autoSyncEnabled;
  const autoSyncIntervalRef = useRef(autoSyncIntervalMinutes);
  autoSyncIntervalRef.current = autoSyncIntervalMinutes;

  useEffect(() => {
    if (!autoSyncEnabled) return;
    const ms = autoSyncIntervalMinutes * 60 * 1000;
    const interval = setInterval(() => {
      if (autoSyncEnabledRef.current) {
        startSyncRef.current(false); // silent — no toast
      }
    }, ms);
    return () => clearInterval(interval);
  }, [autoSyncEnabled, autoSyncIntervalMinutes]);

  useEffect(() => {
    let disposeSettings = () => {};
    let disposeAbout = () => {};

    void (async () => {
      disposeSettings = await listenDesktopEvent<boolean>("open-settings", () => {
        navigate({ to: "/settings" });
      });

      disposeAbout = await listenDesktopEvent<boolean>("open-about", () => {
        setAboutOpen(true);
      });
    })();

    return () => {
      disposeSettings();
      disposeAbout();
    };
  }, [navigate]);

  if (isSetupRoute) {
    return (
      <main className="min-h-screen bg-[color:var(--color-page-canvas)] text-foreground">
        <Outlet />
      </main>
    );
  }

  if (!setupState.isComplete) {
    return (
      <main className="min-h-screen bg-[color:var(--color-page-canvas)] text-foreground">
        <Navigate to={getSetupStepPath(setupState.currentStep)} />
      </main>
    );
  }

  return (
    <main className="flex h-screen bg-linear-to-br from-[color:var(--color-app-frame)] via-[color:var(--color-app-bar)] to-[color:var(--color-page-canvas)] text-foreground">
      <NavRail currentPath={currentPath} onNavigate={handleNavigate} syncStatus={syncStatus} />

      <div className="flex flex-1 flex-col overflow-hidden border-l border-white/20">
        <TopBar
          title={pageTitle}
          lastSyncedAt={lastSyncedAt}
          syncing={syncState.status === "syncing"}
          onSync={() => void startSync(true)}
        />

        <div className="flex-1 overflow-y-auto overscroll-contain scroll-smooth bg-[color:var(--color-page-canvas)]">
          <div className="@container min-h-full bg-[color:var(--color-page-canvas)] p-6">
            <Outlet />
          </div>
        </div>
      </div>

      {setupState.isComplete &&
        setupAssistMode === "none" &&
        buildInfo.onboardingTourEnabled &&
        !onboardingCompleted && <OnboardingFlow onNavigate={handleNavigate} />}

      {/* Sync log dialog — opened from the toast "View log" action */}
      <SyncLogDialog open={syncLogOpen} onOpenChange={setSyncLogOpen} syncState={syncState} />
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
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
  const { t } = useI18n();
  const payload = usePayload();
  const navigate = useNavigate();
  const syncVersion = useAppStore((s) => s.syncVersion);
  const search = worklogRoute.useSearch() as WorklogRouteSearch;
  const mode =
    search.mode === "month" || search.mode === "range" ? "period" : (search.mode ?? "day");
  const detailDate = parseWorklogDetailDate(search.detailDate);

  return (
    <Suspense fallback={<RouteLoadingState label={t("app.loadingWorklog")} />}>
      <WorklogPage
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
  const { t } = useI18n();
  const navigate = useNavigate();
  if (!buildInfo.playEnabled) {
    return <Navigate to="/" />;
  }

  return (
    <Suspense fallback={<RouteLoadingState label={t("app.loadingPlayCenter")} />}>
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
  const { t } = useI18n();
  const payload = usePayload();
  if (!buildInfo.playEnabled) {
    return <Navigate to="/" />;
  }

  return (
    <Suspense fallback={<RouteLoadingState label={t("app.loadingPlayCenter")} />}>
      <PlayLayout payload={payload} />
    </Suspense>
  );
}

function PlayShopRoute() {
  const { t } = useI18n();
  if (!buildInfo.playEnabled) {
    return <Navigate to="/" />;
  }

  return (
    <Suspense fallback={<RouteLoadingState label={t("app.loadingPlayCenter")} />}>
      <PlayShopPage />
    </Suspense>
  );
}

function PlayCollectionRoute() {
  const { t } = useI18n();
  if (!buildInfo.playEnabled) {
    return <Navigate to="/" />;
  }

  return (
    <Suspense fallback={<RouteLoadingState label={t("app.loadingPlayCenter")} />}>
      <PlayCollectionPage />
    </Suspense>
  );
}

function PlayMissionsRoute() {
  const { t } = useI18n();
  if (!buildInfo.playEnabled) {
    return <Navigate to="/" />;
  }

  return (
    <Suspense fallback={<RouteLoadingState label={t("app.loadingPlayCenter")} />}>
      <PlayMissionsPage />
    </Suspense>
  );
}

function PlayAchievementsRoute() {
  const { t } = useI18n();
  if (!buildInfo.playEnabled) {
    return <Navigate to="/" />;
  }

  return (
    <Suspense fallback={<RouteLoadingState label={t("app.loadingPlayCenter")} />}>
      <PlayAchievementsPage />
    </Suspense>
  );
}

function SettingsRoute() {
  const { t } = useI18n();
  const payload = usePayload();
  const connections = useAppStore((s) => s.connections);
  const setupAssistMode = useAppStore((s) => s.setupAssistMode);
  const clearSetupAssist = useAppStore((s) => s.clearSetupAssist);
  const refreshConnections = useAppStore((s) => s.refreshConnections);
  const refreshPayload = useAppStore((s) => s.refreshPayload);
  const syncState = useAppStore((s) => s.syncState);
  const startSync = useAppStore((s) => s.startSync);
  const clearSetupProgress = useAppStore((s) => s.clearSetupState);

  useEffect(() => {
    if (setupAssistMode === "connection" && hasActiveConnection(connections)) {
      clearSetupAssist();
    }
  }, [clearSetupAssist, connections, setupAssistMode]);

  return (
    <Suspense fallback={<RouteLoadingState label={t("app.loadingSettings")} />}>
      <>
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
          onUpdateSchedule={updateSchedule}
          onRefreshBootstrap={refreshPayload}
          onResetAllData={async () => {
            await resetAllData();
            await clearSetupProgress();
            window.location.reload();
          }}
        />
        <SetupConnectionGuide
          active={setupAssistMode === "connection" && !hasActiveConnection(connections)}
          onFinish={clearSetupAssist}
        />
      </>
    </Suspense>
  );
}

/* ------------------------------------------------------------------ */
/*  App (entry point)                                                  */
/* ------------------------------------------------------------------ */

export default function App() {
  const lifecycle = useAppStore((state) => state.lifecycle);
  const bootstrap = useAppStore((state) => state.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (lifecycle.phase !== "ready") return;

    const interval = setInterval(() => {
      const { loggedHours, targetHours } = lifecycle.payload.today;
      updateTrayIcon(loggedHours, targetHours);
    }, 60_000);

    return () => clearInterval(interval);
  }, [lifecycle]);

  if (lifecycle.phase === "error") {
    return <AppErrorState error={lifecycle.error} />;
  }

  if (lifecycle.phase === "loading") {
    return <AppLoadingState />;
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
      <Toaster />
    </LazyMotion>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared loading / error states                                      */
/* ------------------------------------------------------------------ */

function AppErrorState({ error }: { error: string }) {
  const { t } = useI18n();

  return (
    <main className="min-h-screen bg-[color:var(--color-page-canvas)] text-foreground">
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="font-display text-base font-semibold text-foreground">
          {t("app.failedToLoad")}
        </p>
        <p className="max-w-md text-center text-sm text-muted-foreground">{error}</p>
        <Button size="sm" onClick={() => window.location.reload()}>
          {t("common.retry")}
        </Button>
      </div>
      <Toaster />
    </main>
  );
}

function AppLoadingState() {
  const { t } = useI18n();

  return (
    <main className="min-h-screen bg-[color:var(--color-page-canvas)] text-foreground">
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t("common.loadingApp")}</p>
        </div>
      </div>
    </main>
  );
}
