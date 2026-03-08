import { Card } from "@/components/ui/card";
import { ProviderSyncCard } from "@/features/providers/provider-sync-card";
import { SetupShell } from "@/features/setup/setup-shell";

import type { BootstrapPayload, SyncState } from "@/types/dashboard";

export function SetupSyncPage({
  payload,
  syncState,
  onBack,
  onNext,
  onStartSync,
}: {
  payload: BootstrapPayload;
  syncState: SyncState;
  onBack: () => void;
  onNext: () => void;
  onStartSync: () => Promise<void>;
}) {
  return (
    <SetupShell
      step="sync"
      eyebrow="Sync"
      title="Pull in your first real worklog data"
      description="A first sync turns the app from a shell into something useful. Once data is loaded, Home and Worklog start to become meaningful."
      onBack={onBack}
      onNext={onNext}
      nextLabel="Finish setup"
    >
      <div className="space-y-4">
        <ProviderSyncCard
          payload={payload}
          syncState={syncState}
          syncing={syncState.status === "syncing"}
          onStartSync={onStartSync}
        />

        <Card>
          <div className="space-y-2">
            <h3 className="font-display text-base font-semibold text-foreground">What comes next</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Next we will connect this setup flow to holidays, region calendars, and richer day/week/month worklog queries.
            </p>
          </div>
        </Card>
      </div>
    </SetupShell>
  );
}
