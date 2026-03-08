import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle.js";
import Compass from "lucide-react/dist/esm/icons/compass.js";
import Gamepad2 from "lucide-react/dist/esm/icons/gamepad-2.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import Radar from "lucide-react/dist/esm/icons/radar.js";
import Settings2 from "lucide-react/dist/esm/icons/settings-2.js";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.js";
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
import { AnimatePresence, LazyMotion, domAnimation, m } from "motion/react";
import { lazy, Suspense, useCallback, useEffect, useReducer } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { HomePage } from "@/features/home/home-page";
import {
  createInitialScheduleFormState,
  formatNetHours,
  scheduleFormReducer,
} from "@/features/preferences/schedule-form";
import { ProvidersPage } from "@/features/providers/providers-page";
import { getSetupStepPath } from "@/features/setup/setup-flow";
import type { WorklogMode } from "@/features/worklog/worklog-page";
import { pageTransition, pageVariants, sidebarVariants } from "@/lib/animations";
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
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";

import type { BootstrapPayload, GitLabConnectionInput, ScheduleInput } from "@/types/dashboard";

type ViewKey = "home" | "worklog" | "play" | "providers" | "preferences";

const PreferencesPage = lazy(() =>
  import("@/features/preferences/preferences-page").then((mod) => ({ default: mod.PreferencesPage })),
);
const PlayPage = lazy(() =>
  import("@/features/play/play-page").then((mod) => ({ default: mod.PlayPage })),
);
const WorklogPage = lazy(() =>
  import("@/features/worklog/worklog-page").then((mod) => ({ default: mod.WorklogPage })),
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

const navItems: Array<{ key: ViewKey; label: string; path: string; icon: typeof Compass }> = [
  { key: "home", label: "Home", path: "/", icon: Compass },
  { key: "worklog", label: "Worklog", path: "/worklog", icon: Radar },
  { key: "play", label: "Play", path: "/play", icon: Gamepad2 },
  { key: "providers", label: "Providers", path: "/providers", icon: ShieldCheck },
  { key: "preferences", label: "Preferences", path: "/preferences", icon: Settings2 },
];

const rootRoute = createRootRoute({ component: AppShell });

const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: HomeRoute });
const worklogRoute = createRoute({ getParentRoute: () => rootRoute, path: "/worklog", component: WorklogRoute });
const playRoute = createRoute({ getParentRoute: () => rootRoute, path: "/play", component: PlayRoute });
const providersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/providers",
  component: ProvidersRoute,
});
const preferencesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/preferences",
  component: PreferencesRoute,
});
const setupRoute = createRoute({ getParentRoute: () => rootRoute, path: "/setup", component: SetupIndexRoute });
const setupWelcomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/setup/welcome",
  component: SetupWelcomeRoute,
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
const weekRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/week",
  component: () => <Navigate to="/worklog" search={{ mode: "week" }} />,
});
const monthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/month",
  component: () => <Navigate to="/worklog" search={{ mode: "month" }} />,
});
const auditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/audit",
  component: () => <Navigate to="/worklog" search={{ mode: "review" }} />,
});
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: () => <Navigate to="/providers" />,
});
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: () => <Navigate to="/preferences" />,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  worklogRoute,
  playRoute,
  providersRoute,
  preferencesRoute,
  setupRoute,
  setupWelcomeRoute,
  setupProviderRoute,
  setupScheduleRoute,
  setupSyncRoute,
  setupDoneRoute,
  weekRoute,
  monthRoute,
  auditRoute,
  settingsRoute,
  profileRoute,
]);

