import { fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { AssignedIssuesFilters } from "@/features/issues/ui/AssignedIssuesBoard/internal/AssignedIssuesFilters/AssignedIssuesFilters";

describe("AssignedIssuesFilters", () => {
  it("renders search with status, iteration, and year combobox filters", () => {
    const { container } = render(
      <I18nProvider>
        <AssignedIssuesFilters
          status="opened"
          onStatusChange={vi.fn()}
          provider="all"
          providerOptions={[{ value: "all", label: "All" }]}
          onProviderChange={vi.fn()}
          searchValue=""
          appliedSearchValue=""
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

    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Iteration")).toBeInTheDocument();
    expect(screen.getByText("Year")).toBeInTheDocument();
    expect(screen.queryByText("Provider")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Open")).toBeInTheDocument();
    expect(screen.queryByText("Search")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search assigned issues...")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("xl:grid-cols-[minmax(0,1.6fr)_auto_auto_auto]");
    expect(container.querySelector(".xl\\:w-\\[16rem\\]")).not.toBeNull();
  });

  it("shows open, closed, and all in the status combobox", () => {
    render(
      <I18nProvider>
        <AssignedIssuesFilters
          status="opened"
          onStatusChange={vi.fn()}
          provider="all"
          providerOptions={[{ value: "all", label: "All" }]}
          onProviderChange={vi.fn()}
          searchValue=""
          appliedSearchValue=""
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

    fireEvent.click(screen.getAllByRole("button")[0]);

    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
    expect(screen.getByText("All")).toBeInTheDocument();
  });

  it("renders provider combobox when more than one provider is configured", () => {
    render(
      <I18nProvider>
        <AssignedIssuesFilters
          status="opened"
          onStatusChange={vi.fn()}
          provider="all"
          providerOptions={[
            { value: "all", label: "All" },
            { value: "gitlab", label: "GitLab" },
            { value: "youtrack", label: "YouTrack" },
          ]}
          onProviderChange={vi.fn()}
          searchValue=""
          appliedSearchValue=""
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

    expect(screen.getByText("Provider")).toBeInTheDocument();
    expect(screen.getAllByDisplayValue("All").length).toBeGreaterThan(0);
  });
});
