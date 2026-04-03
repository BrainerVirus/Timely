import type {
  AuthLaunchPlan,
  GitLabUserInfo,
  ProviderConnection,
} from "@/shared/types/dashboard";

export type AuthTab = "oauth" | "pat";

export type AuthPhase =
  | { status: "idle"; error?: string }
  | { status: "connecting" }
  | { status: "awaitingCallback"; launchPlan: AuthLaunchPlan }
  | { status: "validating" }
  | { status: "connected"; user?: GitLabUserInfo };

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

export function createInitialGitLabAuthPanelState(
  primary?: ProviderConnection,
): GitLabAuthPanelState {
  return {
    tab: "pat",
    host: primary?.host ?? "gitlab.com",
    clientId: primary?.clientId ?? "",
    pat: "",
    phase: { status: "idle" },
  };
}

export function gitLabAuthPanelReducer(
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
