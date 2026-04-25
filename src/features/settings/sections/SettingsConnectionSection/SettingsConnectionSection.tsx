import Compass from "lucide-react/dist/esm/icons/compass.js";
import GitlabIcon from "lucide-react/dist/esm/icons/gitlab.js";
import Plug from "lucide-react/dist/esm/icons/plug.js";
import { m } from "motion/react";
import { useState } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { GitLabAuthPanel } from "@/domains/gitlab-connection/ui/GitLabAuthPanel/GitLabAuthPanel";
import { ProviderConnectionRow } from "@/domains/gitlab-connection/ui/ProviderConnectionRow/ProviderConnectionRow";
import { YouTrackAuthPanel } from "@/domains/gitlab-connection/ui/YouTrackAuthPanel/YouTrackAuthPanel";
import { staggerItem } from "@/shared/lib/animations/animations";
import { isConnectionActive } from "@/shared/types/dashboard";
import { AccordionItem } from "@/shared/ui/Accordion/Accordion";

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
  const [expandedProvider, setExpandedProvider] = useState<ProviderKey | null>(null);
  const [disconnectedProviders, setDisconnectedProviders] = useState<Set<ProviderKey>>(
    () => new Set(),
  );

  const visibleConnections = connections.filter(
    (c) => !disconnectedProviders.has(c.provider.toLowerCase() as ProviderKey),
  );
  const gitlabConns = visibleConnections.filter((c) => c.provider.toLowerCase() === "gitlab");
  const youtrackConns = visibleConnections.filter((c) => c.provider.toLowerCase() === "youtrack");
  const gitlabConnected = gitlabConns.some(isConnectionActive);
  const youtrackConnected = youtrackConns.some(isConnectionActive);
  const gitlabPrimary = gitlabConns.find((c) => c.isPrimary) ?? gitlabConns[0];
  const youtrackPrimary = youtrackConns.find((c) => c.isPrimary) ?? youtrackConns[0];

  function handleToggle(provider: ProviderKey) {
    setExpandedProvider((prev) => (prev === provider ? null : provider));
  }

  function handleDisconnect(provider: ProviderKey) {
    setDisconnectedProviders((prev) => new Set(prev).add(provider));
    setExpandedProvider(null);
  }

  async function saveConnection(input: ProviderConnectionInput) {
    const saved = await onSaveConnection(input);
    setDisconnectedProviders((prev) => {
      const next = new Set(prev);
      next.delete(saved.provider.toLowerCase() as ProviderKey);
      return next;
    });
    return saved;
  }

  async function savePat(provider: ProviderKey, host: string, token: string) {
    const saved = await onSavePat(provider, host, token);
    setDisconnectedProviders((prev) => {
      const next = new Set(prev);
      next.delete(provider);
      return next;
    });
    return saved;
  }

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
        <div className="space-y-3">
          <ProviderConnectionRow
            providerName="GitLab"
            providerIcon={GitlabIcon}
            isConnected={gitlabConnected}
            connectionSummary={
              gitlabConnected && gitlabPrimary
                ? t("providers.connectedToHost", { host: gitlabPrimary.host })
                : undefined
            }
            isExpanded={expandedProvider === "gitlab"}
            onToggle={() => handleToggle("gitlab")}
            onDisconnect={() => handleDisconnect("gitlab")}
          >
            <GitLabAuthPanel
              connections={gitlabConns}
              onSaveConnection={(input) => saveConnection({ ...input, provider: "gitlab" })}
              onSavePat={(host, token) => savePat("gitlab", host, token)}
              onBeginOAuth={(input) => onBeginOAuth({ ...input, provider: "gitlab" })}
              onResolveCallback={onResolveCallback}
              onValidateToken={
                onValidateToken ? (host) => onValidateToken("gitlab", host) : undefined
              }
              onListenOAuthEvents={onListenOAuthEvents}
            />
          </ProviderConnectionRow>

          <ProviderConnectionRow
            providerName="YouTrack"
            providerIcon={Compass}
            isConnected={youtrackConnected}
            connectionSummary={
              youtrackConnected && youtrackPrimary
                ? t("providers.connectedToHost", { host: youtrackPrimary.host })
                : undefined
            }
            isExpanded={expandedProvider === "youtrack"}
            onToggle={() => handleToggle("youtrack")}
            onDisconnect={() => handleDisconnect("youtrack")}
          >
            <YouTrackAuthPanel
              connections={youtrackConns}
              onSaveConnection={saveConnection}
              onSavePat={savePat}
              onValidateToken={onValidateToken}
            />
          </ProviderConnectionRow>
        </div>
      </AccordionItem>
    </m.div>
  );
}
