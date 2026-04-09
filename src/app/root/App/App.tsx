import {
  Navigate,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
} from "@tanstack/react-router";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle.js";
import { LazyMotion, domAnimation } from "motion/react";
import { Suspense, lazy, useCallback, useEffect } from "react";
import { getBootElapsedMs } from "@/app/bootstrap/BootTiming/boot-timing";
import { buildInfo } from "@/app/bootstrap/BuildInfo/build-info";
import { clearStartupAppSnapshot } from "@/app/bootstrap/StartupAppState/startup-app-state";
import { readStartupPrefs } from "@/app/bootstrap/StartupPrefs/startup-prefs";
import {
  beginGitLabOAuth,
  checkForAppUpdateChannel,
  downloadAndInstallAppUpdate,
  logFrontendBootTiming,
  listenForGitLabOAuthCallback,
  restartApp,
  resolveGitLabOAuthCallback,
  resetAllData,
  saveGitLabConnection,
  saveGitLabPat,
  updateSchedule,
  updateTrayIcon,
  validateGitLabToken,
} from "@/app/desktop/TauriService/tauri";
import { MainLayout } from "@/app/layouts/MainLayout/MainLayout";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { MotionProvider } from "@/app/providers/MotionService/motion";
import { applyTheme } from "@/app/providers/use-theme/use-theme";
import { validateSetupScheduleSearch } from "@/app/routes/SetupRoutes/setup-schedule-search";
import {
  SetupLayoutRoute,
  SetupDoneRouteComponent,
  SetupIndexRoute,
  SetupProviderRouteComponent,
  SetupScheduleRouteComponent,
  SetupSyncRouteComponent,
  SetupWelcomeRouteComponent,
} from "@/app/routes/SetupRoutes/SetupRoutes";
import { useAppStore } from "@/app/state/AppStore/app-store";
import { HomePage } from "@/features/home/screens/HomePage/HomePage";
import { getIssueRouteReference } from "@/features/issues/lib/issue-reference";
import { prefetchPlaySnapshot } from "@/features/play/services/play-snapshot-cache/play-snapshot-cache";
import { prefetchWorklogSnapshots } from "@/features/worklog/hooks/use-worklog-page-state/use-worklog-page-state";
import { hasActiveConnection } from "@/shared/types/dashboard";
import { Button } from "@/shared/ui/Button/Button";
import { Toaster } from "@/shared/ui/Toaster/Toaster";
import { TooltipProvider } from "@/shared/ui/Tooltip/Tooltip";

import type {
  BootstrapPayload,
  GitLabConnectionInput,
  WorklogMode,
} from "@/shared/types/dashboard";

/* ------------------------------------------------------------------ */
/*  Route definitions                                                  */
/* ------------------------------------------------------------------ */

const rootRoute = createRootRoute({ component: MainLayout });

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
const issuesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/issues",
  component: IssuesRoute,
});

const issuesHubRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/issues/hub",
  validateSearch: (search: Record<string, unknown>) => ({
    provider: typeof search.provider === "string" ? search.provider : "",
    issueId: typeof search.issueId === "string" ? search.issueId : "",
  }),
  component: IssuesHubRouteComponent,
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
  validateSearch: (search: Record<string, unknown>) => validateSetupScheduleSearch(search),
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

const SetupConnectionGuide = lazy(async () => {
  const module =
    await import("@/features/onboarding/screens/SetupConnectionGuide/SetupConnectionGuide");
  return { default: module.SetupConnectionGuide };
});

const WorklogPage = lazy(async () => {
  const module = await import("@/features/worklog/screens/WorklogPage/WorklogPage");
  return { default: module.WorklogPage };
});

const IssuesBoardPage = lazy(async () => {
  const module = await import("@/features/issues/screens/IssuesBoardPage/IssuesBoardPage");
  return { default: module.IssuesBoardPage };
});

const IssueHubPage = lazy(async () => {
  const module = await import("@/features/issues/screens/IssueHubPage/IssueHubPage");
  return { default: module.IssueHubPage };
});

