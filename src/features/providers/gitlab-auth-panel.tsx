import { Button } from "@/components/ui/button";
import type {
  AuthLaunchPlan,
  GitLabConnectionInput,
  OAuthCallbackResolution,
  ProviderConnection,
} from "@/types/dashboard";
import { ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface GitLabAuthPanelProps {
  connections: ProviderConnection[];
  onSaveConnection: (
    input: GitLabConnectionInput,
  ) => Promise<ProviderConnection>;
  onBeginOAuth: (input: GitLabConnectionInput) => Promise<AuthLaunchPlan>;
  onResolveCallback: (
    sessionId: string,
    callbackUrl: string,
  ) => Promise<OAuthCallbackResolution>;
  onListenOAuthEvents?: (
    onSuccess: (payload: OAuthCallbackResolution) => void,
    onError: (message: string) => void,
  ) => Promise<() => void>;
}

export function GitLabAuthPanel({
  connections,
  onSaveConnection,
  onBeginOAuth,
  onResolveCallback,
  onListenOAuthEvents,
}: GitLabAuthPanelProps) {
  const primary = useMemo(
    () =>
      connections.find((connection) => connection.isPrimary) ?? connections[0],
    [connections],
  );
  const [host, setHost] = useState(primary?.host ?? "gitlab.com");
  const [displayName, setDisplayName] = useState(
    primary?.displayName ?? "My GitLab",
  );
  const [clientId, setClientId] = useState(primary?.clientId ?? "");
  const [preferredScope, setPreferredScope] = useState(
    primary?.preferredScope ?? "read_api",
  );
  const [authMode, setAuthMode] = useState(
    primary?.authMode ?? "OAuth PKCE + PAT fallback",
  );
  const [message, setMessage] = useState(
    "Store your GitLab host locally first, then trigger the OAuth launcher.",
  );
  const [launchPlan, setLaunchPlan] = useState<AuthLaunchPlan | null>(null);
  const [callbackUrl, setCallbackUrl] = useState("");

  useEffect(() => {
    if (!onListenOAuthEvents) {
      return;
    }

    let dispose: (() => void) | undefined;
    void onListenOAuthEvents(
      (resolution) => {
        setMessage(
          `Deep link received for ${resolution.host}. Received code ${resolution.code}. PKCE verifier is ready for exchange.`,
        );
      },
      (errorMessage) => {
        setMessage(`Deep link callback failed validation: ${errorMessage}`);
      },
    ).then((cleanup) => {
      dispose = cleanup;
    });

    return () => {
      dispose?.();
    };
  }, [onListenOAuthEvents]);

  async function handleSave() {
    try {
      const saved = await onSaveConnection({
        host,
        displayName,
        clientId,
        preferredScope,
        authMode,
      });
      setHost(saved.host);
      setDisplayName(saved.displayName);
      setClientId(saved.clientId ?? "");
      setPreferredScope(saved.preferredScope);
      setMessage(`Saved ${saved.displayName} on ${saved.host}.`);
    } catch (error) {
      setMessage(String(error));
    }
  }

  async function handleBeginOAuth() {
    try {
      const plan = await onBeginOAuth({
        host,
        displayName,
        clientId,
        preferredScope,
        authMode,
      });
      setLaunchPlan(plan);
      setMessage(
        `${plan.message} Auth window opened. Redirect: ${plan.redirectStrategy}. Scope: ${plan.scope}.`,
      );
    } catch (error) {
      setMessage(String(error));
    }
  }

  async function handleResolveCallback() {
    if (!launchPlan || !callbackUrl.trim()) {
      return;
    }

    try {
      const resolution = await onResolveCallback(
        launchPlan.sessionId,
        callbackUrl.trim(),
      );
      setMessage(
        `Validated callback for ${resolution.host}. Received code ${resolution.code}. PKCE verifier is ready for exchange.`,
      );
    } catch (error) {
      setMessage(String(error));
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-muted">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs tracking-wide uppercase text-muted-foreground">
            GitLab auth
          </p>
          <h3 className="font-display text-xl font-semibold text-foreground">
            Connection setup
          </h3>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm text-muted-foreground">
          <span>GitLab host</span>
          <input
            className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-foreground outline-none transition focus:border-ring"
            value={host}
            onChange={(event) => setHost(event.target.value)}
            placeholder="gitlab.com"
          />
        </label>

        <label className="space-y-1.5 text-sm text-muted-foreground">
          <span>Display name</span>
          <input
            className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-foreground outline-none transition focus:border-ring"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="My GitLab"
          />
        </label>

        <label className="space-y-1.5 text-sm text-muted-foreground sm:col-span-2">
          <span>GitLab OAuth client ID</span>
          <input
            className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-foreground outline-none transition focus:border-ring"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            placeholder="application-id-from-gitlab"
          />
        </label>

        <label className="space-y-1.5 text-sm text-muted-foreground">
          <span>Preferred scope</span>
          <select
            className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-foreground outline-none transition focus:border-ring"
            value={preferredScope}
            onChange={(event) => setPreferredScope(event.target.value)}
          >
            <option value="read_api">read_api</option>
            <option value="read_api read_user">read_api + read_user</option>
          </select>
        </label>

        <label className="space-y-1.5 text-sm text-muted-foreground">
          <span>Auth mode</span>
          <select
            className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-foreground outline-none transition focus:border-ring"
            value={authMode}
            onChange={(event) => setAuthMode(event.target.value)}
          >
            <option value="OAuth PKCE + PAT fallback">
              OAuth PKCE + PAT fallback
            </option>
            <option value="PAT fallback">PAT fallback</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave}>Save provider setup</Button>
        <Button variant="ghost" onClick={handleBeginOAuth}>
          Open auth window
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
        Use a real GitLab OAuth application client ID here and make sure the
        redirect URI in GitLab is exactly{" "}
        <code className="font-mono text-foreground">
          pulseboard://auth/gitlab
        </code>
        .
      </div>

      {launchPlan ? (
        <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-xs tracking-wide uppercase text-muted-foreground">
            OAuth PKCE session
          </p>
          <p className="break-all text-sm text-muted-foreground">
            {launchPlan.authorizeUrl}
          </p>
          <p className="text-xs text-muted-foreground">
            The desktop app opens this flow in a dedicated auth window.
          </p>
          <label className="space-y-1.5 text-sm text-muted-foreground">
            <span>Paste callback URL</span>
            <input
              className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-foreground outline-none transition focus:border-ring"
              value={callbackUrl}
              onChange={(event) => setCallbackUrl(event.target.value)}
              placeholder="pulseboard://auth/gitlab?code=...&state=..."
            />
          </label>
          <Button variant="soft" onClick={handleResolveCallback}>
            Validate callback
          </Button>
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
        {message}
      </div>
    </div>
  );
}
