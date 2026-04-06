import { useEffect, useEffectEvent, useReducer } from "react";
import { useNotify } from "@/app/hooks/use-notify/use-notify";
import { useI18n } from "@/app/providers/I18nService/i18n";
import {
  createInitialGitLabAuthPanelState,
  gitLabAuthPanelReducer,
} from "@/domains/gitlab-connection/state/gitlab-auth-panel-state/gitlab-auth-panel-state";

import type {
  AuthPhase,
  AuthTab,
} from "@/domains/gitlab-connection/state/gitlab-auth-panel-state/gitlab-auth-panel-state";
import type { GitLabAuthPanelProps } from "@/domains/gitlab-connection/ui/GitLabAuthPanel/GitLabAuthPanel";
import type {
  GitLabConnectionInput,
  OAuthCallbackResolution,
  ProviderConnection,
} from "@/shared/types/dashboard";

interface UseGitLabAuthControllerOptions extends Omit<GitLabAuthPanelProps, "connections"> {
  primary?: ProviderConnection;
}

export function useGitLabAuthController({
  primary,
  onSaveConnection,
  onSavePat,
  onBeginOAuth,
  onResolveCallback,
  onValidateToken,
  onListenOAuthEvents,
}: UseGitLabAuthControllerOptions) {
  const notify = useNotify();
  const { t } = useI18n();
  const [state, dispatch] = useReducer(
    gitLabAuthPanelReducer,
    primary,
    createInitialGitLabAuthPanelState,
  );
  const { tab, host, clientId, pat, phase } = state;

  const busy = phase.status === "connecting" || phase.status === "awaitingCallback";
  const connectedPhase: Extract<AuthPhase, { status: "connected" | "validating" }> =
    phase.status === "connected" || phase.status === "validating" ? phase : { status: "connected" };
  const connectedAuthMode =
    tab === "oauth" ? t("providers.oauthPkce") : t("providers.personalAccessToken");

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

    void onListenOAuthEvents(handleOAuthSuccess, handleOAuthError)
      .then((cleanup) => {
        dispose = cleanup;
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        dispatch({
          type: "setPhase",
          phase: { status: "idle", error: t("providers.oauthCallbackFailed", { error: message }) },
        });
        notify.error(t("providers.oauthFailed"), message);
      });

    return () => dispose?.();
  }, [notify, onListenOAuthEvents, t]);

  async function handleOAuthConnect() {
    if (!host.trim() || !clientId.trim()) {
      const message = t("providers.hostAndClientRequired");
      dispatch({ type: "setPhase", phase: { status: "idle", error: message } });
      notify.error(t("providers.connectionFailed"), message);
      return;
    }

    dispatch({ type: "setPhase", phase: { status: "connecting" } });

    try {
      const input: GitLabConnectionInput = {
        host: host.trim(),
        displayName: host.trim(),
        clientId: clientId.trim(),
        preferredScope: "api",
        authMode: t("providers.oauthPkceFallback"),
      };

      await onSaveConnection(input);
      const plan = await onBeginOAuth(input);
      dispatch({ type: "setPhase", phase: { status: "awaitingCallback", launchPlan: plan } });
    } catch (error) {
      dispatch({ type: "setPhase", phase: { status: "idle", error: String(error) } });
      notify.error(t("providers.connectionFailed"), String(error));
    }
  }

  async function handlePatConnect() {
    if (!host.trim() || !pat.trim()) {
      const message = t("providers.hostAndTokenRequired");
      dispatch({ type: "setPhase", phase: { status: "idle", error: message } });
      notify.error(t("providers.connectionFailed"), message);
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
      } catch (error) {
        dispatch({ type: "setPhase", phase: { status: "connected" } });
        notify.error(t("providers.tokenValidationFailed"), String(error));
      }
    } catch (error) {
      dispatch({ type: "setPhase", phase: { status: "idle", error: String(error) } });
      notify.error(t("providers.connectionFailed"), String(error));
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
    } catch (error) {
      const message = t("providers.callbackValidationFailed", { error: String(error) });
      dispatch({ type: "setPhase", phase: { status: "idle", error: message } });
      notify.error(t("providers.oauthFailed"), message);
    }
  }

  return {
    tab,
    host,
    clientId,
    pat,
    phase,
    busy,
    connectedPhase,
    connectedAuthMode,
    handleTabChange: (nextTab: AuthTab) => dispatch({ type: "setTab", tab: nextTab }),
    handleHostChange: (nextHost: string) => dispatch({ type: "setHost", host: nextHost }),
    handleClientIdChange: (nextClientId: string) =>
      dispatch({ type: "setClientId", clientId: nextClientId }),
    handlePatChange: (nextPat: string) => dispatch({ type: "setPat", pat: nextPat }),
    handleDisconnect: () => dispatch({ type: "resetCredentials" }),
    handleOAuthConnect,
    handlePatConnect,
    handleResolveManual,
  };
}
