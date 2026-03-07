import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { AuditView } from "@/features/audit/audit-view";
import { MonthView } from "@/features/dashboard/month-view";
import { TodayView } from "@/features/dashboard/today-view";
import { WeekView } from "@/features/dashboard/week-view";
import { PilotCard } from "@/features/gamification/pilot-card";
import { QuestPanel } from "@/features/gamification/quest-panel";
import { SettingsView } from "@/features/settings/settings-view";
import { useBootstrap } from "@/hooks/use-bootstrap";
import { useNotify } from "@/hooks/use-notify";
import {
  pageTransition,
  pageVariants,
  sidebarVariants,
} from "@/lib/animations";
import {
  beginGitLabOAuth,
  listenForGitLabOAuthCallback,
  resolveGitLabOAuthCallback,
  saveGitLabConnection,
  saveGitLabPat,
  syncGitLab,
  updateSchedule,
  validateGitLabToken,
} from "@/lib/tauri";
import { cn } from "@/lib/utils";
import type {
  BootstrapPayload,
  GitLabConnectionInput,
  ProviderConnection,
  SyncState,
} from "@/types/dashboard";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useMatchRoute,
  useNavigate,
} from "@tanstack/react-router";
import { AlertTriangle, Loader2, Radar } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// --- App data context ---
interface AppData {
  payload: BootstrapPayload;
  connections: ProviderConnection[];
  refreshConnections: () => Promise<void>;
  refreshPayload: () => Promise<void>;
  syncState: SyncState;
  startSync: () => Promise<void>;
}

const AppDataContext = createContext<AppData | null>(null);

function useAppData(): AppData {
  const ctx = use(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataContext");
  return ctx;
}

// --- Router setup ---
type ViewKey = "today" | "week" | "month" | "audit" | "settings";

const navItems: Array<{ key: ViewKey; label: string; path: string }> = [
  { key: "today", label: "Today", path: "/" },
  { key: "week", label: "Week", path: "/week" },
  { key: "month", label: "Month", path: "/month" },
  { key: "audit", label: "Audit", path: "/audit" },
  { key: "settings", label: "Settings", path: "/settings" },
];

const rootRoute = createRootRoute({ component: DashboardLayout });

const todayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: TodayPage,
});
const weekRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/week",
  component: WeekPage,
});
const monthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/month",
  component: MonthPage,
});
const auditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/audit",
  component: AuditPage,
});
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  todayRoute,
  weekRoute,
  monthRoute,
  auditRoute,
  settingsRoute,
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

// --- Page components ---
function TodayPage() {
  const { payload, connections } = useAppData();
  const navigate = useNavigate();
  const weekTotals = useMemo(
    () =>
      payload.week.reduce(
        (acc, day) => ({
          logged: acc.logged + day.loggedHours,
          target: acc.target + day.targetHours,
        }),
        { logged: 0, target: 0 },
      ),
    [payload.week],
  );

  // Auto-navigate to settings if no connection is set up
  const needsSetup =
    connections.length === 0 ||
    !connections.some((c) => c.hasToken || c.clientId);
  const didRedirect = useRef(false);

  useEffect(() => {
    if (needsSetup && !didRedirect.current) {
      didRedirect.current = true;
      navigate({ to: "/settings" });
    }
  }, [needsSetup, navigate]);

  return (
    <TodayView
      payload={payload}
      weekTotals={weekTotals}
      onNavigateSettings={() => navigate({ to: "/settings" })}
    />
  );
}

function WeekPage() {
  const { payload } = useAppData();
  return <WeekView week={payload.week} />;
}

function MonthPage() {
  const { payload } = useAppData();
  return <MonthView month={payload.month} />;
}

function AuditPage() {
  const { payload } = useAppData();
  return <AuditView flags={payload.auditFlags} />;
}

function SettingsPage() {
  const {
    payload,
    connections,
    refreshConnections,
    refreshPayload,
    syncState,
    startSync,
  } = useAppData();
  return (
    <SettingsView
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
      onUpdateSchedule={updateSchedule}
      onRefreshBootstrap={refreshPayload}
      onListenOAuthEvents={listenForGitLabOAuthCallback}
    />
  );
}

// --- Dashboard layout ---
function DashboardLayout() {
  const { payload } = useAppData();
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();

  const currentPath =
    navItems.find((item) => matchRoute({ to: item.path }))?.path ?? "/";

  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <div className="relative flex min-h-screen w-full flex-col gap-6 p-4 lg:flex-row lg:p-6">
        {/* Sidebar */}
        <motion.aside
          variants={sidebarVariants}
          initial="initial"
          animate="animate"
          className="w-full shrink-0 lg:w-56"
        >
          <div className="sticky top-4 space-y-5">
            {/* Branding */}
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-muted">
                <Radar className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <p className="font-display text-base font-semibold text-foreground">
                  {payload.appName}
                </p>
                <p className="text-xs text-muted-foreground">Time tracker</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Badge tone="low">{payload.phase}</Badge>
              {payload.demoMode && <Badge tone="beta">Demo</Badge>}
            </div>

            {/* Navigation */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const active = currentPath === item.path;
                return (
                  <button
                    key={item.key}
                    className={cn(
                      "relative flex w-full cursor-pointer items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                      active
                        ? "text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    onClick={() => navigate({ to: item.path })}
                    type="button"
                  >
                    {active && (
                      <motion.div
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-lg border border-primary/20 bg-primary/5"
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30,
                        }}
                      />
                    )}
                    <span className="relative">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Gamification (secondary) */}
            <div className="space-y-3 border-t border-border pt-4">
              <PilotCard profile={payload.profile} />
              <QuestPanel quests={payload.quests} />
            </div>
          </div>
        </motion.aside>

        {/* Main content */}
        <section className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPath}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
    </main>
  );
}

// --- App entry ---
export default function App() {
  const {
    payload,
    connections,
    loading,
    error,
    refreshConnections,
    refreshPayload,
  } = useBootstrap();
  const notify = useNotify();

  const [syncState, setSyncState] = useState<SyncState>({
    syncing: false,
    result: null,
    error: null,
  });

  const startSync = useCallback(async () => {
    if (syncState.syncing) return;
    setSyncState({ syncing: true, result: null, error: null });
    const toastId = notify.syncStart();
    try {
      const result = await syncGitLab();
      setSyncState({ syncing: false, result, error: null });
      notify.syncComplete(toastId, result);
      await refreshPayload();
    } catch (err) {
      const message = String(err);
      setSyncState({ syncing: false, result: null, error: message });
      notify.syncFailed(toastId, message);
    }
  }, [syncState.syncing, refreshPayload, notify]);

  // Error screen when bootstrap fails
  if (error && !payload) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="font-display text-base font-semibold text-foreground">
            Failed to load Pulseboard
          </p>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            {error}
          </p>
          <Button size="sm" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
        <Toaster />
      </main>
    );
  }

  if (loading || !payload) {
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

  return (
    <AppDataContext
      value={{
        payload,
        connections,
        refreshConnections,
        refreshPayload,
        syncState,
        startSync,
      }}
    >
      <RouterProvider router={router} />
      <Toaster />
    </AppDataContext>
  );
}
