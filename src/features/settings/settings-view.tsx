import CheckCircle2 from "lucide-react/dist/esm/icons/circle-check.js";
import XCircle from "lucide-react/dist/esm/icons/circle-x.js";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.js";
import Clock from "lucide-react/dist/esm/icons/clock.js";
import Coffee from "lucide-react/dist/esm/icons/coffee.js";
import Globe from "lucide-react/dist/esm/icons/globe.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.js";
import Terminal from "lucide-react/dist/esm/icons/terminal.js";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitLabAuthPanel } from "@/features/providers/gitlab-auth-panel";
import { useNotify } from "@/hooks/use-notify";
import { cardContainerVariants } from "@/lib/animations";
import { cn } from "@/lib/utils";

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

const ALL_WORKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface SettingsViewProps {
  payload: BootstrapPayload;
  connections: ProviderConnection[];
  syncState: SyncState;
  onStartSync: () => Promise<void>;
  onSaveConnection: (input: GitLabConnectionInput) => Promise<ProviderConnection>;
  onSavePat: (host: string, token: string) => Promise<ProviderConnection>;
  onBeginOAuth: (input: GitLabConnectionInput) => Promise<AuthLaunchPlan>;
  onResolveCallback: (sessionId: string, callbackUrl: string) => Promise<OAuthCallbackResolution>;
  onValidateToken?: (host: string) => Promise<GitLabUserInfo>;
  onUpdateSchedule?: (input: ScheduleInput) => Promise<void>;
  onRefreshBootstrap?: () => Promise<void>;
  onListenOAuthEvents?: (
    onSuccess: (payload: OAuthCallbackResolution) => void,
    onError: (message: string) => void,
  ) => Promise<() => void>;
}

type SchedulePhase = "idle" | "saving" | "saved";

interface ScheduleFormState {
  shiftStart: string;
  shiftEnd: string;
  lunchMinutes: string;
  workdays: string[];
  schedulePhase: SchedulePhase;
}

type ScheduleFormAction =
  | { type: "setShiftStart"; value: string }
  | { type: "setShiftEnd"; value: string }
  | { type: "setLunchMinutes"; value: string }
  | { type: "toggleWorkday"; day: string }
  | { type: "setSchedulePhase"; phase: SchedulePhase };

function createInitialScheduleFormState(payload: BootstrapPayload): ScheduleFormState {
  const currentWorkdays = parseWorkdays(payload.schedule.workdays);

  return {
    shiftStart: payload.schedule.shiftStart ?? "09:00",
    shiftEnd: payload.schedule.shiftEnd ?? "18:00",
    lunchMinutes: String(payload.schedule.lunchMinutes ?? 60),
    workdays: currentWorkdays.length > 0 ? currentWorkdays : ["Mon", "Tue", "Wed", "Thu", "Fri"],
    schedulePhase: "idle",
  };
}

function scheduleFormReducer(
  state: ScheduleFormState,
  action: ScheduleFormAction,
): ScheduleFormState {
  switch (action.type) {
    case "setShiftStart":
      return { ...state, shiftStart: action.value, schedulePhase: "idle" };
    case "setShiftEnd":
      return { ...state, shiftEnd: action.value, schedulePhase: "idle" };
    case "setLunchMinutes":
      return { ...state, lunchMinutes: action.value, schedulePhase: "idle" };
    case "toggleWorkday":
      return {
        ...state,
        workdays: state.workdays.includes(action.day)
          ? state.workdays.filter((day) => day !== action.day)
          : [...state.workdays, action.day],
        schedulePhase: "idle",
      };
    case "setSchedulePhase":
      return { ...state, schedulePhase: action.phase };
    default:
      return state;
  }
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
  const hasConnection = connections.some((connection) => connection.hasToken || connection.clientId);
  const notify = useNotify();
  const syncing = syncState.status === "syncing";
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [scheduleForm, dispatchScheduleForm] = useReducer(
    scheduleFormReducer,
    payload,
    createInitialScheduleFormState,
  );
  const { shiftStart, shiftEnd, lunchMinutes, workdays, schedulePhase } = scheduleForm;
  const netHours = formatNetHours(shiftStart, shiftEnd, lunchMinutes);

  async function handleSaveSchedule() {
    if (!onUpdateSchedule) return;

    dispatchScheduleForm({ type: "setSchedulePhase", phase: "saving" });

    try {
      await onUpdateSchedule({
        shiftStart,
        shiftEnd,
        lunchMinutes: Number.parseInt(lunchMinutes) || 0,
        workdays,
        timezone,
      });
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "saved" });
      notify.success("Schedule saved", "Your work schedule has been updated.");
      if (onRefreshBootstrap) {
        await onRefreshBootstrap();
      }
    } catch (err) {
      dispatchScheduleForm({ type: "setSchedulePhase", phase: "idle" });
      notify.error("Failed to save schedule", String(err));
    }
  }

  return (
    <m.div
      variants={cardContainerVariants}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
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

      {hasConnection ? (
        <SyncSection
          payload={payload}
          syncState={syncState}
          syncing={syncing}
          onStartSync={onStartSync}
        />
      ) : null}

      <ScheduleSection
        shiftStart={shiftStart}
        shiftEnd={shiftEnd}
        lunchMinutes={lunchMinutes}
        workdays={workdays}
        timezone={timezone}
        netHours={netHours}
        schedulePhase={schedulePhase}
        canSave={Boolean(onUpdateSchedule)}
        onShiftStartChange={(value) => dispatchScheduleForm({ type: "setShiftStart", value })}
        onShiftEndChange={(value) => dispatchScheduleForm({ type: "setShiftEnd", value })}
        onLunchMinutesChange={(value) => dispatchScheduleForm({ type: "setLunchMinutes", value })}
        onToggleWorkday={(day) => dispatchScheduleForm({ type: "toggleWorkday", day })}
        onSave={handleSaveSchedule}
      />
    </m.div>
  );
}

