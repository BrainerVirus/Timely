import CheckCircle2 from "lucide-react/dist/esm/icons/circle-check.js";
import ExternalLink from "lucide-react/dist/esm/icons/external-link.js";
import GitlabIcon from "lucide-react/dist/esm/icons/gitlab.js";
import KeyRound from "lucide-react/dist/esm/icons/key-round.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import LogOut from "lucide-react/dist/esm/icons/log-out.js";
import { useEffect, useEffectEvent, useReducer } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNotify } from "@/hooks/use-notify";
import { getNeutralSegmentedControlClassName } from "@/lib/control-styles";
import { useI18n } from "@/lib/i18n";
import { findPrimaryConnection, isConnectionActive } from "@/types/dashboard";

import type {
  AuthLaunchPlan,
  GitLabConnectionInput,
  GitLabUserInfo,
  OAuthCallbackResolution,
  ProviderConnection,
} from "@/types/dashboard";

type AuthTab = "oauth" | "pat";

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

interface GitLabAuthPanelState {
  tab: AuthTab;
  host: string;
  clientId: string;
  pat: string;
  phase: AuthPhase;
}

type GitLabAuthPanelAction =
  | { type: "setTab"; tab: AuthTab }
  | { type: "setHost"; host: string }
  | { type: "setClientId"; clientId: string }
  | { type: "setPat"; pat: string }
  | { type: "setPhase"; phase: AuthPhase }
  | { type: "resetCredentials" };

function createInitialGitLabAuthPanelState(primary?: ProviderConnection): GitLabAuthPanelState {
  return {
    tab: "pat",
    host: primary?.host ?? "gitlab.com",
    clientId: primary?.clientId ?? "",
    pat: "",
    phase: { status: "idle" },
  };
}

