import { fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { AuditFlagsSummary } from "@/features/worklog/ui/IssuesSection/internal/AuditFlagsSummary/AuditFlagsSummary";

describe("AuditFlagsSummary", () => {
  it("renders the healthy state when there are no audit flags", () => {
    render(
      <I18nProvider>
        <AuditFlagsSummary auditFlags={[]} />
      </I18nProvider>,
    );

    expect(screen.getByText(/no flags/i)).toBeInTheDocument();
  });

  it("renders the audit flag badge and sheet content", () => {
    render(
      <I18nProvider>
        <AuditFlagsSummary
          auditFlags={[
            {
              title: "Overlap detected",
              detail: "Two entries overlap",
              severity: "high",
            },
          ]}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("Overlap detected")).toBeInTheDocument();
    expect(screen.getByText("Two entries overlap")).toBeInTheDocument();
  });
});
