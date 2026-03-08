import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitLabAuthPanel } from "@/features/providers/gitlab-auth-panel";
import { useNotify } from "@/hooks/use-notify";
import { cardContainerVariants } from "@/lib/animations";
import type {
  AuthLaunchPlan,
  BootstrapPayload,
  GitLabConnectionInput,
  GitLabUserInfo,
  OAuthCallbackResolution,
  ProviderConnection,
  ScheduleInput,
  SyncState,
} from "@/types/dashboard";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Coffee,
  Globe,
  Loader2,
  RefreshCw,
  Terminal,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const ALL_WORKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface SettingsViewProps {
  payload: BootstrapPayload;
  connections: ProviderConnection[];
  syncState: SyncState;
  onStartSync: () => Promise<void>;
  onSaveConnection: (
    input: GitLabConnectionInput,
  ) => Promise<ProviderConnection>;
  onSavePat: (host: string, token: string) => Promise<ProviderConnection>;
  onBeginOAuth: (input: GitLabConnectionInput) => Promise<AuthLaunchPlan>;
  onResolveCallback: (
    sessionId: string,
    callbackUrl: string,
  ) => Promise<OAuthCallbackResolution>;
  onValidateToken?: (host: string) => Promise<GitLabUserInfo>;
  onUpdateSchedule?: (input: ScheduleInput) => Promise<void>;
  onRefreshBootstrap?: () => Promise<void>;
  onListenOAuthEvents?: (
    onSuccess: (payload: OAuthCallbackResolution) => void,
    onError: (message: string) => void,
  ) => Promise<() => void>;
}

