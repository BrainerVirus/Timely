import { Card } from "@/components/ui/card";
import { GitLabAuthPanel } from "@/features/providers/gitlab-auth-panel";
import { SetupShell } from "@/features/setup/setup-shell";

import type {
  AuthLaunchPlan,
  GitLabConnectionInput,
  GitLabUserInfo,
  OAuthCallbackResolution,
  ProviderConnection,
} from "@/types/dashboard";

interface SetupProviderPageProps {
  connections: ProviderConnection[];
  onBack: () => void;
  onNext: () => void;
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

export function SetupProviderPage({
  connections,
  onBack,
  onNext,
  onSaveConnection,
  onSavePat,
  onBeginOAuth,
  onResolveCallback,
  onValidateToken,
  onListenOAuthEvents,
}: SetupProviderPageProps) {
  const hasConnection = connections.some((connection) => connection.hasToken || connection.clientId);

  return (
    <SetupShell
      step="provider"
      eyebrow="Provider"
      title="Connect your first data source"
      description="GitLab is the first supported provider. Once it is connected, the app can sync real issues and time entries instead of showing a mostly empty shell."
      onBack={onBack}
      onNext={onNext}
      nextLabel={hasConnection ? "Continue to schedule" : "Continue anyway"}
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
    </SetupShell>
  );
}
