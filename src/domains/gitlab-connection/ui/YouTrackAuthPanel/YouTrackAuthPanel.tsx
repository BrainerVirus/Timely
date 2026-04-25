import { useState } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { Button } from "@/shared/ui/Button/Button";

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
      setStatus(t("settings.tryAgain"));
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
      setStatus("YouTrack connected.");
      setToken("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("settings.tryAgain"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">
          Connect with permanent token. OAuth not required.
        </p>
      </div>
      <label className="block space-y-2">
        <span className="text-sm font-medium">Host</span>
        <input
          className="w-full rounded-xl border border-border-subtle bg-panel px-3 py-2"
          placeholder="your-company.youtrack.cloud"
          value={host}
          onChange={(event) => setHost(event.target.value)}
          disabled={busy}
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium">Token</span>
        <input
          type="password"
          className="w-full rounded-xl border border-border-subtle bg-panel px-3 py-2"
          placeholder="perm:xxxxxxxx"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          disabled={busy}
        />
      </label>
      <div className="flex items-center gap-3">
        <Button onClick={() => void handleConnect()} disabled={busy}>
          {connected ? "Reconnect YouTrack" : "Connect YouTrack"}
        </Button>
        {connected ? <span className="text-sm text-success">Connected</span> : null}
      </div>
      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
    </div>
  );
}
