import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import {
  Navigate,
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useMatchRoute,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { LazyMotion, domAnimation } from "motion/react";
import { lazy, Suspense, useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { NavRail } from "@/components/layout/nav-rail";
import { TopBar } from "@/components/layout/top-bar";
import { HomePage } from "@/features/home/home-page";
import {
  createInitialScheduleFormState,
  formatNetHours,
  scheduleFormReducer,
} from "@/features/preferences/schedule-form";
import { isOnboardingComplete, OnboardingFlow } from "@/features/onboarding/onboarding-flow";
import { getSetupStepPath } from "@/features/setup/setup-flow";
import type { WorklogMode } from "@/features/worklog/worklog-page";
import {
  beginGitLabOAuth,
  listenForGitLabOAuthCallback,
  resolveGitLabOAuthCallback,
  resetAllData,
  saveGitLabConnection,
  saveGitLabPat,
  updateSchedule,
  updateTrayIcon,
  validateGitLabToken,
} from "@/lib/tauri";
import { useAppStore } from "@/stores/app-store";
import type { BootstrapPayload, GitLabConnectionInput, ProviderConnection, ScheduleInput, SyncState } from "@/types/dashboard";

/* ------------------------------------------------------------------ */
/*  Lazy page imports                                                  */
/* ------------------------------------------------------------------ */

const WorklogPage = lazy(() =>
  import("@/features/worklog/worklog-page").then((mod) => ({ default: mod.WorklogPage })),
);
const PlayPage = lazy(() =>
  import("@/features/play/play-page").then((mod) => ({ default: mod.PlayPage })),
);
const SettingsPage = lazy(() =>
  import("@/features/settings/settings-page").then((mod) => ({ default: mod.SettingsPage })),
);
const SetupDonePage = lazy(() =>
  import("@/features/setup/setup-done-page").then((mod) => ({ default: mod.SetupDonePage })),
);
const SetupProviderPage = lazy(() =>
  import("@/features/setup/setup-provider-page").then((mod) => ({ default: mod.SetupProviderPage })),
);
const SetupSchedulePage = lazy(() =>
  import("@/features/setup/setup-schedule-page").then((mod) => ({ default: mod.SetupSchedulePage })),
);
const SetupSyncPage = lazy(() =>
  import("@/features/setup/setup-sync-page").then((mod) => ({ default: mod.SetupSyncPage })),
);
const SetupWelcomePage = lazy(() =>
  import("@/features/setup/setup-welcome-page").then((mod) => ({ default: mod.SetupWelcomePage })),
);

/* ------------------------------------------------------------------ */
/*  Route definitions                                                  */
/* ------------------------------------------------------------------ */

const rootRoute = createRootRoute({ component: AppShell });

const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: HomeRoute });
const worklogRoute = createRoute({ getParentRoute: () => rootRoute, path: "/worklog", component: WorklogRoute });
const playRoute = createRoute({ getParentRoute: () => rootRoute, path: "/play", component: PlayRoute });
const settingsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/settings", component: SettingsRoute });
const setupRoute = createRoute({ getParentRoute: () => rootRoute, path: "/setup", component: SetupIndexRoute });
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

