import { CheckCircle2, ExternalLink, GitlabIcon, KeyRound, Loader2, LogOut } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNotify } from "@/hooks/use-notify";
import { cn } from "@/lib/utils";

import type {
  AuthLaunchPlan,
  GitLabConnectionInput,
  GitLabUserInfo,
  OAuthCallbackResolution,
  ProviderConnection,
} from "@/types/dashboard";

type AuthTab = "oauth" | "pat";

// Discriminated union for the auth lifecycle — impossible states are unrepresentable
type AuthPhase =
  | { status: "idle"; error?: string }
  | { status: "connecting" }
  | { status: "awaitingCallback"; launchPlan: AuthLaunchPlan }
  | { status: "validating" }
  | { status: "connected"; user?: GitLabUserInfo };

interface GitLabAuthPanelProps {
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

export function GitLabAuthPanel({
  connections,
  onSaveConnection,
  onSavePat,
  onBeginOAuth,
  onResolveCallback,
  onValidateToken,
  onListenOAuthEvents,
}: GitLabAuthPanelProps) {
  const primary = useMemo(
    () => connections.find((connection) => connection.isPrimary) ?? connections[0],
    [connections],
  );
  const notify = useNotify();

  // Form fields (not part of auth lifecycle)
  const [tab, setTab] = useState<AuthTab>("pat");
  const [host, setHost] = useState(primary?.host ?? "gitlab.com");
  const [clientId, setClientId] = useState(primary?.clientId ?? "");
  const [pat, setPat] = useState("");

  // Auth lifecycle state machine
  const [phase, setPhase] = useState<AuthPhase>({ status: "idle" });

  // Listen for deep-link OAuth callbacks
  useEffect(() => {
    if (!onListenOAuthEvents) return;

    let dispose: (() => void) | undefined;
    void onListenOAuthEvents(
      () => {
        setPhase({ status: "connected" });
        notify.success("GitLab linked", "OAuth authentication complete.");
      },
      (errorMessage) => {
        setPhase({ status: "idle", error: `OAuth callback failed: ${errorMessage}` });
        notify.error("OAuth failed", errorMessage);
      },
    ).then((cleanup) => {
      dispose = cleanup;
    });

    return () => dispose?.();
  }, [onListenOAuthEvents, notify]);

  const isConnected = primary?.oauthReady && (primary?.clientId || primary?.hasToken);
  const busy = phase.status === "connecting" || phase.status === "awaitingCallback";

  async function handleOAuthConnect() {
    if (!host.trim() || !clientId.trim()) {
      setPhase({ status: "idle", error: "Host and Client ID are required for OAuth." });
      return;
    }

    setPhase({ status: "connecting" });

    try {
      const input: GitLabConnectionInput = {
        host: host.trim(),
        displayName: host.trim(),
        clientId: clientId.trim(),
        preferredScope: "read_api",
        authMode: "OAuth PKCE + PAT fallback",
      };
      await onSaveConnection(input);
      const plan = await onBeginOAuth(input);
      setPhase({ status: "awaitingCallback", launchPlan: plan });
    } catch (err) {
      setPhase({ status: "idle", error: String(err) });
      notify.error("Connection failed", String(err));
    }
  }

  async function handlePATConnect() {
    if (!host.trim() || !pat.trim()) {
      setPhase({ status: "idle", error: "Host and Personal Access Token are required." });
      return;
    }

    setPhase({ status: "connecting" });

    try {
      await onSavePat(host.trim(), pat.trim());
      notify.success("Connected to GitLab", `Token saved for ${host.trim()}`);

      // Auto-validate the token to show the real username
      if (onValidateToken) {
        setPhase({ status: "validating" });
        try {
          const userInfo = await onValidateToken(host.trim());
          setPhase({ status: "connected", user: userInfo });
          notify.success("Token validated", `Authenticated as @${userInfo.username}`);
        } catch (err) {
          // Token saved but validation failed — still connected
          setPhase({ status: "connected" });
          notify.error("Token validation failed", String(err));
        }
      } else {
        setPhase({ status: "connected" });
      }
    } catch (err) {
      setPhase({ status: "idle", error: String(err) });
      notify.error("Connection failed", String(err));
    }
  }

  async function handleResolveManual() {
    if (phase.status !== "awaitingCallback") return;
    const callbackUrl = prompt("Paste the callback URL from your browser:");
    if (!callbackUrl) return;

    try {
      await onResolveCallback(phase.launchPlan.sessionId, callbackUrl);
      setPhase({ status: "connected" });
    } catch (err) {
      setPhase({ status: "idle", error: `Callback validation failed: ${String(err)}` });
    }
  }

  function handleDisconnect() {
    setPhase({ status: "idle" });
    setClientId("");
    setPat("");
  }

  // --- Connected state ---
  if (isConnected || phase.status === "connected") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border border-accent/20 bg-accent/5 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              Connected to {primary?.host ?? host}
            </p>
            <p className="text-xs text-muted-foreground">
              {phase.status === "validating" ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Validating token...
                </span>
              ) : phase.status === "connected" && phase.user ? (
                <>
                  Authenticated as{" "}
                  <span className="font-medium text-foreground">@{phase.user.username}</span> (
                  {phase.user.name})
                </>
              ) : (
                <>
                  {primary?.authMode ?? (tab === "oauth" ? "OAuth PKCE" : "Personal Access Token")}{" "}
                  &middot; {primary?.preferredScope ?? "read_api"}
                </>
              )}
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
          <h3 className="font-display text-lg font-semibold text-foreground">Connect GitLab</h3>
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
            "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            tab === "pat"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => {
            setTab("pat");
            setPhase({ status: "idle" });
          }}
        >
          <KeyRound className="h-3.5 w-3.5" />
          Access Token
          <span className="text-xs text-muted-foreground">(quick)</span>
        </button>
        <button
          type="button"
          className={cn(
            "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            tab === "oauth"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => {
            setTab("oauth");
            setPhase({ status: "idle" });
          }}
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
            disabled={busy || !host.trim() || !pat.trim()}
            className="w-full"
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="mr-2 h-4 w-4" />
            )}
            {busy ? "Connecting..." : "Connect with Token"}
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
              with scopes <code className="font-mono text-foreground/80">read_api</code> and{" "}
              <code className="font-mono text-foreground/80">read_user</code>. Set the redirect URI
              to <code className="font-mono text-foreground/80">pulseboard://auth/gitlab</code>
            </p>
          </div>

          {/* Waiting for callback state */}
          {phase.status === "awaitingCallback" && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <p className="text-sm font-medium text-foreground">
                  Waiting for GitLab authorization...
                </p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Complete the sign-in in the auth window. The app will detect the callback
                automatically.
              </p>
              <button
                type="button"
                className="mt-3 cursor-pointer text-xs text-primary underline underline-offset-2 hover:text-primary/80"
                onClick={handleResolveManual}
              >
                Callback didn't work? Paste it manually
              </button>
            </div>
          )}

          <Button
            onClick={handleOAuthConnect}
            disabled={busy || !host.trim() || !clientId.trim()}
            className="w-full"
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GitlabIcon className="mr-2 h-4 w-4" />
            )}
            {busy ? "Connecting..." : "Connect with GitLab"}
          </Button>
        </div>
      )}

      {/* Error message */}
      {phase.status === "idle" && phase.error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {phase.error}
        </div>
      )}
    </div>
  );
}
