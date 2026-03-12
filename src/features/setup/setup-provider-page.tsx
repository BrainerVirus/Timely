import { Button } from "@/components/ui/button";
import { GitLabAuthPanel } from "@/features/providers/gitlab-auth-panel";
import { useI18n } from "@/lib/i18n";
import { hasActiveConnection } from "@/types/dashboard";
import { SetupShell } from "./setup-shell";

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
  const { t } = useI18n();
  const hasConnection = hasActiveConnection(connections);

  return (
    <SetupShell step={2} totalSteps={5}>
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-display text-3xl font-bold">{t("setup.providerTitle")}</h1>
          <p className="text-muted-foreground">{t("setup.providerDescription")}</p>
        </div>

        <div className="rounded-2xl border-2 border-border bg-card p-5 shadow-[var(--shadow-clay)]">
          <GitLabAuthPanel
            connections={connections}
            onSaveConnection={onSaveConnection}
            onSavePat={onSavePat}
            onBeginOAuth={onBeginOAuth}
            onResolveCallback={onResolveCallback}
            onValidateToken={onValidateToken}
            onListenOAuthEvents={onListenOAuthEvents}
          />
        </div>

        <div className="flex flex-col items-center gap-3">
          <Button onClick={onNext} variant={hasConnection ? "primary" : "ghost"} className="w-full">
            {hasConnection ? t("setup.continueButton") : t("common.skipForNow")}
          </Button>
          <button type="button" onClick={onBack} className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground cursor-pointer transition-colors">
            {t("common.back")}
          </button>
        </div>
      </div>
    </SetupShell>
  );
}
