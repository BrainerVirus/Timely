import { fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { SyncLogPanel } from "@/domains/gitlab-connection/ui/ProviderSyncCard/internal/SyncLogPanel/SyncLogPanel";

describe("SyncLogPanel", () => {
  it("renders log lines when expanded", () => {
    render(
      <I18nProvider>
        <SyncLogPanel log={["Start", "Done."]} syncing={false} />
      </I18nProvider>,
    );

    expect(screen.getByText("Start")).toBeInTheDocument();
    expect(screen.getByText("Done.")).toBeInTheDocument();
  });

  it("toggles collapsed state", () => {
    render(
      <I18nProvider>
        <SyncLogPanel log={["Start", "Done."]} syncing={false} />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(screen.queryByText("Start")).not.toBeInTheDocument();
  });
});
