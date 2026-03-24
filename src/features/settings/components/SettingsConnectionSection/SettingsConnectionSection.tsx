import Plug from "lucide-react/dist/esm/icons/plug.js";
import { m } from "motion/react";
import { useI18n } from "@/core/services/I18nService/i18n";
import { useMotionSettings } from "@/core/services/MotionService/motion";
import { GitLabAuthPanel } from "@/features/settings/components/GitLabAuthPanel/GitLabAuthPanel";
import { AccordionItem } from "@/shared/components/Accordion/Accordion";
import { staggerItem } from "@/shared/utils/animations";

import type {
  AuthLaunchPlan,
  GitLabConnectionInput,
  GitLabUserInfo,
  OAuthCallbackResolution,
  ProviderConnection,
} from "@/shared/types/dashboard";

export interface SettingsConnectionSectionProps {
  connectionSummary: string;
  isConnected: boolean;
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
        <GitLabAuthPanel
          connections={connections}
          onSaveConnection={onSaveConnection}
          onSavePat={onSavePat}
          onBeginOAuth={onBeginOAuth}
          onResolveCallback={onResolveCallback}
          onValidateToken={onValidateToken}
          onListenOAuthEvents={onListenOAuthEvents}
        />
      </AccordionItem>
    </m.div>
  );
}
