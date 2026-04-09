import React from "react";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { AssignedIssuesBoard } from "@/features/issues/ui/AssignedIssuesBoard/AssignedIssuesBoard";

import type { AssignedIssueSnapshot } from "@/shared/types/dashboard";

vi.mock("@/app/desktop/TauriService/tauri", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/desktop/TauriService/tauri")>();
  return {
    ...actual,
    logIssueTime: vi.fn(),
    createIssueComment: vi.fn(),
    openExternalUrl: vi.fn(),
  };
});

const sample: AssignedIssueSnapshot[] = [
  {
    provider: "gitlab",
    issueId: "g/p#1",
    providerIssueRef: "gid://gitlab/Issue/1",
    key: "g/p#1",
    title: "Hello",
    state: "opened",
    labels: [],
    milestoneTitle: "M1",
  },
];

function renderBoard(overrides: Partial<Parameters<typeof AssignedIssuesBoard>[0]> = {}) {
  const props = {
    issues: [],
    loading: false,
    error: null,
    catalogState: "ready",
    catalogMessage: null,
    searchValue: "",
    suggestions: [],
    onSearchValueChange: vi.fn(),
    status: "opened",
    onStatusChange: vi.fn(),
    years: [],
    year: "all",
    onYearChange: vi.fn(),
    iterationOptions: [],
    iterationId: "all",
    onIterationIdChange: vi.fn(),
    page: 1,
    pageSize: 10,
    pageSizeOptions: [10, 20, 50],
    totalItems: 0,
    totalPages: 1,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    onRetry: vi.fn(),
    onOpenIssue: vi.fn(),
    ...(overrides as object),
  };

  return render(
    <I18nProvider>
      {React.createElement(AssignedIssuesBoard as React.ComponentType<any>, props)}
    </I18nProvider>,
  );
}

describe("AssignedIssuesBoard", () => {
  it("shows empty hint when there are no issues", () => {
    renderBoard();
    expect(screen.getByText(/No assigned issues yet/i)).toBeInTheDocument();
  });

  it("renders top-left tabs with search and filters below", () => {
    renderBoard();

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Open" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Closed" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "All" })).toBeInTheDocument();
    expect(screen.getByText("Iteration")).toBeInTheDocument();
    expect(screen.getByText("Year")).toBeInTheDocument();
    expect(screen.queryByText("Search")).not.toBeInTheDocument();
  });

  it("renders list row with milestone and title", () => {
    renderBoard({ issues: sample });
    expect(screen.getByText("M1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hello/i })).toBeInTheDocument();
  });

  it("renders the centered pagination footer without page-size controls", () => {
    renderBoard({
      issues: sample,
      page: 4,
      pageSize: 10,
      totalItems: 86,
      totalPages: 9,
    });

    expect(screen.getByText("31-40 of 86")).toBeInTheDocument();
    expect(screen.getByText("Page 4 of 9")).toBeInTheDocument();
    expect(screen.queryByText("Show")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "10" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "20" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "50" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /First page/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Last page/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "4" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "7" })).toBeInTheDocument();
  });

  it("shows a catalog warning when iteration metadata is partial", () => {
    renderBoard({
      catalogState: "partial",
      catalogMessage: "Iteration filters are only partially available right now.",
    });

    expect(
      screen.getByText("Iteration filters are only partially available right now."),
    ).toBeInTheDocument();
  });
});
