import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { AssignedIssuesBoard } from "@/features/issues/ui/AssignedIssuesBoard/AssignedIssuesBoard";
import {
  buildFortnightWindows,
  FILTER_ALL,
  sortFortnightsNewestFirst,
} from "@/features/issues/ui/AssignedIssuesBoard/lib/assigned-issue-filters";

import type { AssignedIssueSnapshot } from "@/shared/types/dashboard";

vi.mock("@/app/desktop/TauriService/tauri", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/desktop/TauriService/tauri")>();
  return {
    ...actual,
    createGitLabTimelog: vi.fn(),
    createGitLabIssueNote: vi.fn(),
    openExternalUrl: vi.fn(),
  };
});

const sample: AssignedIssueSnapshot[] = [
  {
    key: "g/p#1",
    title: "Hello",
    state: "opened",
    issueGraphqlId: "gid://gitlab/Issue/1",
    labels: [],
    milestoneTitle: "M1",
  },
];

const sortedFortnightWindows = sortFortnightsNewestFirst(buildFortnightWindows());

function renderBoard(overrides: Partial<Parameters<typeof AssignedIssuesBoard>[0]> = {}) {
  return render(
    <I18nProvider>
      <AssignedIssuesBoard
        issues={[]}
        loading={false}
        error={null}
        searchValue=""
        suggestions={[]}
        onSearchValueChange={vi.fn()}
        sortedFortnightWindows={sortedFortnightWindows}
        iterationToken={FILTER_ALL}
        onIterationTokenChange={vi.fn()}
        fortnightId={FILTER_ALL}
        onFortnightIdChange={vi.fn()}
        statusKey="all"
        onStatusKeyChange={vi.fn()}
        canGoPrevious={false}
        canGoNext={false}
        pageLabel="1"
        onPreviousPage={vi.fn()}
        onNextPage={vi.fn()}
        onRetry={vi.fn()}
        onOpenIssue={vi.fn()}
        {...overrides}
      />
    </I18nProvider>,
  );
}

describe("AssignedIssuesBoard", () => {
  it("shows empty hint when there are no issues", () => {
    renderBoard();
    expect(screen.getByText(/No assigned issues yet/i)).toBeInTheDocument();
  });

  it("renders list row with milestone and title", () => {
    renderBoard({ issues: sample });
    expect(screen.getByText("M1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hello/i })).toBeInTheDocument();
  });
});
