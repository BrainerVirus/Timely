import CheckCircle2 from "lucide-react/dist/esm/icons/circle-check.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import LogOut from "lucide-react/dist/esm/icons/log-out.js";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { type AuthPhase } from "@/domains/gitlab-connection/state/gitlab-auth-panel-state/gitlab-auth-panel-state";
import { Button } from "@/shared/ui/Button/Button";

interface GitLabConnectedStateProps {
  host: string;
  authMode: string;
  preferredScope: string;
  phase: Extract<AuthPhase, { status: "connected" | "validating" }>;
  onDisconnect: () => void;
}

export function GitLabConnectedState({
  host,
  authMode,
  preferredScope,
  phase,
  onDisconnect,
}: Readonly<GitLabConnectedStateProps>) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border-2 border-success/35 bg-success/10 p-4 shadow-clay">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {t("providers.connectedToHost", { host })}
          </p>
          <p className="text-xs text-muted-foreground">
            <ConnectedStatusLine
              phase={phase}
              authMode={authMode}
              preferredScope={preferredScope}
            />
          </p>
        </div>
        <Button variant="ghost" onClick={onDisconnect}>
          <LogOut className="mr-1.5 h-3.5 w-3.5" />
          {t("providers.disconnect")}
        </Button>
      </div>
    </div>
  );
}

function ConnectedStatusLine({
  phase,
  authMode,
  preferredScope,
}: Readonly<{
  phase: Extract<AuthPhase, { status: "connected" | "validating" }>;
  authMode: string;
  preferredScope: string;
}>) {
  const { t } = useI18n();

  if (phase.status === "validating") {
    return (
      <span className="flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        {t("providers.validatingToken")}
      </span>
    );
  }

  if (phase.user) {
    return (
      <>
        {t("providers.authenticatedAs", {
          username: phase.user.username,
          name: phase.user.name,
        })}
      </>
    );
  }

  return (
    <>
      {authMode} &middot; {preferredScope}
    </>
  );
}
