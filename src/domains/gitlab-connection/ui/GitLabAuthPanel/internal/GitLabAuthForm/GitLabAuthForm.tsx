import ExternalLink from "lucide-react/dist/esm/icons/external-link.js";
import GitlabIcon from "lucide-react/dist/esm/icons/gitlab.js";
import KeyRound from "lucide-react/dist/esm/icons/key-round.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import { openExternalUrl } from "@/app/desktop/TauriService/tauri";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { normalizeGitLabHostTarget } from "@/domains/gitlab-connection/ui/GitLabAuthPanel/internal/gitlab-auth-helpers";
import { getNeutralSegmentedControlClassName } from "@/shared/lib/control-styles/control-styles";
import { Button } from "@/shared/ui/Button/Button";
import { Input } from "@/shared/ui/Input/Input";
import { Label } from "@/shared/ui/Label/Label";

import type {
  AuthPhase,
  AuthTab,
} from "@/domains/gitlab-connection/state/gitlab-auth-panel-state/gitlab-auth-panel-state";

interface GitLabAuthFormProps {
  tab: AuthTab;
  host: string;
  clientId: string;
  pat: string;
  busy: boolean;
  phase: AuthPhase;
  onTabChange: (tab: AuthTab) => void;
  onHostChange: (value: string) => void;
  onClientIdChange: (value: string) => void;
  onPatChange: (value: string) => void;
  onConnectPat: () => void;
  onConnectOAuth: () => void;
  onResolveManual: () => void;
}

export function GitLabAuthForm({
  tab,
  host,
  clientId,
  pat,
  busy,
  phase,
  onTabChange,
  onHostChange,
  onClientIdChange,
  onPatChange,
  onConnectPat,
  onConnectOAuth,
  onResolveManual,
}: Readonly<GitLabAuthFormProps>) {
  const { t } = useI18n();
  const hostTarget = normalizeGitLabHostTarget(host);
  const tokenUrl = `https://${hostTarget}/-/user_settings/personal_access_tokens?name=Timely&scopes=api,read_user`;
  const oauthAppUrl = `https://${hostTarget}/-/user_settings/applications`;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl border-2 border-border-subtle bg-field shadow-clay">
          <GitlabIcon className="h-5 w-5 text-secondary" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">
            {t("providers.connectGitLab")}
          </h3>
          <p className="text-xs text-muted-foreground">{t("providers.linkGitLab")}</p>
        </div>
      </div>

      <div className="flex gap-1 rounded-xl border-2 border-border-subtle bg-tray p-1 shadow-clay">
        <button
          type="button"
          className={getNeutralSegmentedControlClassName(tab === "pat", "flex-1")}
          onClick={() => onTabChange("pat")}
          data-onboarding="gitlab-pat-tab"
        >
          <KeyRound className="h-3.5 w-3.5" />
          {t("providers.accessToken")}
          <span className="text-xs text-muted-foreground">({t("providers.quick")})</span>
        </button>
        <button
          type="button"
          className={getNeutralSegmentedControlClassName(tab === "oauth", "flex-1")}
          onClick={() => onTabChange("oauth")}
          data-onboarding="gitlab-oauth-tab"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {t("common.oauth")}
        </button>
      </div>

      <div className="space-y-1.5" data-onboarding="gitlab-host-field">
        <Label htmlFor="gitlab-host">{t("providers.gitLabHost")}</Label>
        <Input
          id="gitlab-host"
          value={host}
          onChange={(event) => onHostChange(event.target.value)}
          placeholder="gitlab.com"
        />
      </div>

      {tab === "pat" ? (
        <div className="space-y-4">
          <div className="space-y-1.5" data-onboarding="gitlab-pat-field">
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
              <button
                type="button"
                onClick={() => void openExternalUrl(tokenUrl)}
                className="inline cursor-pointer bg-transparent p-0 text-primary underline underline-offset-2 hover:text-primary/80"
                data-onboarding="gitlab-pat-link"
              >
                {t("providers.createOneOn", { host: hostTarget })}
              </button>{" "}
              {t("providers.withReadApiScope")}
            </p>
          </div>

          <Button
            onClick={onConnectPat}
            disabled={busy || !host.trim() || !pat.trim()}
            className="w-full"
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="mr-2 h-4 w-4" />
            )}
            {busy ? t("common.syncing") : t("providers.connectWithToken")}
          </Button>
        </div>
      ) : null}

      {tab === "oauth" ? (
        <div className="space-y-4">
          <div className="space-y-1.5" data-onboarding="gitlab-oauth-field">
            <Label htmlFor="gitlab-client-id">{t("providers.oauthAppId")}</Label>
            <Input
              id="gitlab-client-id"
              value={clientId}
              onChange={(event) => onClientIdChange(event.target.value)}
              placeholder={t("providers.oauthAppId")}
            />
            <p className="text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => void openExternalUrl(oauthAppUrl)}
                className="inline cursor-pointer bg-transparent p-0 text-primary underline underline-offset-2 hover:text-primary/80"
                data-onboarding="gitlab-oauth-link"
              >
                {t("providers.createOAuthApp")}
              </button>{" "}
              {t("providers.oauthScopes")}
            </p>
          </div>

          {phase.status === "awaitingCallback" ? (
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 shadow-clay">
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
            onClick={onConnectOAuth}
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
      ) : null}
    </div>
  );
}
