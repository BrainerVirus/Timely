import { Card } from "@/components/ui/card";
import { GitLabAuthPanel } from "@/features/providers/gitlab-auth-panel";
import { cardContainerVariants } from "@/lib/animations";
import type {
  AuthLaunchPlan,
  BootstrapPayload,
  GitLabConnectionInput,
  OAuthCallbackResolution,
  ProviderConnection,
} from "@/types/dashboard";
import { Clock, Globe, RefreshCw, Zap } from "lucide-react";
import { motion } from "motion/react";

interface SettingsViewProps {
  payload: BootstrapPayload;
  connections: ProviderConnection[];
  onSaveConnection: (
    input: GitLabConnectionInput,
  ) => Promise<ProviderConnection>;
  onBeginOAuth: (input: GitLabConnectionInput) => Promise<AuthLaunchPlan>;
  onResolveCallback: (
    sessionId: string,
    callbackUrl: string,
  ) => Promise<OAuthCallbackResolution>;
  onListenOAuthEvents?: (
    onSuccess: (payload: OAuthCallbackResolution) => void,
    onError: (message: string) => void,
  ) => Promise<() => void>;
}

export function SettingsView({
  payload,
  connections,
  onSaveConnection,
  onBeginOAuth,
  onResolveCallback,
  onListenOAuthEvents,
}: SettingsViewProps) {
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
          onBeginOAuth={onBeginOAuth}
          onResolveCallback={onResolveCallback}
          onListenOAuthEvents={onListenOAuthEvents}
        />
      </Card>

      {/* Schedule info */}
      <div>
        <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
          Work Schedule
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <SettingItem
            icon={Clock}
            label="Daily target"
            value={`${payload.schedule.hoursPerDay}h/day`}
            note={payload.schedule.workdays}
          />
          <SettingItem
            icon={Globe}
            label="Timezone"
            value={payload.schedule.timezone}
            note="Local system time"
          />
          <SettingItem
            icon={RefreshCw}
            label="Sync window"
            value={payload.schedule.syncWindow}
            note="Auto-refresh interval"
          />
          <SettingItem
            icon={Zap}
            label="Mode"
            value={payload.schedule.mode}
            note="Read-only, no writeback"
          />
        </div>
      </div>
    </motion.div>
  );
}

function SettingItem({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs tracking-wide uppercase text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-medium text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}
