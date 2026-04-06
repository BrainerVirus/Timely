import { fireEvent, render, screen } from "@testing-library/react";
import { GitLabConnectedState } from "@/domains/gitlab-connection/ui/GitLabAuthPanel/internal/GitLabConnectedState/GitLabConnectedState";

vi.mock("@/app/providers/I18nService/i18n", () => ({
  useI18n: () => ({
    t: (key: string, values?: Record<string, string>) => {
      if (key === "providers.connectedToHost") {
        return `Connected to ${values?.host ?? ""}`;
      }
      if (key === "providers.disconnect") {
        return "Disconnect";
      }
      if (key === "providers.validatingToken") {
        return "Validating token";
      }
      if (key === "providers.authenticatedAs") {
        return `Authenticated as ${values?.username ?? ""} (${values?.name ?? ""})`;
      }
      return key;
    },
  }),
}));

describe("GitLabConnectedState", () => {
  it("shows the connected host and disconnect action", () => {
    const onDisconnect = vi.fn();

    render(
      <GitLabConnectedState
        host="gitlab.example.com"
        authMode="OAuth"
        preferredScope="api"
        phase={{ status: "connected" }}
        onDisconnect={onDisconnect}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));

    expect(screen.getByText("Connected to gitlab.example.com")).toBeInTheDocument();
    expect(screen.getByText("OAuth · api")).toBeInTheDocument();
    expect(onDisconnect).toHaveBeenCalledTimes(1);
  });

  it("shows the validating state copy", () => {
    render(
      <GitLabConnectedState
        host="gitlab.example.com"
        authMode="PAT"
        preferredScope="api"
        phase={{ status: "validating" }}
        onDisconnect={vi.fn()}
      />,
    );

    expect(screen.getByText("Validating token")).toBeInTheDocument();
  });
});
