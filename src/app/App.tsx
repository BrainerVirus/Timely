import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import Radar from "lucide-react/dist/esm/icons/radar.js";
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
import { AnimatePresence, LazyMotion, domAnimation, m } from "motion/react";
import { useCallback, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { AuditView } from "@/features/audit/audit-view";
import { MonthView } from "@/features/dashboard/month-view";
import { TodayView } from "@/features/dashboard/today-view";
import { WeekView } from "@/features/dashboard/week-view";
import { PilotCard } from "@/features/gamification/pilot-card";
import { QuestPanel } from "@/features/gamification/quest-panel";
import { OnboardingFlow, isOnboardingComplete } from "@/features/onboarding/onboarding-flow";
import { ProfileView } from "@/features/profile/profile-view";
import { SettingsView } from "@/features/settings/settings-view";
import { pageTransition, pageVariants, sidebarVariants } from "@/lib/animations";
import {
  beginGitLabOAuth,
  listenForGitLabOAuthCallback,
  resolveGitLabOAuthCallback,
  saveGitLabConnection,
  saveGitLabPat,
  updateSchedule,
  updateTrayIcon,
  validateGitLabToken,
} from "@/lib/tauri";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";

import type { BootstrapPayload, GitLabConnectionInput } from "@/types/dashboard";

type ViewKey = "today" | "week" | "month" | "audit" | "settings" | "profile";

const navItems: Array<{ key: ViewKey; label: string; path: string }> = [
  { key: "today", label: "Today", path: "/" },
  { key: "week", label: "Week", path: "/week" },
  { key: "month", label: "Month", path: "/month" },
  { key: "audit", label: "Audit", path: "/audit" },
  { key: "settings", label: "Settings", path: "/settings" },
  { key: "profile", label: "Profile", path: "/profile" },
];

const rootRoute = createRootRoute({ component: DashboardLayout });

const todayRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: TodayPage });
const weekRoute = createRoute({ getParentRoute: () => rootRoute, path: "/week", component: WeekPage });
const monthRoute = createRoute({ getParentRoute: () => rootRoute, path: "/month", component: MonthPage });
const auditRoute = createRoute({ getParentRoute: () => rootRoute, path: "/audit", component: AuditPage });
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});

const routeTree = rootRoute.addChildren([
  todayRoute,
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

function TodayPage() {
  const payload = usePayload();
  const connections = useAppStore((state) => state.connections);
  const navigate = useNavigate();
  const weekTotals = getWeekTotals(payload);

  const needsSetup = connections.length === 0 || !connections.some((connection) => connection.hasToken || connection.clientId);
  const onboardingWillShow = needsSetup && payload.demoMode && !isOnboardingComplete();
  const didRedirect = useRef(false);

  useEffect(() => {
    if (needsSetup && !onboardingWillShow && !didRedirect.current) {
      didRedirect.current = true;
      navigate({ to: "/settings" });
    }
  }, [navigate, needsSetup, onboardingWillShow]);

  return (
    <TodayView
      payload={payload}
      weekTotals={weekTotals}
      onNavigateSettings={() => navigate({ to: "/settings" })}
    />
  );
}

function WeekPage() {
  const payload = usePayload();
  return <WeekView week={payload.week} />;
}

function MonthPage() {
  const payload = usePayload();
  return <MonthView month={payload.month} />;
}

function AuditPage() {
  const payload = usePayload();
  return <AuditView flags={payload.auditFlags} />;
}

function SettingsPage() {
  const payload = usePayload();
  const connections = useAppStore((state) => state.connections);
  const refreshConnections = useAppStore((state) => state.refreshConnections);
  const refreshPayload = useAppStore((state) => state.refreshPayload);
  const syncState = useAppStore((state) => state.syncState);
  const startSync = useAppStore((state) => state.startSync);

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

function ProfilePage() {
  const payload = usePayload();
  const connections = useAppStore((state) => state.connections);
  return <ProfileView payload={payload} connections={connections} />;
}

function DashboardLayout() {
  const payload = usePayload();
  const connections = useAppStore((state) => state.connections);
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const currentPath = navItems.find((item) => matchRoute({ to: item.path }))?.path ?? "/";
  const needsSetup = connections.length === 0 || !connections.some((connection) => connection.hasToken || connection.clientId);
  const showOnboarding = needsSetup && payload.demoMode && !isOnboardingComplete();
  const handleNavigate = useCallback((path: string) => navigate({ to: path }), [navigate]);

  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <div className="relative flex min-h-screen w-full flex-col gap-6 p-4 lg:flex-row lg:p-6">
        <Sidebar payload={payload} currentPath={currentPath} onNavigate={handleNavigate} />

        <section className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <m.div
              key={currentPath}
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
      {showOnboarding ? <OnboardingFlow onNavigate={handleNavigate} /> : null}
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
      className="w-full shrink-0 lg:w-56"
    >
      <div className="sticky top-4 space-y-5">
        <Branding payload={payload} />
        <Navigation currentPath={currentPath} onNavigate={onNavigate} />
        {payload.quests.length > 0 ? (
          <div className="space-y-3 border-t border-border pt-4" data-onboarding="gamification">
            <PilotCard profile={payload.profile} />
            <QuestPanel quests={payload.quests} />
          </div>
        ) : null}
      </div>
    </m.aside>
  );
}

function Branding({ payload }: { payload: BootstrapPayload }) {
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-muted">
          <Radar className="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <p className="font-display text-base font-semibold text-foreground">{payload.appName}</p>
          <p className="text-xs text-muted-foreground">Time tracker</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge tone="low">{payload.phase}</Badge>
        {payload.demoMode ? <Badge tone="beta">Demo</Badge> : null}
      </div>
    </>
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
    <nav className="space-y-1" data-onboarding="sidebar-nav">
      {navItems.map((item) => {
        const active = currentPath === item.path;

        return (
          <button
            key={item.key}
            data-onboarding={item.key === "settings" ? "nav-settings" : undefined}
            className={cn(
              "relative flex w-full cursor-pointer items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            onClick={() => onNavigate(item.path)}
            type="button"
          >
            {active ? (
              <m.div
                className="absolute inset-0 rounded-lg border border-primary/20 bg-primary/5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
              />
            ) : null}
            <span className="relative">{item.label}</span>
          </button>
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

function getWeekTotals(payload: BootstrapPayload) {
  return payload.week.reduce(
    (totals, day) => ({
      logged: totals.logged + day.loggedHours,
      target: totals.target + day.targetHours,
    }),
    { logged: 0, target: 0 },
  );
}
