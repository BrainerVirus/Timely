import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { AssignedIssuesBoardContent } from "@/features/issues/ui/AssignedIssuesBoard/internal/AssignedIssuesBoardContent/AssignedIssuesBoardContent";

vi.mock("@/app/desktop/TauriService/tauri", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/desktop/TauriService/tauri")>();
  return {
    ...actual,
    logIssueTime: vi.fn(),
    createIssueComment: vi.fn(),
    openExternalUrl: vi.fn(),
  };
});

function renderContent(overrides: Partial<Parameters<typeof AssignedIssuesBoardContent>[0]> = {}) {
  return render(
    <I18nProvider>
      <AssignedIssuesBoardContent
        issues={[]}
        loading={false}
        error={null}
        catalogState="ready"
        catalogMessage={null}
        appliedSearchValue=""
        provider="all"
        status="opened"
        year="all"
        iterationId="all"
        page={1}
        pageSize={10}
        pageSizeOptions={[10, 20, 50]}
        totalItems={0}
        totalPages={1}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onRetry={vi.fn()}
        onOpenIssue={vi.fn()}
        syncVersion={0}
        {...overrides}
      />
    </I18nProvider>,
  );
}

describe("AssignedIssuesBoardContent", () => {
  it("uses filtered empty copy when a provider filter is active", () => {
    renderContent({ provider: "youtrack" });

    expect(screen.getByText("No issues match these filters.")).toBeInTheDocument();
    expect(screen.getByText("Try a different search or broaden the filters.")).toBeInTheDocument();
  });

  it("does not show catalog warning when selected provider page is ready", () => {
    renderContent({
      provider: "youtrack",
      catalogState: "ready",
      catalogMessage:
        "Iteration data was synced, but no dated iteration catalog could be matched yet.",
    });

    expect(screen.queryByText(/dated iteration catalog/i)).not.toBeInTheDocument();
  });
});