function gitLabAuthPanelReducer(
  state: GitLabAuthPanelState,
  action: GitLabAuthPanelAction,
): GitLabAuthPanelState {
  switch (action.type) {
    case "setTab":
      return { ...state, tab: action.tab, phase: { status: "idle" } };
    case "setHost":
      return { ...state, host: action.host };
    case "setClientId":
      return { ...state, clientId: action.clientId };
    case "setPat":
      return { ...state, pat: action.pat };
    case "setPhase":
      return { ...state, phase: action.phase };
    case "resetCredentials":
      return { ...state, clientId: "", pat: "", phase: { status: "idle" } };
    default:
      return state;
  }
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
  const primary = findPrimaryConnection(connections);
  const notify = useNotify();
  const { t } = useI18n();

  const [state, dispatch] = useReducer(
    gitLabAuthPanelReducer,
    primary,
    createInitialGitLabAuthPanelState,
  );
  const { tab, host, clientId, pat, phase } = state;

  const isConnected = primary != null && isConnectionActive(primary);
  const busy = phase.status === "connecting" || phase.status === "awaitingCallback";
  const connectionPhase: Extract<AuthPhase, { status: "connected" | "validating" }> =
    phase.status === "connected" || phase.status === "validating" ? phase : { status: "connected" };

  const handleOAuthSuccess = useEffectEvent((_payload: OAuthCallbackResolution) => {
    dispatch({ type: "setPhase", phase: { status: "connected" } });
    notify.success(t("providers.gitLabLinked"), t("providers.oauthComplete"));
  });

  const handleOAuthError = useEffectEvent((errorMessage: string) => {
    dispatch({
      type: "setPhase",
      phase: { status: "idle", error: t("providers.oauthCallbackFailed", { error: errorMessage }) },
    });
    notify.error(t("providers.oauthFailed"), errorMessage);
  });

  useEffect(() => {
    if (!onListenOAuthEvents) return;

    let dispose: (() => void) | undefined;

    void onListenOAuthEvents(handleOAuthSuccess, handleOAuthError).then((cleanup) => {
      dispose = cleanup;
    });

    return () => dispose?.();
  }, [onListenOAuthEvents]);

  async function handleOAuthConnect() {
    if (!host.trim() || !clientId.trim()) {
      dispatch({
        type: "setPhase",
        phase: { status: "idle", error: t("providers.hostAndClientRequired") },
      });
      return;
    }

    dispatch({ type: "setPhase", phase: { status: "connecting" } });

    try {
      const input: GitLabConnectionInput = {
        host: host.trim(),
        displayName: host.trim(),
        clientId: clientId.trim(),
        preferredScope: "read_api",
        authMode: t("providers.oauthPkceFallback"),
      };

      await onSaveConnection(input);
      const plan = await onBeginOAuth(input);
      dispatch({ type: "setPhase", phase: { status: "awaitingCallback", launchPlan: plan } });
    } catch (err) {
      dispatch({ type: "setPhase", phase: { status: "idle", error: String(err) } });
      notify.error(t("providers.connectionFailed"), String(err));
    }
  }

  async function handlePatConnect() {
    if (!host.trim() || !pat.trim()) {
      dispatch({
        type: "setPhase",
        phase: { status: "idle", error: t("providers.hostAndTokenRequired") },
      });
      return;
    }

    dispatch({ type: "setPhase", phase: { status: "connecting" } });

    try {
      await onSavePat(host.trim(), pat.trim());
      notify.success(
        t("providers.connectedToGitLab"),
        t("providers.tokenSavedFor", { host: host.trim() }),
      );

      if (!onValidateToken) {
        dispatch({ type: "setPhase", phase: { status: "connected" } });
        return;
      }

      dispatch({ type: "setPhase", phase: { status: "validating" } });

      try {
        const userInfo = await onValidateToken(host.trim());
        dispatch({ type: "setPhase", phase: { status: "connected", user: userInfo } });
        notify.success(
          t("providers.tokenValidated"),
          t("providers.authenticatedUser", { username: userInfo.username }),
        );
      } catch (err) {
        dispatch({ type: "setPhase", phase: { status: "connected" } });
        notify.error(t("providers.tokenValidationFailed"), String(err));
      }
    } catch (err) {
      dispatch({ type: "setPhase", phase: { status: "idle", error: String(err) } });
      notify.error(t("providers.connectionFailed"), String(err));
    }
  }

  async function handleResolveManual() {
    if (phase.status !== "awaitingCallback") return;

    const callbackUrl = prompt(t("providers.manualCallbackPrompt"));
    if (!callbackUrl) return;

    try {
      await onResolveCallback(phase.launchPlan.sessionId, callbackUrl);
      dispatch({ type: "setPhase", phase: { status: "connected" } });
      notify.success(t("providers.gitLabLinked"), t("providers.manualCallbackResolved"));
    } catch (err) {
      dispatch({
        type: "setPhase",
        phase: {
          status: "idle",
          error: t("providers.callbackValidationFailed", { error: String(err) }),
        },
      });
    }
  }

  function handleDisconnect() {
    dispatch({ type: "resetCredentials" });
  }

  if (isConnected || phase.status === "connected" || phase.status === "validating") {
    return (
      <ConnectedState
        host={primary?.host ?? host}
        authMode={
          primary?.authMode ??
          (tab === "oauth" ? t("providers.oauthPkce") : t("providers.personalAccessToken"))
        }
        preferredScope={primary?.preferredScope ?? "read_api"}
        phase={connectionPhase}
        onDisconnect={handleDisconnect}
      />
    );
  }

  return (
    <div className="space-y-5">
      <PanelHeader />

      <AuthMethodTabs
        tab={tab}
        onChange={(nextTab) => dispatch({ type: "setTab", tab: nextTab })}
      />

      <HostField
        host={host}
        onChange={(nextHost) => dispatch({ type: "setHost", host: nextHost })}
      />

      {tab === "pat" ? (
        <PatSection
          host={host}
          pat={pat}
          busy={busy}
          onPatChange={(nextPat) => dispatch({ type: "setPat", pat: nextPat })}
          onConnect={handlePatConnect}
        />
      ) : null}

      {tab === "oauth" ? (
        <OAuthSection
          host={host}
          clientId={clientId}
          busy={busy}
          phase={phase}
          onClientIdChange={(nextClientId) =>
            dispatch({ type: "setClientId", clientId: nextClientId })
          }
          onConnect={handleOAuthConnect}
          onResolveManual={handleResolveManual}
        />
      ) : null}

      {phase.status === "idle" && phase.error ? (
        <div className="rounded-xl border-2 border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive shadow-[var(--shadow-clay)]">
          {phase.error}
        </div>
      ) : null}
    </div>
  );
}

function PanelHeader() {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] shadow-[var(--shadow-clay)]">
        <GitlabIcon className="h-5 w-5 text-secondary" />
      </div>
      <div>
        <h3 className="font-display text-lg font-semibold text-foreground">
          {t("providers.connectGitLab")}
        </h3>
        <p className="text-xs text-muted-foreground">{t("providers.linkGitLab")}</p>
      </div>
    </div>
  );
}

