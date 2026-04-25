import Plug from "lucide-react/dist/esm/icons/plug.js";
import { m } from "motion/react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { GitLabAuthPanel } from "@/domains/gitlab-connection/ui/GitLabAuthPanel/GitLabAuthPanel";
import { YouTrackAuthPanel } from "@/domains/gitlab-connection/ui/YouTrackAuthPanel/YouTrackAuthPanel";
import { staggerItem } from "@/shared/lib/animations/animations";
import { AccordionItem } from "@/shared/ui/Accordion/Accordion";
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

export interface SettingsConnectionSectionProps {
  connectionSummary: string;
  isConnected: boolean;
  connections: ProviderConnection[];
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

export function SettingsConnectionSection({
  connectionSummary,
  isConnected,
  connections,
  onSaveConnection,
  onSavePat,
  onBeginOAuth,
  onResolveCallback,
  onValidateToken,
  onListenOAuthEvents,
}: Readonly<SettingsConnectionSectionProps>) {
  const { t } = useI18n();
  const { allowDecorativeAnimation } = useMotionSettings();
  const [provider, setProvider] = useState<ProviderKey>("gitlab");

  return (
    <m.div variants={staggerItem} data-onboarding="connection-section">
      <AccordionItem
        title={t("settings.connection")}
        icon={Plug}
        summary={connectionSummary}
        summaryClassName={isConnected ? "text-success" : undefined}
        defaultOpen={!isConnected}
        allowDecorativeAnimation={allowDecorativeAnimation}
      >
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
      </AccordionItem>
    </m.div>
  );
}
