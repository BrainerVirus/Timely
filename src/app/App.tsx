import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import Terminal from "lucide-react/dist/esm/icons/terminal.js";
import { toast } from "sonner";
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
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NavRail } from "@/components/layout/nav-rail";
import { TopBar } from "@/components/layout/top-bar";
import { HomePage } from "@/features/home/home-page";
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
import type { BootstrapPayload, GitLabConnectionInput, SyncState } from "@/types/dashboard";
import { hasActiveConnection } from "@/types/dashboard";
import { cn } from "@/lib/utils";
import { RouteLoadingState } from "./loading-states";
import {
  SetupDoneRouteComponent,
  SetupIndexRoute,
  SetupProviderRouteComponent,
  SetupScheduleRouteComponent,
  SetupSyncRouteComponent,
  SetupWelcomeRouteComponent,
} from "./setup-routes";

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
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          scrollRef.current?.focus();
        }}
      >
        <DialogHeader className="border-b-2 border-border px-5 py-3.5 pr-14">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <DialogTitle className="font-display text-base font-semibold">Sync log</DialogTitle>
            {syncing && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
            {syncState.status === "done" && (
              <span className="ml-auto text-xs font-medium text-success">Done</span>
            )}
            {syncState.status === "error" && (
              <span className="ml-auto text-xs font-medium text-destructive">Failed</span>
            )}
          </div>
        </DialogHeader>

        <div
          ref={scrollRef}
          tabIndex={-1}
          className="flex-1 overflow-y-auto bg-muted/20 p-4 font-mono text-xs leading-relaxed outline-none"
        >
          {lines.length === 0 && syncing && (
            <p className="text-muted-foreground">Starting sync...</p>
          )}
          {lines.length === 0 && !syncing && (
            <p className="text-muted-foreground">No log entries yet. Start a sync first.</p>
          )}
          {lines.map(({ key, line, lineNumber }) => (
            <p key={key} className={cn("flex gap-3", syncLogLineClass(line))}>
              <span className="w-6 shrink-0 select-none text-right text-muted-foreground/40">
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
const PlayPage = lazy(() =>
  import("@/features/play/play-page").then((mod) => ({ default: mod.PlayPage })),
);
const SettingsPage = lazy(() =>
  import("@/features/settings/settings-page").then((mod) => ({ default: mod.SettingsPage })),
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

const PAGE_TITLES: Record<string, string> = {
  "/": "Home",
  "/worklog": "Worklog",
  "/play": "Play",
  "/settings": "Settings",
};

/* ------------------------------------------------------------------ */
/*  AppShell                                                           */
/* ------------------------------------------------------------------ */

function AppShell() {
  const setupState = useAppStore((s) => s.setupState);
  const syncState = useAppStore((s) => s.syncState);
  const lastSyncWasManual = useAppStore((s) => s.lastSyncWasManual);
  const startSync = useAppStore((s) => s.startSync);
  const autoSyncEnabled = useAppStore((s) => s.autoSyncEnabled);
  const autoSyncIntervalMinutes = useAppStore((s) => s.autoSyncIntervalMinutes);
  const syncLogOpen = useAppStore((s) => s.syncLogOpen);
  const setSyncLogOpen = useAppStore((s) => s.setSyncLogOpen);
  const navigate = useNavigate();
  const location = useRouterState({ select: (s) => s.location.pathname });
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const isSetupRoute = location.startsWith("/setup");

  const matchRoute = useMatchRoute();
  const currentPath = ["/", "/worklog", "/play", "/settings"].find((p) => matchRoute({ to: p })) ?? "/";
  const pageTitle = PAGE_TITLES[currentPath] ?? "Timely";
  const syncStatus = deriveSyncStatus(syncState.status, lastSyncedAt);

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
        toast.success("Sync complete", {
          description: `${result.projectsSynced} projects, ${result.entriesSynced} entries, ${result.issuesSynced} issues synced.`,
          duration: 8000,
          action: {
            label: "View log",
            onClick: () => useAppStore.getState().setSyncLogOpen(true),
          },
        });
      }
    } else if (syncState.status === "error") {
      if (lastSyncWasManual && !onSettingsPage) {
        toast.error("Sync failed", {
          description: syncState.error,
          duration: 10000,
          action: {
            label: "View log",
            onClick: () => useAppStore.getState().setSyncLogOpen(true),
          },
        });
      }
    }
  }, [syncState, lastSyncWasManual, location]);

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

  if (isSetupRoute) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <Outlet />
      </main>
    );
  }

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
          onSync={() => void startSync(true)}
        />

        <div className="flex-1 overflow-y-auto" style={{ viewTransitionName: "page" }}>
          <div className="@container p-6">
            <Outlet />
          </div>
        </div>
      </div>

      {setupState.isComplete && !isOnboardingComplete() && (
        <OnboardingFlow onNavigate={handleNavigate} />
      )}

      {/* Sync log dialog — opened from the toast "View log" action */}
      <SyncLogDialog open={syncLogOpen} onOpenChange={setSyncLogOpen} syncState={syncState} />
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
  const setupState = useAppStore((state) => state.setupState);

  return (
    <HomePage
      payload={payload}
      needsSetup={!hasActiveConnection(connections)}
      onOpenSetup={() => navigate({ to: getSetupStepPath(setupState.currentStep) })}
    />
  );
}

function WorklogRoute() {
  const payload = usePayload();
  const navigate = useNavigate();
  const syncVersion = useAppStore((s) => s.syncVersion);
  const search = worklogRoute.useSearch() as { mode?: WorklogMode };
  const mode = search.mode ?? "day";

  return (
    <Suspense fallback={<RouteLoadingState label="Loading worklog" />}>
      <WorklogPage
        payload={payload}
        mode={mode}
        syncVersion={syncVersion}
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
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="font-display text-base font-semibold text-foreground">Failed to load Timely</p>
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
          <p className="text-sm text-muted-foreground">Loading Timely</p>
        </div>
      </div>
    </main>
  );
}
