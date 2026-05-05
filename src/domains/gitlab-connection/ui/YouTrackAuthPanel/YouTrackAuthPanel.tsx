import Compass from "lucide-react/dist/esm/icons/compass.js";
import KeyRound from "lucide-react/dist/esm/icons/key-round.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import { useState } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { Button } from "@/shared/ui/Button/Button";
import { Input } from "@/shared/ui/Input/Input";
import { Label } from "@/shared/ui/Label/Label";

import type { ProviderConnection, ProviderConnectionInput } from "@/shared/types/dashboard";

interface YouTrackAuthPanelProps {
  connections: ProviderConnection[];
  onSaveConnection: (input: ProviderConnectionInput) => Promise<ProviderConnection>;
  onSavePat: (provider: "youtrack", host: string, token: string) => Promise<ProviderConnection>;
  onValidateToken?: (provider: "youtrack", host: string) => Promise<{ username: string }>;
}

export function YouTrackAuthPanel({
  connections,
  onSaveConnection,
  onSavePat,
  onValidateToken,
}: Readonly<YouTrackAuthPanelProps>) {
  const { t } = useI18n();
  const youTrackConnection = connections.find((item) => item.provider.toLowerCase() === "youtrack");
  const [host, setHost] = useState(youTrackConnection?.host ?? "");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const connected = youTrackConnection?.hasToken === true;

  async function handleConnect() {
    if (host.trim().length === 0 || token.trim().length === 0) {
      setStatus(t("providers.hostAndTokenRequired"));
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      await onSaveConnection({
        provider: "youtrack",
        host,
        authMode: "PAT",
        preferredScope: "api",
        displayName: "YouTrack workspace",
      });
      await onSavePat("youtrack", host, token);
      if (onValidateToken) {
        await onValidateToken("youtrack", host);
      }
      setStatus(t("providers.youTrackConnected"));
      setToken("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("providers.connectionFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl border-2 border-border-subtle bg-field shadow-clay">
          <Compass className="h-5 w-5 text-secondary" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">
            {t("providers.connectYouTrack")}
          </h3>
          <p className="text-xs text-muted-foreground">{t("providers.linkYouTrack")}</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{t("providers.youTrackTokenHint")}</p>

      <div className="space-y-1.5">
        <Label htmlFor="youtrack-host">{t("providers.youTrackHost")}</Label>
        <Input
          id="youtrack-host"
          value={host}
          onChange={(event) => setHost(event.target.value)}
          placeholder="your-company.youtrack.cloud"
          disabled={busy}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="youtrack-token">{t("providers.youTrackToken")}</Label>
        <Input
          id="youtrack-token"
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="perm:xxxxxxxx"
          disabled={busy}
        />
      </div>

      <Button
        onClick={() => void handleConnect()}
        disabled={busy || !host.trim() || !token.trim()}
        className="w-full"
      >
        {busy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <KeyRound className="mr-2 h-4 w-4" />
        )}
        {busy
          ? t("common.syncing")
          : connected
            ? t("providers.connectWithToken")
            : t("providers.connectWithToken")}
      </Button>

      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
    </div>
  );
}
