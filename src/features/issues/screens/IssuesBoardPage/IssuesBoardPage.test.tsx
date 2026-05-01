import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as tauriModule from "@/app/desktop/TauriService/tauri";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
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

vi.mock("@/app/providers/MotionService/motion", () => ({
  useMotionSettings: vi.fn(() => ({
    motionPreference: "system",
    windowVisibility: "visible",
    motionLevel: "full",
    prefersReducedMotion: false,
    allowDecorativeAnimation: true,
    allowLoopingAnimation: true,
    reducedMotionMode: "user",
  })),
}));

const fullMotionSettings = {
  motionPreference: "system",
  windowVisibility: "visible",
  motionLevel: "full",
  prefersReducedMotion: false,
  allowDecorativeAnimation: true,
  allowLoopingAnimation: true,
  reducedMotionMode: "user",
} as const;

const reducedMotionSettings = {
  motionPreference: "system",
  windowVisibility: "visible",
  motionLevel: "reduced",
  prefersReducedMotion: true,
  allowDecorativeAnimation: false,
  allowLoopingAnimation: false,
  reducedMotionMode: "user",
} as const;

describe("IssuesBoardPage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    vi.mocked(useMotionSettings).mockReturnValue(fullMotionSettings);
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
          workflowStatus: "todo",
          labels: [],
        },
      ],
      suggestions: [],
      years: [],
      iterationOptions: [],
      catalogState: "ready",
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    });

    render(
      <I18nProvider>
        <IssuesBoardPage syncVersion={0} />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Iteration")).toBeInTheDocument();
    });
    expect(screen.getByText("Year")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
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
          workflowStatus: "todo",
          labels: [],
        },
      ],
      suggestions: [],
      years: [],
      iterationOptions: [],
      catalogState: "ready",
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    });

    render(
      <I18nProvider>
        <IssuesBoardPage syncVersion={0} />
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

  it("uses visible entrance motion when decorative motion is enabled", async () => {
    vi.spyOn(tauriModule, "loadAssignedIssuesPage").mockResolvedValue({
      items: [
        {
          provider: "gitlab",
          issueId: "g/p#1",
          providerIssueRef: "gid://gitlab/Issue/1",
          key: "g/p#1",
          title: "Sample",
          state: "opened",
          workflowStatus: "todo",
          labels: [],
        },
      ],
      suggestions: [],
      years: [],
      iterationOptions: [],
      catalogState: "ready",
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    });

    const { container } = render(
      <I18nProvider>
        <IssuesBoardPage syncVersion={0} />
      </I18nProvider>,
    );

    await screen.findByRole("button", { name: /Sample/i });

    expect(container.querySelector('[style*="opacity: 0"]')).not.toBeNull();
  });

  it("skips hidden entrance styles when reduced motion is active", async () => {
    vi.mocked(useMotionSettings).mockReturnValue(reducedMotionSettings);
    vi.spyOn(tauriModule, "loadAssignedIssuesPage").mockResolvedValue({
      items: [
        {
          provider: "gitlab",
          issueId: "g/p#1",
          providerIssueRef: "gid://gitlab/Issue/1",
          key: "g/p#1",
          title: "Sample",
          state: "opened",
          workflowStatus: "todo",
          labels: [],
        },
      ],
      suggestions: [],
      years: [],
      iterationOptions: [],
      catalogState: "ready",
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    });

    const { container } = render(
      <I18nProvider>
        <IssuesBoardPage syncVersion={0} />
      </I18nProvider>,
    );

    await screen.findByRole("button", { name: /Sample/i });

    expect(container.querySelector('[style*="opacity: 0"]')).toBeNull();
  });
});
