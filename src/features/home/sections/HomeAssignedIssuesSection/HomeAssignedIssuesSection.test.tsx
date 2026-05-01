import { fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { HomeAssignedIssuesSection } from "@/features/home/sections/HomeAssignedIssuesSection/HomeAssignedIssuesSection";

import type { AssignedIssueSnapshot } from "@/shared/types/dashboard";

vi.mock("@/app/providers/MotionService/motion", () => ({
  useMotionSettings: () => ({
    allowDecorativeAnimation: false,
    allowLoopingAnimation: false,
    windowVisibility: "visible",
    motionLevel: "reduced",
    motionPreference: "system",
    prefersReducedMotion: true,
    reducedMotionMode: "user",
  }),
}));

function baseIssue(i: number): AssignedIssueSnapshot {
  return {
    provider: "gitlab",
    issueId: `g/p#${i}`,
    providerIssueRef: `gid://gitlab/Issue/${i}`,
    key: `g/p#${i}`,
    title: `Task ${i}`,
    state: "opened",
    workflowStatus: "todo",
    labels: [],
  };
}

const one: AssignedIssueSnapshot[] = [baseIssue(1)];

describe("HomeAssignedIssuesSection", () => {
  it("renders nothing when there are no issues", () => {
    const { container } = render(
      <I18nProvider>
        <HomeAssignedIssuesSection
          issues={[]}
          syncVersion={0}
          onOpenBoard={vi.fn()}
          onOpenIssue={vi.fn()}
        />
      </I18nProvider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("calls onOpenBoard when clicking the board button", () => {
    const onOpenBoard = vi.fn();
    render(
      <I18nProvider>
        <HomeAssignedIssuesSection
          issues={one}
          syncVersion={0}
          onOpenBoard={onOpenBoard}
          onOpenIssue={vi.fn()}
        />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Open board/i }));
    expect(onOpenBoard).toHaveBeenCalledTimes(1);
  });

  it("shows total count badge, omits hint and more footer, and opens issues from row", () => {
    const onOpenIssue = vi.fn();
    const issues = Array.from({ length: 6 }, (_, i) => baseIssue(i + 1));

    render(
      <I18nProvider>
        <HomeAssignedIssuesSection
          issues={issues}
          syncVersion={1}
          onOpenBoard={vi.fn()}
          onOpenIssue={onOpenIssue}
        />
      </I18nProvider>,
    );

    expect(screen.getByLabelText(/6 assigned issues/i)).toBeInTheDocument();
    expect(screen.queryByText(/Open GitLab issues assigned to you/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/more assigned/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Task 1/i }));
    expect(onOpenIssue).toHaveBeenCalledWith(issues[0]);
  });

  it("hides dot pager for five or fewer issues", () => {
    const issues = Array.from({ length: 5 }, (_, i) => baseIssue(i + 1));

    render(
      <I18nProvider>
        <HomeAssignedIssuesSection
          issues={issues}
          syncVersion={0}
          onOpenBoard={vi.fn()}
          onOpenIssue={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.queryByRole("button", { name: /Page 2/i })).not.toBeInTheDocument();
    expect(screen.getByText("Task 5")).toBeInTheDocument();
  });

  it("pages through issues with dot navigation", () => {
    const issues = Array.from({ length: 6 }, (_, i) => baseIssue(i + 1));

    render(
      <I18nProvider>
        <HomeAssignedIssuesSection
          issues={issues}
          syncVersion={0}
          onOpenBoard={vi.fn()}
          onOpenIssue={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByText("Task 1")).toBeInTheDocument();
    expect(screen.queryByText("Task 6")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Page 2/i }));

    expect(screen.queryByText("Task 1")).not.toBeInTheDocument();
    expect(screen.getByText("Task 6")).toBeInTheDocument();
  });

  it("uses a minimal pager track without card chrome", () => {
    const issues = Array.from({ length: 6 }, (_, i) => baseIssue(i + 1));

    render(
      <I18nProvider>
        <HomeAssignedIssuesSection
          issues={issues}
          syncVersion={0}
          onOpenBoard={vi.fn()}
          onOpenIssue={vi.fn()}
        />
      </I18nProvider>,
    );

    const track = screen.getByTestId("home-assigned-issues-pager-track");
    expect(track.className).not.toContain("border-2");
    expect(track.className).not.toContain("bg-tray");
    expect(track.className).not.toContain("shadow-clay-inset");
  });

  it("pager chevrons step pages and disable at the first and last page", () => {
    const issues = Array.from({ length: 11 }, (_, i) => baseIssue(i + 1));

    render(
      <I18nProvider>
        <HomeAssignedIssuesSection
          issues={issues}
          syncVersion={0}
          onOpenBoard={vi.fn()}
          onOpenIssue={vi.fn()}
        />
      </I18nProvider>,
    );

    const prev = screen.getByTestId("home-assigned-issues-pager-prev");
    const next = screen.getByTestId("home-assigned-issues-pager-next");

    expect(prev).toBeDisabled();
    expect(next).not.toBeDisabled();
    expect(screen.getByText("Task 1")).toBeInTheDocument();

    fireEvent.click(next);
    expect(screen.getByText("Task 6")).toBeInTheDocument();
    expect(prev).not.toBeDisabled();

    fireEvent.click(next);
    expect(screen.getByText("Task 11")).toBeInTheDocument();
    expect(next).toBeDisabled();

    fireEvent.click(prev);
    expect(screen.getByText("Task 6")).toBeInTheDocument();
    expect(next).not.toBeDisabled();
  });

  it("exposes localized chevron labels for the pager", () => {
    const issues = Array.from({ length: 11 }, (_, i) => baseIssue(i + 1));

    render(
      <I18nProvider>
        <HomeAssignedIssuesSection
          issues={issues}
          syncVersion={0}
          onOpenBoard={vi.fn()}
          onOpenIssue={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: /Previous page/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Next page/i })).toBeInTheDocument();
  });

  it("pager chevrons are borderless icon buttons without clay chrome", () => {
    const issues = Array.from({ length: 11 }, (_, i) => baseIssue(i + 1));

    render(
      <I18nProvider>
        <HomeAssignedIssuesSection
          issues={issues}
          syncVersion={0}
          onOpenBoard={vi.fn()}
          onOpenIssue={vi.fn()}
        />
      </I18nProvider>,
    );

    const prev = screen.getByTestId("home-assigned-issues-pager-prev");
    const next = screen.getByTestId("home-assigned-issues-pager-next");
    expect(prev.className).toContain("border-0");
    expect(prev.className).toContain("bg-transparent");
    expect(prev.className).toContain("shadow-none");
    expect(prev.className).not.toContain("border-2");
    expect(next.className).toContain("border-0");
    expect(next.className).toContain("bg-transparent");
  });
});
