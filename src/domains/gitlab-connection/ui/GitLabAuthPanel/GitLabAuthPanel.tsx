import { GitLabAuthForm } from "@/domains/gitlab-connection/ui/GitLabAuthPanel/internal/GitLabAuthForm/GitLabAuthForm";
import { GitLabConnectedState } from "@/domains/gitlab-connection/ui/GitLabAuthPanel/internal/GitLabConnectedState/GitLabConnectedState";
import { useGitLabAuthController } from "@/domains/gitlab-connection/ui/GitLabAuthPanel/internal/use-gitlab-auth-controller";
import { findPrimaryConnection, isConnectionActive } from "@/shared/types/dashboard";

import type {
  AuthLaunchPlan,
  GitLabConnectionInput,
  GitLabUserInfo,
  OAuthCallbackResolution,
  ProviderConnection,
} from "@/shared/types/dashboard";

export interface GitLabAuthPanelProps {
  connections: ProviderConnection[];
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

export function GitLabAuthPanel({
  connections,
  onSaveConnection,
  onSavePat,
  onBeginOAuth,
  onResolveCallback,
  onValidateToken,
  onListenOAuthEvents,
}: Readonly<GitLabAuthPanelProps>) {
  const primary = findPrimaryConnection(connections);
  const controller = useGitLabAuthController({
    primary,
    onSaveConnection,
    onSavePat,
    onBeginOAuth,
    onResolveCallback,
    onValidateToken,
    onListenOAuthEvents,
  });

  const isConnected = primary != null && isConnectionActive(primary);
  if (
    isConnected ||
    controller.phase.status === "connected" ||
    controller.phase.status === "validating"
  ) {
    return (
      <GitLabConnectedState
        host={primary?.host ?? controller.host}
        authMode={primary?.authMode ?? controller.connectedAuthMode}
        preferredScope={primary?.preferredScope ?? "api"}
        phase={controller.connectedPhase}
        onDisconnect={controller.handleDisconnect}
      />
    );
  }

  return (
    <GitLabAuthForm
      tab={controller.tab}
      host={controller.host}
      clientId={controller.clientId}
      pat={controller.pat}
      busy={controller.busy}
      phase={controller.phase}
      onTabChange={controller.handleTabChange}
      onHostChange={controller.handleHostChange}
      onClientIdChange={controller.handleClientIdChange}
      onPatChange={controller.handlePatChange}
      onConnectPat={controller.handlePatConnect}
      onConnectOAuth={controller.handleOAuthConnect}
      onResolveManual={controller.handleResolveManual}
    />
  );
}
