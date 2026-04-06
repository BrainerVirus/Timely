import { render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import * as tauriModule from "@/app/desktop/TauriService/tauri";
import { IssuesBoardPage } from "@/features/issues/screens/IssuesBoardPage/IssuesBoardPage";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock("@/app/desktop/TauriService/tauri", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/desktop/TauriService/tauri")>();
  return {
    ...actual,
    createGitLabTimelog: vi.fn(),
    createGitLabIssueNote: vi.fn(),
    openExternalUrl: vi.fn(),
  };
});

describe("IssuesBoardPage", () => {
  it("renders filters when the remote page loads", async () => {
    vi.spyOn(tauriModule, "loadAssignedIssuesPage").mockResolvedValue({
      items: [
        {
          key: "g/p#1",
          title: "Sample",
          state: "opened",
          issueGraphqlId: "gid://gitlab/Issue/1",
          labels: [],
        },
      ],
      hasNextPage: false,
      endCursor: undefined,
      suggestions: [],
    });

    render(
      <I18nProvider>
        <IssuesBoardPage />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Iteration code")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Sample/i })).toBeInTheDocument();
  });
});