export function SettingsView({
  payload,
  connections,
  syncState,
  onStartSync,
  onSaveConnection,
  onSavePat,
  onBeginOAuth,
  onResolveCallback,
  onValidateToken,
  onUpdateSchedule,
  onRefreshBootstrap,
  onListenOAuthEvents,
}: SettingsViewProps) {
  const hasConnection = connections.some((c) => c.hasToken || c.clientId);
  const notify = useNotify();

  // Schedule editing state
  const currentWorkdays = payload.schedule.workdays
    .split(" - ")
    .map((d) => d.trim())
    .filter(Boolean);
  const [shiftStart, setShiftStart] = useState(
    payload.schedule.shiftStart ?? "09:00",
  );
  const [shiftEnd, setShiftEnd] = useState(
    payload.schedule.shiftEnd ?? "18:00",
  );
  const [lunchMinutes, setLunchMinutes] = useState(
    String(payload.schedule.lunchMinutes ?? 60),
  );
  const [workdays, setWorkdays] = useState<string[]>(
    currentWorkdays.length > 0
      ? currentWorkdays
      : ["Mon", "Tue", "Wed", "Thu", "Fri"],
  );
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleSaved, setScheduleSaved] = useState(false);

  function toggleWorkday(day: string) {
    setWorkdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
    setScheduleSaved(false);
  }

  function computeNetHours(): string {
    const startMins = parseTimeToMinutes(shiftStart);
    const endMins = parseTimeToMinutes(shiftEnd);
    if (startMins === null || endMins === null) return "--";
    const shiftMins =
      endMins > startMins
        ? endMins - startMins
        : 24 * 60 - startMins + endMins;
    const net = Math.max(shiftMins - (Number.parseInt(lunchMinutes) || 0), 0);
    return (net / 60).toFixed(1);
  }

  async function handleSaveSchedule() {
    if (!onUpdateSchedule) return;
    setScheduleSaving(true);
    try {
      await onUpdateSchedule({
        shiftStart,
        shiftEnd,
        lunchMinutes: Number.parseInt(lunchMinutes) || 0,
        workdays,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setScheduleSaved(true);
      notify.success("Schedule saved", "Your work schedule has been updated.");
      if (onRefreshBootstrap) await onRefreshBootstrap();
    } catch (err) {
      notify.error("Failed to save schedule", String(err));
    } finally {
      setScheduleSaving(false);
    }
  }

  return (
    <motion.div
      variants={cardContainerVariants}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      {/* Provider connection */}
      <Card>
        <GitLabAuthPanel
          connections={connections}
          onSaveConnection={onSaveConnection}
          onSavePat={onSavePat}
          onBeginOAuth={onBeginOAuth}
          onResolveCallback={onResolveCallback}
          onValidateToken={onValidateToken}
          onListenOAuthEvents={onListenOAuthEvents}
        />
      </Card>

      {/* Sync section - shown when connected */}
      {hasConnection && (
        <Card>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-semibold text-foreground">
                  Sync GitLab Data
                </h3>
                <p className="text-xs text-muted-foreground">
                  {payload.demoMode
                    ? "Fetch your real time entries from GitLab."
                    : "Refresh time entries from GitLab."}
                </p>
              </div>
              <Button
                onClick={onStartSync}
                disabled={syncState.syncing}
                size="sm"
              >
                {syncState.syncing ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                )}
                {syncState.syncing ? "Syncing..." : "Sync now"}
              </Button>
            </div>

            {/* Live sync log */}
            {(syncState.syncing || syncState.log.length > 0) && (
              <SyncLogPanel log={syncState.log} syncing={syncState.syncing} />
            )}

            {syncState.result && !syncState.syncing && (
              <div className="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                <span className="text-foreground">
                  Synced {syncState.result.projectsSynced} projects,{" "}
                  {syncState.result.entriesSynced} time entries,{" "}
                  {syncState.result.issuesSynced} issues
                </span>
              </div>
            )}

            {syncState.error && !syncState.syncing && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                <XCircle className="h-4 w-4 shrink-0" />
                {syncState.error}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Schedule */}
      <Card>
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">
              Work Schedule
            </h3>
            <p className="text-xs text-muted-foreground">
              Configure your shift times, lunch break, and workdays.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="shift-start"
                className="flex items-center gap-1.5"
              >
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Shift start
              </Label>
              <Input
                id="shift-start"
                type="time"
                value={shiftStart}
                onChange={(e) => {
                  setShiftStart(e.target.value);
                  setScheduleSaved(false);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shift-end" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Shift end
              </Label>
              <Input
                id="shift-end"
                type="time"
                value={shiftEnd}
                onChange={(e) => {
                  setShiftEnd(e.target.value);
                  setScheduleSaved(false);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="lunch-minutes"
                className="flex items-center gap-1.5"
              >
                <Coffee className="h-3.5 w-3.5 text-muted-foreground" />
                Lunch break (min)
              </Label>
              <Input
                id="lunch-minutes"
                type="number"
                step="5"
                min="0"
                max="180"
                value={lunchMinutes}
                onChange={(e) => {
                  setLunchMinutes(e.target.value);
                  setScheduleSaved(false);
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                Timezone
              </Label>
              <Input
                value={Intl.DateTimeFormat().resolvedOptions().timeZone}
                disabled
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Net hours/day</Label>
              <p className="flex h-9 items-center text-sm font-medium text-foreground">
                {computeNetHours()}h
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Workdays</Label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_WORKDAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleWorkday(day)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    workdays.includes(day)
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {onUpdateSchedule && (
            <Button
              onClick={handleSaveSchedule}
              disabled={scheduleSaving}
              size="sm"
            >
              {scheduleSaving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : scheduleSaved ? (
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              ) : null}
              {scheduleSaving
                ? "Saving..."
                : scheduleSaved
                  ? "Saved"
                  : "Save schedule"}
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function SyncLogPanel({
  log,
  syncing,
}: { log: string[]; syncing: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(true);
  const prevSyncing = useRef(syncing);

  // Auto-expand when sync starts, auto-collapse 3s after sync completes
  useEffect(() => {
    if (syncing && !prevSyncing.current) {
      setExpanded(true);
    }
    if (!syncing && prevSyncing.current && log.length > 0) {
      const timer = setTimeout(() => setExpanded(false), 3000);
      prevSyncing.current = syncing;
      return () => clearTimeout(timer);
    }
    prevSyncing.current = syncing;
  }, [syncing, log.length]);

  useEffect(() => {
    if (scrollRef.current && expanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log.length, expanded]);

  const lastLine = log.length > 0 ? log[log.length - 1] : "Starting sync...";

  return (
    <div className="rounded-lg border border-border bg-background">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 transition-colors hover:bg-muted/50"
      >
        <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          Sync Log
        </span>
        {syncing && (
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
        )}
        {!expanded && (
          <span className="ml-1 flex-1 truncate text-left text-xs text-foreground/60">
            {lastLine}
          </span>
        )}
        <ChevronDown
          className={`ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.0, 1.0] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border" />
            <div
              ref={scrollRef}
              className="max-h-48 overflow-y-auto p-3 font-mono text-xs leading-relaxed"
            >
              {log.length === 0 && syncing && (
                <p className="text-muted-foreground">Starting sync...</p>
              )}
              {log.map((line, i) => (
                <p
                  key={`${i}-${line.slice(0, 20)}`}
                  className={
                    line.startsWith("ERROR")
                      ? "text-destructive"
                      : line.startsWith("Done.") || line.startsWith("Sync complete")
                        ? "text-accent"
                        : "text-foreground/80"
                  }
                >
                  <span className="text-muted-foreground/50 select-none">
                    {String(i + 1).padStart(2, " ")}{" "}
                  </span>
                  {line}
                </p>
              ))}
              {syncing && (
                <p className="text-muted-foreground animate-pulse">_</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function parseTimeToMinutes(time: string): number | null {
  const parts = time.split(":");
  if (parts.length < 2) return null;
  const h = Number.parseInt(parts[0]);
  const m = Number.parseInt(parts[1]);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}