const router = createRouter({
  routeTree,
  history: createMemoryHistory({ initialEntries: ["/"] }),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function usePayload(): BootstrapPayload {
  const lifecycle = useAppStore((state) => state.lifecycle);

  if (lifecycle.phase !== "ready") {
    throw new Error("usePayload called before ready");
  }

  return lifecycle.payload;
}

function HomeRoute() {
  const payload = usePayload();
  const navigate = useNavigate();
  const connections = useAppStore((state) => state.connections);
  const setupState = useAppStore((state) => state.setupState);
  const weekTotals = getWeekTotals(payload);
  const needsSetup = getNeedsSetup(connections);

  return (
    <HomePage
      payload={payload}
      weekTotals={weekTotals}
      needsSetup={needsSetup}
      onOpenSetup={() => navigate({ to: getSetupStepPath(setupState.currentStep) })}
      onOpenProviders={() => navigate({ to: "/providers" })}
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

function ProvidersRoute() {
  const payload = usePayload();
  const connections = useAppStore((state) => state.connections);
  const refreshConnections = useAppStore((state) => state.refreshConnections);
  const syncState = useAppStore((state) => state.syncState);
  const startSync = useAppStore((state) => state.startSync);

  return (
    <ProvidersPage
      payload={payload}
      connections={connections}
      syncState={syncState}
      onStartSync={startSync}
      onSaveConnection={async (input: GitLabConnectionInput) => {
        const saved = await saveGitLabConnection(input);
        await refreshConnections();
        return saved;
      }}
      onSavePat={async (host, token) => {
        const saved = await saveGitLabPat(host, token);
        await refreshConnections();
        return saved;
      }}
      onBeginOAuth={beginGitLabOAuth}
      onResolveCallback={(sessionId, callbackUrl) =>
        resolveGitLabOAuthCallback({ sessionId, callbackUrl })
      }
      onValidateToken={validateGitLabToken}
      onListenOAuthEvents={listenForGitLabOAuthCallback}
    />
  );
}

function PreferencesRoute() {
  const payload = usePayload();
  const connections = useAppStore((state) => state.connections);
  const refreshPayload = useAppStore((state) => state.refreshPayload);
  const clearSetupProgress = useAppStore((state) => state.clearSetupState);

  return (
    <Suspense fallback={<RouteLoadingState label="Loading preferences" />}>
      <PreferencesPage
        payload={payload}
        connections={connections}
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

function SetupIndexRoute() {
  return <Navigate to="/setup/welcome" />;
}

function SetupWelcomeRoute() {
  const navigate = useNavigate();
  const completeSetupStep = useAppStore((state) => state.completeSetupStep);
  const markSetupAsComplete = useAppStore((state) => state.markSetupComplete);

  return (
    <Suspense fallback={<RouteLoadingState label="Loading setup" />}>
      <SetupWelcomePage
        onNext={async () => {
          await completeSetupStep("welcome");
          navigate({ to: "/setup/provider" });
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
        onBack={() => navigate({ to: "/setup/welcome" })}
        onNext={async () => {
          await completeSetupStep("provider");
          navigate({ to: "/setup/schedule" });
        }}
        onSaveConnection={async (input: GitLabConnectionInput) => {
          const saved = await saveGitLabConnection(input);
          await refreshConnections();
          return saved;
        }}
        onSavePat={async (host, token) => {
          const saved = await saveGitLabPat(host, token);
          await refreshConnections();
          return saved;
        }}
        onBeginOAuth={beginGitLabOAuth}
        onResolveCallback={(sessionId, callbackUrl) =>
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
    } catch {
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "idle" });
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
        onBack={() => navigate({ to: "/setup/provider" })}
        onNext={async () => {
          await completeSetupStep("schedule");
          navigate({ to: "/setup/sync" });
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
  const completeSetupStep = useAppStore((state) => state.completeSetupStep);

  return (
    <Suspense fallback={<RouteLoadingState label="Loading sync setup" />}>
      <SetupSyncPage
        payload={payload}
        syncState={syncState}
        onBack={() => navigate({ to: "/setup/schedule" })}
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
  }, []);

  return (
    <Suspense fallback={<RouteLoadingState label="Loading finish screen" />}>
      <SetupDonePage
        onOpenHome={() => navigate({ to: "/" })}
        onOpenWorklog={() => navigate({ to: "/worklog" })}
        onOpenPlay={() => navigate({ to: "/play" })}
      />
    </Suspense>
  );
}

function AppShell() {
  const payload = usePayload();
  const connections = useAppStore((state) => state.connections);
  const setupState = useAppStore((state) => state.setupState);
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const location = useRouterState({ select: (state) => state.location.pathname });
  const currentPath = navItems.find((item) => matchRoute({ to: item.path }))?.path ?? "/";
  const needsSetup = getNeedsSetup(connections);
  const handleNavigate = useCallback((path: string) => navigate({ to: path }), [navigate]);
  const showSetupBanner = needsSetup && !setupState.isComplete && !location.startsWith("/setup");

  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <div className="relative flex min-h-screen w-full flex-col gap-6 p-4 lg:flex-row lg:p-6">
        <Sidebar payload={payload} currentPath={currentPath} onNavigate={handleNavigate} />

        <section className="min-w-0 flex-1">
          {showSetupBanner ? (
            <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-foreground">
              Welcome - the new setup flow is ready.
              <button
                type="button"
                onClick={() => navigate({ to: getSetupStepPath(setupState.currentStep) })}
                className="ml-2 cursor-pointer font-semibold text-primary underline underline-offset-4"
              >
                Finish setup
              </button>
            </div>
          ) : null}

          <AnimatePresence mode="wait">
            <m.div
              key={location}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <Outlet />
            </m.div>
          </AnimatePresence>
        </section>
      </div>
    </main>
  );
}

function Sidebar({
  payload,
  currentPath,
  onNavigate,
}: {
  payload: BootstrapPayload;
  currentPath: string;
  onNavigate: (path: string) => void;
}) {
  return (
    <m.aside
      variants={sidebarVariants}
      initial="initial"
      animate="animate"
      className="w-full shrink-0 lg:w-64"
    >
      <div className="sticky top-4 space-y-5">
        <Branding payload={payload} />
        <Navigation currentPath={currentPath} onNavigate={onNavigate} />
      </div>
    </m.aside>
  );
}

function Branding({ payload }: { payload: BootstrapPayload }) {
  return (
    <div className="space-y-3 rounded-3xl border border-border bg-card/90 p-4 shadow-card backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl border border-primary/20 bg-primary/10">
          <Radar className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-display text-lg font-semibold text-foreground">{payload.appName}</p>
          <p className="text-xs text-muted-foreground">Worklog companion</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge tone="low">Fresh desktop layout</Badge>
        {payload.demoMode ? <Badge tone="beta">Demo</Badge> : null}
      </div>
    </div>
  );
}

function Navigation({
  currentPath,
  onNavigate,
}: {
  currentPath: string;
  onNavigate: (path: string) => void;
}) {
  return (
    <nav className="space-y-1 rounded-3xl border border-border bg-card/90 p-2 shadow-card backdrop-blur-sm">
      {navItems.map((item) => {
        const active = currentPath === item.path;
        const Icon = item.icon;

        return (
          <m.button
            whileHover={{ x: 4, scale: 1.01 }}
            whileTap={{ scale: 0.985 }}
            key={item.key}
            className={cn(
              "relative flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            onClick={() => onNavigate(item.path)}
            type="button"
          >
            {active ? (
              <m.div
                className="absolute inset-0 rounded-2xl border border-primary/20 bg-primary/8"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              />
            ) : null}
            <m.div
              className="relative"
              animate={active ? { rotate: [0, -8, 0], scale: 1.06 } : { rotate: 0, scale: 1 }}
              transition={{ duration: 0.28 }}
            >
              <Icon className="h-4 w-4" />
            </m.div>
            <span className="relative">{item.label}</span>
          </m.button>
        );
      })}
    </nav>
  );
}

export default function App() {
  const lifecycle = useAppStore((state) => state.lifecycle);
  const bootstrap = useAppStore((state) => state.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (lifecycle.phase !== "ready") return;

    const interval = setInterval(() => {
      const remaining = lifecycle.payload.today.targetHours - lifecycle.payload.today.loggedHours;
      updateTrayIcon(Math.max(remaining, 0));
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

function getWeekTotals(payload: BootstrapPayload) {
  return payload.week.reduce(
    (totals, day) => ({
      logged: totals.logged + day.loggedHours,
      target: totals.target + day.targetHours,
    }),
    { logged: 0, target: 0 },
  );
}

function getNeedsSetup(connections: ReturnType<typeof useAppStore.getState>["connections"]) {
  return (
    connections.length === 0 || !connections.some((connection) => connection.hasToken || connection.clientId)
  );
}