const routeTree = rootRoute.addChildren([
  homeRoute,
  worklogRoute,
  playRoute,
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

  if (lifecycle.phase !== "ready") {
    throw new Error("usePayload called before ready");
  }

  return lifecycle.payload;
}

function getNeedsSetup(connections: ProviderConnection[]) {
  return connections.length === 0 || !connections.some((c) => c.hasToken || c.clientId);
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

const PAGE_TITLES: Record<string, string> = {
  "/": "Home",
  "/worklog": "Worklog",
  "/play": "Play",
  "/settings": "Settings",
};

/* ------------------------------------------------------------------ */
/*  Auto-polling interval (ms)                                         */
/* ------------------------------------------------------------------ */

const AUTO_POLL_INTERVAL_MS = 15 * 60 * 1000;

/* ------------------------------------------------------------------ */
/*  AppShell                                                           */
/* ------------------------------------------------------------------ */

function AppShell() {
  const setupState = useAppStore((s) => s.setupState);
  const syncState = useAppStore((s) => s.syncState);
  const startSync = useAppStore((s) => s.startSync);
  const navigate = useNavigate();
  const location = useRouterState({ select: (s) => s.location.pathname });
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const isSetupRoute = location.startsWith("/setup");

  // Determine current nav path for NavRail
  const matchRoute = useMatchRoute();
  const currentPath = ["/", "/worklog", "/play", "/settings"].find((p) => matchRoute({ to: p })) ?? "/";

  const pageTitle = PAGE_TITLES[currentPath] ?? "Pulseboard";

  // Sync status for NavRail dot
  const syncStatus = deriveSyncStatus(syncState.status, lastSyncedAt);

  // View transition navigation
  const handleNavigate = useCallback(
    (path: string) => {
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          navigate({ to: path });
        });
      } else {
        navigate({ to: path });
      }
    },
    [navigate],
  );

  // Track last synced time
  useEffect(() => {
    if (syncState.status === "done") {
      setLastSyncedAt(new Date());
    }
  }, [syncState.status]);

  // Auto-polling: trigger a sync on a regular interval when not already syncing
  const startSyncRef = useRef(startSync);
  startSyncRef.current = startSync;

  useEffect(() => {
    const interval = setInterval(() => {
      startSyncRef.current();
    }, AUTO_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // Setup routes get a different shell (no nav rail)
  if (isSetupRoute) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <Outlet />
      </main>
    );
  }

  // Force new users into setup wizard
  if (!setupState.isComplete) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <Navigate to={getSetupStepPath(setupState.currentStep)} />
      </main>
    );
  }

  return (
    <main className="flex h-screen bg-background text-foreground">
      <NavRail currentPath={currentPath} onNavigate={handleNavigate} syncStatus={syncStatus} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          title={pageTitle}
          lastSyncedAt={lastSyncedAt}
          syncing={syncState.status === "syncing"}
          onSync={startSync}
        />

        <div className="flex-1 overflow-y-auto" style={{ viewTransitionName: "page" }}>
          <div className="p-6">
            <Outlet />
          </div>
        </div>
      </div>

      {/* Driver.js tour - renders after setup is complete */}
      {setupState.isComplete && !isOnboardingComplete() && (
        <OnboardingFlow onNavigate={handleNavigate} />
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Route components                                                   */
/* ------------------------------------------------------------------ */

function HomeRoute() {
  const payload = usePayload();
  const navigate = useNavigate();
  const connections = useAppStore((state) => state.connections);
  const setupState = useAppStore((state) => state.setupState);
  const needsSetup = getNeedsSetup(connections);

  return (
    <HomePage
      payload={payload}
      needsSetup={needsSetup}
      onOpenSetup={() => navigate({ to: getSetupStepPath(setupState.currentStep) })}
    />
  );
}

function WorklogRoute() {
  const payload = usePayload();
  const navigate = useNavigate();
  const search = worklogRoute.useSearch() as { mode?: WorklogMode };
  const mode = search.mode ?? "day";

  return (
    <Suspense fallback={<RouteLoadingState label="Loading worklog" />}>
      <WorklogPage
        payload={payload}
        mode={mode}
        onModeChange={(nextMode) => navigate({ to: "/worklog", search: { mode: nextMode } })}
      />
    </Suspense>
  );
}

function PlayRoute() {
  const payload = usePayload();
  return (
    <Suspense fallback={<RouteLoadingState label="Loading play center" />}>
      <PlayPage payload={payload} />
    </Suspense>
  );
}

function SettingsRoute() {
  const payload = usePayload();
  const connections = useAppStore((s) => s.connections);
  const refreshConnections = useAppStore((s) => s.refreshConnections);
  const refreshPayload = useAppStore((s) => s.refreshPayload);
  const syncState = useAppStore((s) => s.syncState);
  const startSync = useAppStore((s) => s.startSync);
  const clearSetupProgress = useAppStore((s) => s.clearSetupState);

  return (
    <Suspense fallback={<RouteLoadingState label="Loading settings" />}>
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
    </Suspense>
  );
}

/* ------------------------------------------------------------------ */
/*  Setup route components                                             */
/* ------------------------------------------------------------------ */

function SetupIndexRoute() {
  return <Navigate to="/setup/welcome" />;
}

function SetupWelcomeRouteComponent() {
  const navigate = useNavigate();
  const completeSetupStep = useAppStore((state) => state.completeSetupStep);
  const markSetupAsComplete = useAppStore((state) => state.markSetupComplete);

  return (
    <Suspense fallback={<RouteLoadingState label="Loading setup" />}>
      <SetupWelcomePage
        onNext={async () => {
          await completeSetupStep("welcome");
          navigate({ to: "/setup/schedule" });
        }}
        onSkip={async () => {
          await markSetupAsComplete();
          navigate({ to: "/" });
        }}
      />
    </Suspense>
  );
}

function SetupProviderRouteComponent() {
  const navigate = useNavigate();
  const connections = useAppStore((state) => state.connections);
  const refreshConnections = useAppStore((state) => state.refreshConnections);
  const completeSetupStep = useAppStore((state) => state.completeSetupStep);

  return (
    <Suspense fallback={<RouteLoadingState label="Loading provider setup" />}>
      <SetupProviderPage
        connections={connections}
        onBack={() => navigate({ to: "/setup/schedule" })}
        onNext={async () => {
          await completeSetupStep("provider");
          navigate({ to: "/setup/sync" });
        }}
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
      />
    </Suspense>
  );
}

function SetupScheduleRouteComponent() {
  const payload = usePayload();
  const navigate = useNavigate();
  const refreshPayload = useAppStore((state) => state.refreshPayload);
  const completeSetupStep = useAppStore((state) => state.completeSetupStep);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [scheduleForm, dispatchScheduleForm] = useReducer(
    scheduleFormReducer,
    payload,
    createInitialScheduleFormState,
  );
  const { shiftStart, shiftEnd, lunchMinutes, workdays, schedulePhase } = scheduleForm;
  const netHours = formatNetHours(shiftStart, shiftEnd, lunchMinutes);

  async function handleSaveSchedule(input: ScheduleInput) {
    dispatchScheduleForm({ type: "setSchedulePhase", phase: "saving" });

    try {
      await updateSchedule(input);
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "saved" });
      await refreshPayload();
    } catch (err) {
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "idle" });
      throw err;
    }
  }

  return (
    <Suspense fallback={<RouteLoadingState label="Loading schedule setup" />}>
      <SetupSchedulePage
        shiftStart={shiftStart}
        shiftEnd={shiftEnd}
        lunchMinutes={lunchMinutes}
        workdays={workdays}
        timezone={timezone}
        netHours={netHours}
        schedulePhase={schedulePhase}
        onBack={() => navigate({ to: "/setup/welcome" })}
        onNext={async () => {
          await completeSetupStep("schedule");
          navigate({ to: "/setup/provider" });
        }}
        onShiftStartChange={(value) => dispatchScheduleForm({ type: "setShiftStart", value })}
        onShiftEndChange={(value) => dispatchScheduleForm({ type: "setShiftEnd", value })}
        onLunchMinutesChange={(value) => dispatchScheduleForm({ type: "setLunchMinutes", value })}
        onToggleWorkday={(day) => dispatchScheduleForm({ type: "toggleWorkday", day })}
        onSave={handleSaveSchedule}
      />
    </Suspense>
  );
}

