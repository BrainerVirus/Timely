import { Button } from "@/shared/ui/button";
import { GitLabAuthPanel } from "@/core/providers/gitlab-auth-panel";
import { useI18n } from "@/core/runtime/i18n";
import { hasActiveConnection } from "@/shared/types/dashboard";

import type {
  AuthLaunchPlan,
  GitLabConnectionInput,
  GitLabUserInfo,
  OAuthCallbackResolution,
  ProviderConnection,
} from "@/shared/types/dashboard";

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
}: Readonly<SetupProviderPageProps>) {
  const { t } = useI18n();
  const hasConnection = hasActiveConnection(connections);

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-3xl font-bold">{t("setup.providerTitle")}</h1>
        <p className="text-muted-foreground">{t("setup.providerDescription")}</p>
      </div>

      <div className="rounded-2xl border-2 border-border-subtle bg-panel p-5 shadow-card">
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
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer text-sm text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
        >
          {t("common.back")}
        </button>
      </div>
    </div>
  );
}
