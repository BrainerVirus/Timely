import Gitlab from "lucide-react/dist/esm/icons/gitlab.js";
import Layers3 from "lucide-react/dist/esm/icons/layers-3.js";
import Server from "lucide-react/dist/esm/icons/server.js";
import { Card } from "@/components/ui/card";
import { GitLabAuthPanel } from "@/features/providers/gitlab-auth-panel";
import { ProviderSyncCard } from "@/features/providers/provider-sync-card";


import type {
  AuthLaunchPlan,
  BootstrapPayload,
  GitLabConnectionInput,
  GitLabUserInfo,
  OAuthCallbackResolution,
  ProviderConnection,
  SyncState,
} from "@/types/dashboard";

interface ProvidersPageProps {
  payload: BootstrapPayload;
  connections: ProviderConnection[];
  syncState: SyncState;
  onStartSync: () => Promise<void>;
  onSaveConnection: (input: GitLabConnectionInput) => Promise<ProviderConnection>;
  onSavePat: (host: string, token: string) => Promise<ProviderConnection>;
  onBeginOAuth: (input: GitLabConnectionInput) => Promise<AuthLaunchPlan>;
  onResolveCallback: (sessionId: string, callbackUrl: string) => Promise<OAuthCallbackResolution>;
  onValidateToken?: (host: string) => Promise<GitLabUserInfo>;
  onListenOAuthEvents?: (
    onSuccess: (payload: OAuthCallbackResolution) => void,
    onError: (message: string) => void,
  ) => Promise<() => void>;
}

const futureProviders = [
  { name: "GitHub", note: "Repository activity and future worklog adapters", icon: Layers3 },
  { name: "YouTrack", note: "Issue-based time reporting for multi-provider support", icon: Server },
];

export function ProvidersPage({
  payload,
  connections,
  syncState,
  onStartSync,
  onSaveConnection,
  onSavePat,
  onBeginOAuth,
  onResolveCallback,
  onValidateToken,
  onListenOAuthEvents,
}: ProvidersPageProps) {
  const connectedCount = connections.filter((connection) => connection.hasToken || connection.clientId).length;

  return (
    <div
      className="space-y-6"
    >
      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 md:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-4 p-5 sm:p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Provider hub
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-semibold text-foreground">Connect and manage your data sources</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                GitLab is live today. This workspace will also become the home for future providers,
                account health, and sync controls.
              </p>
            </div>
          </div>

          <div className="grid gap-3 border-t border-border/70 bg-muted/40 p-5 sm:grid-cols-2 md:border-t-0 md:border-l md:grid-cols-1 md:p-6">
            <ProviderOverviewStat label="Connected" value={String(connectedCount)} icon={Gitlab} />
            <ProviderOverviewStat
              label="Available next"
              value={String(futureProviders.length)}
              icon={Layers3}
            />
          </div>
        </div>
      </Card>

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

      {connections.length > 0 ? (
        <ProviderSyncCard
          payload={payload}
          syncState={syncState}
          syncing={syncState.status === "syncing"}
          onStartSync={onStartSync}
        />
      ) : null}

      <Card>
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">Provider roadmap</h3>
            <p className="text-xs text-muted-foreground">
              The product is being shaped for multiple providers from day one.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {futureProviders.map((provider) => {
              const Icon = provider.icon;

              return (
                <div key={provider.name} className="rounded-xl border border-border bg-muted/40 p-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-background">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-display text-sm font-semibold text-foreground">{provider.name}</p>
                      <p className="text-xs text-muted-foreground">Planned provider</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{provider.note}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}

function ProviderOverviewStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Gitlab;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/80 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary/70" />
      </div>
      <p className="mt-3 font-display text-3xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
