import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { AssignedIssuesFilters } from "@/features/issues/ui/AssignedIssuesBoard/internal/AssignedIssuesFilters/AssignedIssuesFilters";

describe("AssignedIssuesFilters", () => {
  it("renders worklog-style tabs on the top row and search plus filters below", () => {
    render(
      <I18nProvider>
        <AssignedIssuesFilters
          status="opened"
          onStatusChange={vi.fn()}
          searchValue=""
          suggestions={[]}
          onSearchValueChange={vi.fn()}
          years={[]}
          year="all"
          onYearChange={vi.fn()}
          iterationOptions={[]}
          iterationId="all"
          onIterationIdChange={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Open" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Closed" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "All" })).toBeInTheDocument();
    expect(screen.getByText("Iteration")).toBeInTheDocument();
    expect(screen.getByText("Year")).toBeInTheDocument();
    expect(screen.queryByText("Search")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search assigned issues...")).toBeInTheDocument();
  });
});
