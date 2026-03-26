import { fireEvent, render, screen, within } from "@testing-library/react";
import { I18nProvider } from "@/core/services/I18nService/i18n";
import { SettingsDiagnosticsSection } from "@/features/settings/components/SettingsDiagnosticsSection/SettingsDiagnosticsSection";

import type { DiagnosticLogEntry } from "@/shared/types/dashboard";

const diagnostics: DiagnosticLogEntry[] = [
  {
    id: 1,
    timestamp: "2026-03-25T10:00:00Z",
    dayKey: "2026-03-25",
    level: "info",
    feature: "notifications",
    source: "settings",
    event: "manual_test",
    platform: "macos",
    message: "notification sent",
  },
];

function renderSection() {
  const handlers = {
    onRefreshDiagnostics: vi.fn(),
    onClearDiagnostics: vi.fn(),
    onCopyDiagnostics: vi.fn(),
    onExportDiagnostics: vi.fn(),
    onChangeFeatureFilter: vi.fn(),
  };

  render(
    <I18nProvider>
      <SettingsDiagnosticsSection
        diagnosticsSummary="1 entry"
        diagnostics={diagnostics}
        diagnosticsBusy={false}
        selectedFeatureFilter="all"
        onChangeFeatureFilter={handlers.onChangeFeatureFilter}
        onRefreshDiagnostics={handlers.onRefreshDiagnostics}
        onClearDiagnostics={handlers.onClearDiagnostics}
        onCopyDiagnostics={handlers.onCopyDiagnostics}
        onExportDiagnostics={handlers.onExportDiagnostics}
      />
    </I18nProvider>,
  );

  return handlers;
}

describe("SettingsDiagnosticsSection", () => {
  it("shows a compact filter without the old label and keeps clear action destructive at the end", async () => {
    renderSection();

    fireEvent.click(await screen.findByRole("button", { name: /diagnostic/i }));
    fireEvent.click(await screen.findByRole("button", { name: /diagnostics console/i }));

    expect(screen.queryByText(/^feature$/i)).not.toBeInTheDocument();

    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    const clearButton = screen.getByRole("button", { name: /clear logs/i });
    screen.getByRole("button", { name: /copy report/i });
    screen.getByRole("button", { name: /export report/i });

    const actionsBar = refreshButton.parentElement;
    if (!actionsBar) {
      throw new Error("Expected diagnostics actions bar to exist.");
    }
    const actionButtons = within(actionsBar).getAllByRole("button");
    const lastActionButton = actionButtons.pop();

    expect(lastActionButton).toHaveAccessibleName(/clear logs/i);
    expect(clearButton).toHaveClass("border-destructive/40");
  });
});
