import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  AuthLaunchPlan,
  GitLabConnectionInput,
  OAuthCallbackResolution,
  ProviderConnection,
} from "@/types/dashboard";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  ExternalLink,
  GitlabIcon,
  KeyRound,
  Loader2,
  LogOut,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type AuthTab = "oauth" | "pat";

interface GitLabAuthPanelProps {
  connections: ProviderConnection[];
  onSaveConnection: (
    input: GitLabConnectionInput,
  ) => Promise<ProviderConnection>;
  onSavePat: (host: string, token: string) => Promise<ProviderConnection>;
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
  onSavePat,
  onBeginOAuth,
  onResolveCallback,
  onListenOAuthEvents,
}: GitLabAuthPanelProps) {
  const primary = useMemo(
    () =>
      connections.find((connection) => connection.isPrimary) ?? connections[0],
    [connections],
  );

  const [tab, setTab] = useState<AuthTab>("pat");
  const [host, setHost] = useState(primary?.host ?? "gitlab.com");
  const [clientId, setClientId] = useState(primary?.clientId ?? "");
  const [pat, setPat] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthSuccess, setOauthSuccess] = useState(false);
  const [launchPlan, setLaunchPlan] = useState<AuthLaunchPlan | null>(null);

  // Listen for deep-link OAuth callbacks
  useEffect(() => {
    if (!onListenOAuthEvents) return;

    let dispose: (() => void) | undefined;
    void onListenOAuthEvents(
      (resolution) => {
        setOauthSuccess(true);
        setLoading(false);
        setError(null);
        setLaunchPlan(null);
        void resolution;
      },
      (errorMessage) => {
        setError(`OAuth callback failed: ${errorMessage}`);
        setLoading(false);
      },
    ).then((cleanup) => {
      dispose = cleanup;
    });

    return () => dispose?.();
  }, [onListenOAuthEvents]);

  const isConnected = primary?.oauthReady && (primary?.clientId || primary?.hasToken);

  async function handleOAuthConnect() {
    if (!host.trim() || !clientId.trim()) {
      setError("Host and Client ID are required for OAuth.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Save the connection first, then start OAuth
      await onSaveConnection({
        host: host.trim(),
        displayName: host.trim(),
        clientId: clientId.trim(),
        preferredScope: "read_api",
        authMode: "OAuth PKCE + PAT fallback",
      });

      const plan = await onBeginOAuth({
        host: host.trim(),
        displayName: host.trim(),
        clientId: clientId.trim(),
        preferredScope: "read_api",
        authMode: "OAuth PKCE + PAT fallback",
      });

      setLaunchPlan(plan);
      // Loading stays true until deep-link callback arrives
    } catch (err) {
      setError(String(err));
      setLoading(false);
    }
  }

  async function handlePATConnect() {
    if (!host.trim() || !pat.trim()) {
      setError("Host and Personal Access Token are required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSavePat(host.trim(), pat.trim());
      setOauthSuccess(true);
      setLoading(false);
    } catch (err) {
      setError(String(err));
      setLoading(false);
    }
  }

  async function handleResolveManual() {
    // Fallback: manual callback URL paste (for when deep-link doesn't fire)
    if (!launchPlan) return;
    const callbackUrl = prompt("Paste the callback URL from your browser:");
    if (!callbackUrl) return;

    try {
      await onResolveCallback(launchPlan.sessionId, callbackUrl);
      setOauthSuccess(true);
      setLaunchPlan(null);
      setLoading(false);
    } catch (err) {
      setError(`Callback validation failed: ${String(err)}`);
    }
  }

  function handleDisconnect() {
    setOauthSuccess(false);
    setLaunchPlan(null);
    setError(null);
    setClientId("");
    setPat("");
  }

  // --- Connected state ---
  if (isConnected || oauthSuccess) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border border-accent/20 bg-accent/5 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              Connected to {primary?.host ?? host}
            </p>
            <p className="text-xs text-muted-foreground">
              {primary?.authMode ?? (tab === "oauth" ? "OAuth PKCE" : "Personal Access Token")} &middot; {primary?.preferredScope ?? "read_api"}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDisconnect}>
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Disconnect
          </Button>
        </div>
      </div>
    );
  }

  // --- Setup flow ---
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-muted">
          <GitlabIcon className="h-5 w-5 text-secondary" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">
            Connect GitLab
          </h3>
          <p className="text-xs text-muted-foreground">
            Link your GitLab account to start tracking time.
          </p>
        </div>
      </div>

      {/* Auth method tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted p-1">
        <button
          type="button"
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
            tab === "pat"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => { setTab("pat"); setError(null); }}
        >
          <KeyRound className="h-3.5 w-3.5" />
          Access Token
          <span className="text-xs text-muted-foreground">(quick)</span>
        </button>
        <button
          type="button"
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
            tab === "oauth"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => { setTab("oauth"); setError(null); }}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          OAuth
        </button>
      </div>

      {/* Host field (shared) */}
      <div className="space-y-1.5">
        <Label htmlFor="gitlab-host">GitLab host</Label>
        <Input
          id="gitlab-host"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="gitlab.com"
        />
      </div>

      {/* PAT flow */}
      {tab === "pat" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="gitlab-pat">Personal Access Token</Label>
            <Input
              id="gitlab-pat"
              type="password"
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
            />
            <p className="text-xs text-muted-foreground">
              Need a token?{" "}
              <a
                href={`https://${host.trim() || "gitlab.com"}/-/user_settings/personal_access_tokens?name=Pulseboard&scopes=read_api`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Create one on {host.trim() || "gitlab.com"}
              </a>{" "}
              with <code className="font-mono text-foreground/80">read_api</code> scope.
            </p>
          </div>

          <Button
            onClick={handlePATConnect}
            disabled={loading || !host.trim() || !pat.trim()}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="mr-2 h-4 w-4" />
            )}
            {loading ? "Connecting..." : "Connect with Token"}
          </Button>
        </div>
      )}

      {/* OAuth flow */}
      {tab === "oauth" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="gitlab-client-id">OAuth Application ID</Label>
            <Input
              id="gitlab-client-id"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Your GitLab application ID"
            />
            <p className="text-xs text-muted-foreground">
              <a
                href={`https://${host.trim() || "gitlab.com"}/-/user_settings/applications`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Create an OAuth app
              </a>{" "}
              and set the redirect URI to{" "}
              <code className="font-mono text-foreground/80">pulseboard://auth/gitlab</code>
            </p>
          </div>

          {/* Waiting for callback state */}
          {launchPlan && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <p className="text-sm font-medium text-foreground">
                  Waiting for GitLab authorization...
                </p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Complete the sign-in in the auth window. The app will detect the callback automatically.
              </p>
              <button
                type="button"
                className="mt-3 text-xs text-primary underline underline-offset-2 cursor-pointer hover:text-primary/80"
                onClick={handleResolveManual}
              >
                Callback didn't work? Paste it manually
              </button>
            </div>
          )}

          <Button
            onClick={handleOAuthConnect}
            disabled={loading || !host.trim() || !clientId.trim()}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GitlabIcon className="mr-2 h-4 w-4" />
            )}
            {loading ? "Connecting..." : "Connect with GitLab"}
          </Button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