const SettingsPage = lazy(async () => {
  const module = await import("@/features/settings/screens/SettingsPage/SettingsPage");
  return { default: module.SettingsPage };
});

const PlayLayout = lazy(async () => {
  const module = await import("@/features/play/screens/PlayLayout/PlayLayout");
  return { default: module.PlayLayout };
});

const PlayOverviewPage = lazy(async () => {
  const module = await import("@/features/play/screens/PlayOverviewPage/PlayOverviewPage");
  return { default: module.PlayOverviewPage };
});

const PlayShopPage = lazy(async () => {
  const module = await import("@/features/play/screens/PlayShopPage/PlayShopPage");
  return { default: module.PlayShopPage };
});

const PlayCollectionPage = lazy(async () => {
  const module = await import("@/features/play/screens/PlayCollectionPage/PlayCollectionPage");
  return { default: module.PlayCollectionPage };
});

const PlayMissionsPage = lazy(async () => {
  const module = await import("@/features/play/screens/PlayMissionsPage/PlayMissionsPage");
  return { default: module.PlayMissionsPage };
});

const PlayAchievementsPage = lazy(async () => {
  const module = await import("@/features/play/screens/PlayAchievementsPage/PlayAchievementsPage");
  return { default: module.PlayAchievementsPage };
});

interface WorklogRouteSearch {
  mode?: WorklogMode;
  detailDate?: string;
}

const routeTree = rootRoute.addChildren([
  homeRoute,
  worklogRoute,
  issuesHubRoute,
  issuesRoute,
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

/* ------------------------------------------------------------------ */
/*  Main route components                                              */
/* ------------------------------------------------------------------ */

function HomeRoute() {
  const payload = usePayload();
  const navigate = useNavigate();
  const connections = useAppStore((state) => state.connections);
  const requestSetupAssist = useAppStore((state) => state.requestSetupAssist);
  const connected = hasActiveConnection(connections);

  return (
    <HomePage
      payload={payload}
      needsSetup={!connected}
      onOpenSetup={() => {
        requestSetupAssist("connection");
        navigate({ to: "/settings" });
      }}
      onOpenWorklog={(mode) => navigate({ to: "/worklog", search: { mode } })}
      onOpenIssuesBoard={connected ? () => navigate({ to: "/issues" }) : undefined}
      onOpenIssue={
        connected
          ? (issue) =>
              void navigate({
                to: "/issues/hub",
                search: getIssueRouteReference(issue),
              })
          : undefined
      }
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

function IssuesRoute() {
  return (
    <Suspense fallback={null}>
      <IssuesBoardPage />
    </Suspense>
  );
}

function IssuesHubRouteComponent() {
  const payload = usePayload();
  const refreshPayload = useAppStore((s) => s.refreshPayload);
  const navigate = useNavigate();
  const { provider, issueId } = issuesHubRoute.useSearch();

  return (
    <Suspense fallback={null}>
      <IssueHubPage
        payload={payload}
        issueReference={{ provider, issueId }}
        onBack={() => void navigate({ to: "/issues" })}
        onRefreshBootstrap={refreshPayload}
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
    void import("@/features/worklog/screens/WorklogPage/WorklogPage");
    void import("@/features/settings/screens/SettingsPage/SettingsPage");
    void import("@/features/play/screens/PlayLayout/PlayLayout");
    void import("@/features/play/screens/PlayOverviewPage/PlayOverviewPage");
    void import("@/features/play/screens/PlayShopPage/PlayShopPage");
    void import("@/features/play/screens/PlayCollectionPage/PlayCollectionPage");
    void import("@/features/play/screens/PlayMissionsPage/PlayMissionsPage");
    void import("@/features/play/screens/PlayAchievementsPage/PlayAchievementsPage");
    logBoot(`ready lifecycle prefetch queued in ${Math.round(performance.now() - start)}ms`);
  }, [lifecycle, logBoot]);

  if (lifecycle.phase === "error") {
    return <AppErrorState error={lifecycle.error} />;
  }

  return (
    <MotionProvider>
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
