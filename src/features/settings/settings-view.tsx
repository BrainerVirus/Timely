import { SectionHeading } from "@/components/shared/section-heading";
import { StatPanel } from "@/components/shared/stat-panel";
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
      <Card className="space-y-4">
        <SectionHeading title="Connections" note="Provider configuration." />
        <GitLabAuthPanel
          connections={connections}
          onSaveConnection={onSaveConnection}
          onBeginOAuth={onBeginOAuth}
          onResolveCallback={onResolveCallback}
          onListenOAuthEvents={onListenOAuthEvents}
        />
      </Card>

      <motion.div
        variants={cardContainerVariants}
        initial="initial"
        animate="animate"
        className="grid gap-3 sm:grid-cols-2"
      >
        <StatPanel
          title="Rhythm"
          value={`${payload.schedule.hoursPerDay}h/day`}
          note={payload.schedule.workdays}
        />
        <StatPanel
          title="Timezone"
          value={payload.schedule.timezone}
          note="Local"
        />
        <StatPanel
          title="Sync"
          value={payload.schedule.syncWindow}
          note="Fast first sync"
        />
        <StatPanel
          title="Mode"
          value={payload.schedule.mode}
          note="No writeback"
        />
      </motion.div>
    </motion.div>
  );
}