function AuthMethodTabs({ tab, onChange }: { tab: AuthTab; onChange: (tab: AuthTab) => void }) {
  const { t } = useI18n();

  return (
    <div className="flex gap-1 rounded-xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-tray)] p-1 shadow-[var(--shadow-clay)]">
      <button
        type="button"
        className={getNeutralSegmentedControlClassName(tab === "pat", "flex-1")}
        onClick={() => onChange("pat")}
      >
        <KeyRound className="h-3.5 w-3.5" />
        {t("providers.accessToken")}
        <span className="text-xs text-muted-foreground">({t("providers.quick")})</span>
      </button>
      <button
        type="button"
        className={getNeutralSegmentedControlClassName(tab === "oauth", "flex-1")}
        onClick={() => onChange("oauth")}
      >
        <ExternalLink className="h-3.5 w-3.5" />
        {t("common.oauth")}
      </button>
    </div>
  );
}

function HostField({ host, onChange }: { host: string; onChange: (value: string) => void }) {
  const { t } = useI18n();

  return (
    <div className="space-y-1.5">
      <Label htmlFor="gitlab-host">{t("providers.gitLabHost")}</Label>
      <Input
        id="gitlab-host"
        value={host}
        onChange={(event) => onChange(event.target.value)}
        placeholder="gitlab.com"
      />
    </div>
  );
}

function PatSection({
  host,
  pat,
  busy,
  onPatChange,
  onConnect,
}: {
  host: string;
  pat: string;
  busy: boolean;
  onPatChange: (value: string) => void;
  onConnect: () => void;
}) {
  const { t } = useI18n();
  const hostTarget = host.trim() || "gitlab.com";

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="gitlab-pat">{t("providers.personalAccessToken")}</Label>
        <Input
          id="gitlab-pat"
          type="password"
          value={pat}
          onChange={(event) => onPatChange(event.target.value)}
          placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
        />
        <p className="text-xs text-muted-foreground">
          {t("providers.needToken")}{" "}
          <a
            href={`https://${hostTarget}/-/user_settings/personal_access_tokens?name=Timely&scopes=read_api`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            {t("providers.createOneOn", { host: hostTarget })}
          </a>{" "}
          {t("providers.withReadApiScope")}
        </p>
      </div>

      <Button onClick={onConnect} disabled={busy || !host.trim() || !pat.trim()} className="w-full">
        {busy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <KeyRound className="mr-2 h-4 w-4" />
        )}
        {busy ? t("common.syncing") : t("providers.connectWithToken")}
      </Button>
    </div>
  );
}

function OAuthSection({
  host,
  clientId,
  busy,
  phase,
  onClientIdChange,
  onConnect,
  onResolveManual,
}: {
  host: string;
  clientId: string;
  busy: boolean;
  phase: AuthPhase;
  onClientIdChange: (value: string) => void;
  onConnect: () => void;
  onResolveManual: () => void;
}) {
  const { t } = useI18n();
  const hostTarget = host.trim() || "gitlab.com";

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="gitlab-client-id">{t("providers.oauthAppId")}</Label>
        <Input
          id="gitlab-client-id"
          value={clientId}
          onChange={(event) => onClientIdChange(event.target.value)}
          placeholder={t("providers.oauthAppId")}
        />
        <p className="text-xs text-muted-foreground">
          <a
            href={`https://${hostTarget}/-/user_settings/applications`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            {t("providers.createOAuthApp")}
          </a>{" "}
          {t("providers.oauthScopes")}
        </p>
      </div>

      {phase.status === "awaitingCallback" ? (
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 shadow-[var(--shadow-clay)]">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">
              {t("providers.waitingForAuthorization")}
            </p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("providers.completeSignIn")}</p>
          <button
            type="button"
            className="mt-3 cursor-pointer text-xs text-primary underline underline-offset-2 hover:text-primary/80"
            onClick={onResolveManual}
          >
            {t("providers.pasteCallbackManually")}
          </button>
        </div>
      ) : null}

      <Button
        onClick={onConnect}
        disabled={busy || !host.trim() || !clientId.trim()}
        className="w-full"
      >
        {busy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <GitlabIcon className="mr-2 h-4 w-4" />
        )}
        {busy ? t("common.syncing") : t("providers.connectWithGitLab")}
      </Button>
    </div>
  );
}

function ConnectedStatusLine({
  phase,
  authMode,
  preferredScope,
}: {
  phase: Extract<AuthPhase, { status: "connected" | "validating" }>;
  authMode: string;
  preferredScope: string;
}) {
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

function ConnectedState({
  host,
  authMode,
  preferredScope,
  phase,
  onDisconnect,
}: {
  host: string;
  authMode: string;
  preferredScope: string;
  phase: Extract<AuthPhase, { status: "connected" | "validating" }>;
  onDisconnect: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border-2 border-success/35 bg-success/10 p-4 shadow-[var(--shadow-clay)]">
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
