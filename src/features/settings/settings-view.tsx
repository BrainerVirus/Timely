import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitLabAuthPanel } from "@/features/providers/gitlab-auth-panel";
import { cardContainerVariants } from "@/lib/animations";
import type {
  AuthLaunchPlan,
  BootstrapPayload,
  GitLabConnectionInput,
  GitLabUserInfo,
  OAuthCallbackResolution,
  ProviderConnection,
  ScheduleInput,
  SyncResult,
} from "@/types/dashboard";
import { CheckCircle2, Clock, Globe, Loader2, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

const ALL_WORKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface SettingsViewProps {
  payload: BootstrapPayload;
  connections: ProviderConnection[];
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
  onSyncGitLab?: () => Promise<SyncResult>;
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
  onSaveConnection,
  onSavePat,
  onBeginOAuth,
  onResolveCallback,
  onValidateToken,
  onSyncGitLab,
  onUpdateSchedule,
  onRefreshBootstrap,
  onListenOAuthEvents,
}: SettingsViewProps) {
  const hasConnection = connections.some((c) => c.hasToken || c.clientId);

  // Schedule editing state
  const currentWorkdays = payload.schedule.workdays
    .split(" - ")
    .map((d) => d.trim())
    .filter(Boolean);
  const [hoursPerDay, setHoursPerDay] = useState(
    String(payload.schedule.hoursPerDay),
  );
  const [workdays, setWorkdays] = useState<string[]>(
    currentWorkdays.length > 0 ? currentWorkdays : ["Mon", "Tue", "Wed", "Thu", "Fri"],
  );
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleSaved, setScheduleSaved] = useState(false);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  function toggleWorkday(day: string) {
    setWorkdays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day],
    );
    setScheduleSaved(false);
  }

  async function handleSaveSchedule() {
    if (!onUpdateSchedule) return;
    setScheduleSaving(true);
    try {
      await onUpdateSchedule({
        hoursPerDay: Number.parseFloat(hoursPerDay) || 8,
        workdays,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setScheduleSaved(true);
      if (onRefreshBootstrap) await onRefreshBootstrap();
    } catch {
      // silently handle
    } finally {
      setScheduleSaving(false);
    }
  }

  async function handleSync() {
    if (!onSyncGitLab) return;
    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const result = await onSyncGitLab();
      setSyncResult(result);
      if (onRefreshBootstrap) await onRefreshBootstrap();
    } catch (err) {
      setSyncError(String(err));
    } finally {
      setSyncing(false);
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
      {hasConnection && onSyncGitLab && (
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
                onClick={handleSync}
                disabled={syncing}
                size="sm"
              >
                {syncing ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                )}
                {syncing ? "Syncing..." : "Sync now"}
              </Button>
            </div>

            {syncResult && (
              <div className="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                <span className="text-foreground">
                  Synced {syncResult.projectsSynced} projects,{" "}
                  {syncResult.entriesSynced} time entries,{" "}
                  {syncResult.issuesSynced} issues
                </span>
              </div>
            )}

            {syncError && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {syncError}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Schedule */}
      <div>
        <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
          Work Schedule
        </h2>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="hours-per-day" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Hours per day
              </Label>
              <Input
                id="hours-per-day"
                type="number"
                step="0.5"
                min="1"
                max="24"
                value={hoursPerDay}
                onChange={(e) => {
                  setHoursPerDay(e.target.value);
                  setScheduleSaved(false);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                Timezone
              </Label>
              <Input
                value={Intl.DateTimeFormat().resolvedOptions().timeZone}
                disabled
              />
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
      </div>
    </motion.div>
  );
}
