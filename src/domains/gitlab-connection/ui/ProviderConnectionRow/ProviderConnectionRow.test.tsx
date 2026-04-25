import { fireEvent, render, screen } from "@testing-library/react";
import GitlabIcon from "lucide-react/dist/esm/icons/gitlab.js";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { ProviderConnectionRow } from "@/domains/gitlab-connection/ui/ProviderConnectionRow/ProviderConnectionRow";

function renderRow(overrides: Partial<Parameters<typeof ProviderConnectionRow>[0]> = {}) {
  const defaults = {
    providerName: "GitLab",
    providerIcon: GitlabIcon,
    isConnected: false,
    isExpanded: false,
    onToggle: vi.fn(),
    children: <div data-testid="auth-form">Auth form content</div>,
    ...overrides,
  };
  return render(
    <I18nProvider>
      <ProviderConnectionRow {...defaults} />
    </I18nProvider>,
  );
}

describe("ProviderConnectionRow", () => {
  it("shows connect button when disconnected and collapsed", () => {
    renderRow();
    expect(screen.getByText("Connect")).toBeInTheDocument();
    expect(screen.queryByTestId("auth-form")).not.toBeInTheDocument();
  });

  it("shows auth form when expanded", () => {
    renderRow({ isExpanded: true });
    expect(screen.getByTestId("auth-form")).toBeInTheDocument();
  });

  it("calls onToggle when connect button clicked", () => {
    const onToggle = vi.fn();
    renderRow({ onToggle });
    fireEvent.click(screen.getByText("Connect"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("shows disconnect button and summary when connected", () => {
    const onDisconnect = vi.fn();
    renderRow({
      isConnected: true,
      connectionSummary: "Connected to gitlab.com",
      onDisconnect,
    });
    expect(screen.getByText("Disconnect")).toBeInTheDocument();
    expect(screen.getByText("Connected to gitlab.com")).toBeInTheDocument();
    expect(screen.queryByText("Connect")).not.toBeInTheDocument();
  });
});