function SetupSyncRouteComponent() {
  const payload = usePayload();
  const navigate = useNavigate();
  const syncState = useAppStore((state) => state.syncState);
  const startSync = useAppStore((state) => state.startSync);
  const connections = useAppStore((state) => state.connections);
  const completeSetupStep = useAppStore((state) => state.completeSetupStep);
  const hasConnection = connections.some((c) => c.hasToken || c.clientId);

  return (
    <Suspense fallback={<RouteLoadingState label="Loading sync setup" />}>
      <SetupSyncPage
        payload={payload}
        syncState={syncState}
        hasConnection={hasConnection}
        onBack={() => navigate({ to: "/setup/provider" })}
        onNext={async () => {
          await completeSetupStep("sync");
          navigate({ to: "/setup/done" });
        }}
        onStartSync={startSync}
      />
    </Suspense>
  );
}

function SetupDoneRouteComponent() {
  const navigate = useNavigate();
  const markSetupAsComplete = useAppStore((state) => state.markSetupComplete);

  useEffect(() => {
    void markSetupAsComplete();
  }, [markSetupAsComplete]);

  return (
    <Suspense fallback={<RouteLoadingState label="Loading finish screen" />}>
      <SetupDonePage
        onOpenHome={() => navigate({ to: "/" })}
      />
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
      <RouterProvider router={router} />
      <Toaster />
    </LazyMotion>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared loading / error states                                      */
/* ------------------------------------------------------------------ */

function AppErrorState({ error }: { error: string }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="font-display text-base font-semibold text-foreground">Failed to load Pulseboard</p>
        <p className="max-w-md text-center text-sm text-muted-foreground">{error}</p>
        <Button size="sm" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
      <Toaster />
    </main>
  );
}

function AppLoadingState() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading Pulseboard</p>
        </div>
      </div>
    </main>
  );
}

function RouteLoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
