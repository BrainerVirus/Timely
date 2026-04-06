import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import {
  buildFortnightWindows,
  FILTER_ALL,
  sortFortnightsNewestFirst,
} from "@/features/issues/ui/AssignedIssuesBoard/lib/assigned-issue-filters";
import { AssignedIssuesFilters } from "@/features/issues/ui/AssignedIssuesBoard/internal/AssignedIssuesFilters/AssignedIssuesFilters";

describe("AssignedIssuesFilters", () => {
  it("renders filter labels", () => {
    const windows = sortFortnightsNewestFirst(buildFortnightWindows());

    render(
      <I18nProvider>
        <AssignedIssuesFilters
          issues={[]}
          searchValue=""
          suggestions={[]}
          onSearchValueChange={vi.fn()}
          sortedFortnightWindows={windows}
          iterationToken={FILTER_ALL}
          onIterationTokenChange={vi.fn()}
          fortnightId={FILTER_ALL}
          onFortnightIdChange={vi.fn()}
          statusKey="all"
          onStatusKeyChange={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText("Iteration code")).toBeInTheDocument();
    expect(screen.getByText("Iteration period")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });
});
