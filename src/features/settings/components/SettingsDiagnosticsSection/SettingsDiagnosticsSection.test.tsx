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

  it("renders tokenized diagnostics colors for time, feature, and severity text", async () => {
    renderSection();

    fireEvent.click(await screen.findByRole("button", { name: /diagnostic/i }));
    fireEvent.click(await screen.findByRole("button", { name: /diagnostics console/i }));

    const timestampToken = screen.getByText("[2026-03-25T10:00:00Z]");
    const levelToken = screen.getByText("[info]");
    const featureToken = screen.getByText("[notifications]");
    const sourceEventToken = screen.getByText("[settings:manual_test]");
    const messageToken = screen.getByText("notification sent");

    expect(timestampToken).toHaveClass("text-secondary");
    expect(featureToken).toHaveClass("text-primary");
    expect(levelToken).toHaveClass("text-accent");
    expect(sourceEventToken).toHaveClass("text-accent");
    expect(messageToken).toHaveClass("text-accent");
  });

  it("renders warning entries with warning severity color", async () => {
    render(
      <I18nProvider>
        <SettingsDiagnosticsSection
          diagnosticsSummary="1 entry"
          diagnostics={[
            {
              id: 2,
              timestamp: "2026-03-25T10:01:00Z",
              dayKey: "2026-03-25",
              level: "warn",
              feature: "notifications",
              source: "settings",
              event: "permission_request",
              platform: "macos",
              message: "permission state granted -> granted",
            },
          ]}
          diagnosticsBusy={false}
          selectedFeatureFilter="all"
          onChangeFeatureFilter={vi.fn()}
          onRefreshDiagnostics={vi.fn()}
          onClearDiagnostics={vi.fn()}
          onCopyDiagnostics={vi.fn()}
          onExportDiagnostics={vi.fn()}
        />
      </I18nProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /diagnostic/i }));
    fireEvent.click(await screen.findByRole("button", { name: /diagnostics console/i }));

    expect(screen.getByText("[warn]")).toHaveClass("text-warning");
    expect(screen.getByText("[settings:permission_request]")).toHaveClass("text-warning");
    expect(screen.getByText("permission state granted -> granted")).toHaveClass("text-warning");
  });

  it("orders diagnostics tokens as feature, time, level, then details", async () => {
    renderSection();

    fireEvent.click(await screen.findByRole("button", { name: /diagnostic/i }));
    fireEvent.click(await screen.findByRole("button", { name: /diagnostics console/i }));

    const featureToken = screen.getByText("[notifications]");
    const timestampToken = screen.getByText("[2026-03-25T10:00:00Z]");
    const levelToken = screen.getByText("[info]");
    const sourceEventToken = screen.getByText("[settings:manual_test]");
    const messageToken = screen.getByText("notification sent");

    const row = featureToken.parentElement;
    if (!row) {
      throw new Error("Expected diagnostics row to exist.");
    }

    expect(row.firstChild).toBe(featureToken);
    expect(featureToken.nextSibling).toBe(timestampToken);
    expect(timestampToken.nextSibling).toBe(levelToken);
    expect(levelToken.nextSibling).toBe(sourceEventToken);
    expect(sourceEventToken.nextSibling).toBe(messageToken);
  });
});
