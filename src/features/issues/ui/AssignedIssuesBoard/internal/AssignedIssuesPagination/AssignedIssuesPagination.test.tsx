import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { AssignedIssuesPagination } from "@/features/issues/ui/AssignedIssuesBoard/internal/AssignedIssuesPagination/AssignedIssuesPagination";

describe("AssignedIssuesPagination", () => {
  it("centers pager controls, keeps page count on the right, and removes page-size buttons", () => {
    const { container } = render(
      <I18nProvider>
        <AssignedIssuesPagination
          page={4}
          pageSize={10}
          pageSizeOptions={[10, 20, 50]}
          totalItems={86}
          totalPages={9}
          onPageChange={vi.fn()}
          onPageSizeChange={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText("31-40 of 86")).toBeInTheDocument();
    expect(screen.getByText("Page 4 of 9")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "10" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "20" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "50" })).not.toBeInTheDocument();
    expect(container.firstChild).not.toHaveClass("border-t");
  });
});
