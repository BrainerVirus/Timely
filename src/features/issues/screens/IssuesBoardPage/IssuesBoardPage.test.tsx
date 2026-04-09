import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import * as tauriModule from "@/app/desktop/TauriService/tauri";
import { IssuesBoardPage } from "@/features/issues/screens/IssuesBoardPage/IssuesBoardPage";

const navigateMock = vi.fn();

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/app/desktop/TauriService/tauri", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/desktop/TauriService/tauri")>();
  return {
    ...actual,
    logIssueTime: vi.fn(),
    createIssueComment: vi.fn(),
    openExternalUrl: vi.fn(),
  };
});

describe("IssuesBoardPage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it("renders filters when the remote page loads", async () => {
    vi.spyOn(tauriModule, "loadAssignedIssuesPage").mockResolvedValue({
      items: [
        {
          provider: "gitlab",
          issueId: "g/p#1",
          providerIssueRef: "gid://gitlab/Issue/1",
          key: "g/p#1",
          title: "Sample",
          state: "opened",
          labels: [],
        },
      ],
      suggestions: [],
      years: [],
      iterationCodes: [],
      iterations: [],
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    });

    render(
      <I18nProvider>
        <IssuesBoardPage />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Code")).toBeInTheDocument();
    });
    expect(screen.getByText("Week")).toBeInTheDocument();
    expect(screen.getByText("Year")).toBeInTheDocument();
    expect(screen.queryByText("Status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sample/i })).toBeInTheDocument();
  });

  it("navigates with the provider-neutral issue route reference", async () => {
    vi.spyOn(tauriModule, "loadAssignedIssuesPage").mockResolvedValue({
      items: [
        {
          provider: "gitlab",
          issueId: "g/p#1",
          providerIssueRef: "gid://gitlab/Issue/1",
          key: "g/p#1",
          title: "Sample",
          state: "opened",
          labels: [],
        },
      ],
      suggestions: [],
      years: [],
      iterationCodes: [],
      iterations: [],
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    });

    render(
      <I18nProvider>
        <IssuesBoardPage />
      </I18nProvider>,
    );

    const button = await screen.findByRole("button", { name: /Sample/i });
    fireEvent.click(button);

    expect(navigateMock).toHaveBeenCalledWith({
      to: "/issues/hub",
      search: {
        provider: "gitlab",
        issueId: "g/p#1",
      },
    });
  });
});
