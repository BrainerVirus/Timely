import { useI18n } from "@/app/providers/I18nService/i18n";
import { GitLabAuthPanel } from "@/domains/gitlab-connection/ui/GitLabAuthPanel/GitLabAuthPanel";
import { YouTrackAuthPanel } from "@/domains/gitlab-connection/ui/YouTrackAuthPanel/YouTrackAuthPanel";
import { hasActiveConnection } from "@/shared/types/dashboard";
import { Button } from "@/shared/ui/Button/Button";
import { useState } from "react";

import type {
  AuthLaunchPlan,
  GitLabUserInfo,
  OAuthCallbackResolution,
  ProviderConnectionInput,
  ProviderConnection,
  ProviderKey,
} from "@/shared/types/dashboard";

interface SetupProviderPageProps {
  connections: ProviderConnection[];
  onBack: () => void;
  onNext: () => void;
  onSaveConnection: (input: ProviderConnectionInput) => Promise<ProviderConnection>;
  onSavePat: (provider: ProviderKey, host: string, token: string) => Promise<ProviderConnection>;
  onBeginOAuth: (input: ProviderConnectionInput) => Promise<AuthLaunchPlan>;
  onResolveCallback: (sessionId: string, callbackUrl: string) => Promise<OAuthCallbackResolution>;
  onValidateToken?: (provider: ProviderKey, host: string) => Promise<GitLabUserInfo>;
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
  const [provider, setProvider] = useState<ProviderKey>("gitlab");

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-3xl font-bold">{t("setup.providerTitle")}</h1>
        <p className="text-muted-foreground">{t("setup.providerDescription")}</p>
      </div>

      <div className="rounded-2xl border-2 border-border-subtle bg-panel p-5 shadow-card">
        <div className="mb-4 flex gap-2">
          <Button variant={provider === "gitlab" ? "primary" : "ghost"} onClick={() => setProvider("gitlab")}>
            GitLab
          </Button>
          <Button
            variant={provider === "youtrack" ? "primary" : "ghost"}
            onClick={() => setProvider("youtrack")}
          >
            YouTrack
          </Button>
        </div>
        {provider === "gitlab" ? (
          <GitLabAuthPanel
            connections={connections.filter((item) => item.provider.toLowerCase() === "gitlab")}
            onSaveConnection={(input) => onSaveConnection({ ...input, provider: "gitlab" })}
            onSavePat={(host, token) => onSavePat("gitlab", host, token)}
            onBeginOAuth={(input) => onBeginOAuth({ ...input, provider: "gitlab" })}
            onResolveCallback={onResolveCallback}
            onValidateToken={onValidateToken ? (host) => onValidateToken("gitlab", host) : undefined}
            onListenOAuthEvents={onListenOAuthEvents}
          />
        ) : (
          <YouTrackAuthPanel
            connections={connections}
            onSaveConnection={onSaveConnection}
            onSavePat={onSavePat}
            onValidateToken={onValidateToken}
          />
        )}
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