function SyncSection({
  payload,
  syncState,
  syncing,
  onStartSync,
}: {
  payload: BootstrapPayload;
  syncState: SyncState;
  syncing: boolean;
  onStartSync: () => Promise<void>;
}) {
  const shouldShowLog = syncing || syncState.log.length > 0;

  return (
    <Card>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">Sync GitLab Data</h3>
            <p className="text-xs text-muted-foreground">
              {payload.demoMode ? "Fetch your real time entries from GitLab." : "Refresh time entries from GitLab."}
            </p>
          </div>
          <Button onClick={onStartSync} disabled={syncing} size="sm">
            {syncing ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            {syncing ? "Syncing..." : "Sync now"}
          </Button>
        </div>

        {shouldShowLog ? <SyncLogPanel log={syncState.log} syncing={syncing} /> : null}

        {syncState.status === "done" ? (
          <div className="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 p-3 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
            <span className="text-foreground">
              Synced {syncState.result.projectsSynced} projects, {syncState.result.entriesSynced} time entries, {" "}
              {syncState.result.issuesSynced} issues
            </span>
          </div>
        ) : null}

        {syncState.status === "error" ? (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <XCircle className="h-4 w-4 shrink-0" />
            {syncState.error}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function ScheduleSection({
  shiftStart,
  shiftEnd,
  lunchMinutes,
  workdays,
  timezone,
  netHours,
  schedulePhase,
  canSave,
  onShiftStartChange,
  onShiftEndChange,
  onLunchMinutesChange,
  onToggleWorkday,
  onSave,
}: {
  shiftStart: string;
  shiftEnd: string;
  lunchMinutes: string;
  workdays: string[];
  timezone: string;
  netHours: string;
  schedulePhase: SchedulePhase;
  canSave: boolean;
  onShiftStartChange: (value: string) => void;
  onShiftEndChange: (value: string) => void;
  onLunchMinutesChange: (value: string) => void;
  onToggleWorkday: (day: string) => void;
  onSave: () => void;
}) {
  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h3 className="font-display text-base font-semibold text-foreground">Work Schedule</h3>
          <p className="text-xs text-muted-foreground">
            Configure your shift times, lunch break, and workdays.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <TimeField
            id="shift-start"
            label="Shift start"
            value={shiftStart}
            icon={Clock}
            onChange={onShiftStartChange}
          />
          <TimeField
            id="shift-end"
            label="Shift end"
            value={shiftEnd}
            icon={Clock}
            onChange={onShiftEndChange}
          />
          <NumberField
            id="lunch-minutes"
            label="Lunch break (min)"
            value={lunchMinutes}
            icon={Coffee}
            onChange={onLunchMinutesChange}
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              Timezone
            </Label>
            <Input value={timezone} disabled />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Net hours/day</Label>
            <p className="flex h-9 items-center text-sm font-medium text-foreground">{netHours}h</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Workdays</Label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_WORKDAYS.map((day) => {
              const active = workdays.includes(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => onToggleWorkday(day)}
                  className={cn(
                    "cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {canSave ? <ScheduleSaveButton phase={schedulePhase} onClick={onSave} /> : null}
      </div>
    </Card>
  );
}

function TimeField({
  id,
  label,
  value,
  icon: Icon,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  icon: typeof Clock;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
      </Label>
      <Input id={id} type="time" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  icon: Icon,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  icon: typeof Coffee;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        step="5"
        min="0"
        max="180"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function ScheduleSaveButton({ phase, onClick }: { phase: SchedulePhase; onClick: () => void }) {
  return (
    <Button onClick={onClick} disabled={phase === "saving"} size="sm">
      {phase === "saving" ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : phase === "saved" ? (
        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
      ) : null}
      {phase === "saving" ? "Saving..." : phase === "saved" ? "Saved" : "Save schedule"}
    </Button>
  );
}

function SyncLogPanel({ log, syncing }: { log: string[]; syncing: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(true);
  const autoCollapseTimeoutRef = useRef<number | null>(null);
  const previousSyncingRef = useRef(syncing);

  useEffect(() => {
    if (syncing && !previousSyncingRef.current) {
      setExpanded(true);
    }

    if (autoCollapseTimeoutRef.current) {
      window.clearTimeout(autoCollapseTimeoutRef.current);
      autoCollapseTimeoutRef.current = null;
    }

    if (!syncing && previousSyncingRef.current && log.length > 0) {
      autoCollapseTimeoutRef.current = window.setTimeout(() => {
        setExpanded(false);
        autoCollapseTimeoutRef.current = null;
      }, 3000);
    }

    previousSyncingRef.current = syncing;

    return () => {
      if (autoCollapseTimeoutRef.current) {
        window.clearTimeout(autoCollapseTimeoutRef.current);
        autoCollapseTimeoutRef.current = null;
      }
    };
  }, [syncing, log.length]);

  useEffect(() => {
    if (scrollRef.current && expanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log.length, expanded]);

  const lastLine = log.length > 0 ? log[log.length - 1] : "Starting sync...";
  const keyedLogLines = createKeyedLogLines(log);

  return (
    <div className="rounded-lg border border-border bg-background">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 transition-colors hover:bg-muted/50"
      >
        <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Sync Log</span>
        {syncing ? <Loader2 className="h-3 w-3 animate-spin text-primary" /> : null}
        {!expanded ? (
          <span className="ml-1 flex-1 truncate text-left text-xs text-foreground/60">{lastLine}</span>
        ) : null}
        <ChevronDown
          className={cn(
            "ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform",
            expanded ? "rotate-180" : null,
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {expanded ? (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.0, 1.0] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border" />
            <div ref={scrollRef} className="max-h-48 overflow-y-auto p-3 font-mono text-xs leading-relaxed">
              {log.length === 0 && syncing ? <p className="text-muted-foreground">Starting sync...</p> : null}
              {keyedLogLines.map(({ key, line, lineNumber }) => (
                <p key={key} className={getSyncLogLineClassName(line)}>
                  <span className="text-muted-foreground/50 select-none">
                    {String(lineNumber).padStart(2, " ")}{" "}
                  </span>
                  {line}
                </p>
              ))}
              {syncing ? <p className="animate-pulse text-muted-foreground">_</p> : null}
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function parseWorkdays(workdays: string): string[] {
  return workdays
    .split(" - ")
    .map((day) => day.trim())
    .filter(Boolean);
}

function formatNetHours(shiftStart: string, shiftEnd: string, lunchMinutes: string): string {
  const startMinutes = parseTimeToMinutes(shiftStart);
  const endMinutes = parseTimeToMinutes(shiftEnd);

  if (startMinutes === null || endMinutes === null) {
    return "--";
  }

  const shiftMinutes =
    endMinutes > startMinutes ? endMinutes - startMinutes : 24 * 60 - startMinutes + endMinutes;
  const netMinutes = Math.max(shiftMinutes - (Number.parseInt(lunchMinutes) || 0), 0);
  return (netMinutes / 60).toFixed(1);
}

function parseTimeToMinutes(time: string): number | null {
  const parts = time.split(":");
  if (parts.length < 2) return null;

  const hours = Number.parseInt(parts[0]);
  const minutes = Number.parseInt(parts[1]);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function getSyncLogLineClassName(line: string): string {
  if (line.startsWith("ERROR")) {
    return "text-destructive";
  }

  if (line.startsWith("Done.") || line.startsWith("Sync complete")) {
    return "text-accent";
  }

  return "text-foreground/80";
}

function createKeyedLogLines(log: string[]) {
  const counts = new Map<string, number>();

  return log.map((line, index) => {
    const nextCount = (counts.get(line) ?? 0) + 1;
    counts.set(line, nextCount);

    return {
      key: `${line}-${nextCount.toString()}`,
      line,
      lineNumber: index + 1,
    };
  });
}
