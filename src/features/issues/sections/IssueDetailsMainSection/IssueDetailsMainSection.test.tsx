import { fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { IssueDetailsMainSection } from "@/features/issues/sections/IssueDetailsMainSection/IssueDetailsMainSection";

import type { IssueDetailsSnapshot } from "@/shared/types/dashboard";

vi.mock("@/features/issues/ui/IssueMarkdownField/IssueMarkdownField", () => ({
  IssueMarkdownField: ({
    value,
    placeholder,
  }: {
    value: string;
    placeholder?: string;
  }) => (
    <div>
      <button type="button">Preview</button>
      <textarea aria-label="Comment field" placeholder={placeholder} defaultValue={value} />
      <div>{value || "editor"}</div>
    </div>
  ),
}));

vi.mock("@/features/issues/ui/IssueMarkdownPreview/IssueMarkdownPreview", () => ({
  IssueMarkdownPreview: ({
    source,
    className,
    presentation,
  }: {
    source: string;
    className?: string;
    presentation?: string;
  }) => (
    <div
      data-testid={`markdown-preview-${presentation ?? "panel"}`}
      data-class-name={className ?? ""}
    >
      {source || "preview"}
    </div>
  ),
}));

const details = {
  reference: {
    provider: "gitlab",
    issueId: "g/p#1",
    providerIssueRef: "gid://gitlab/Issue/1",
  },
  key: "g/p#1",
  title: "Reports page",
  state: "opened",
  description: "Issue description",
  labels: [{ id: "workflow::doing", label: "workflow::doing" }],
  activity: [
    {
      id: "older",
      type: "comment",
      body: "Older note",
      createdAt: "2026-04-18T10:00:00Z",
      system: false,
      author: { name: "Older Author" },
    },
    {
      id: "newer",
      type: "comment",
      body: "Newest note",
      createdAt: "2026-04-19T10:00:00Z",
      system: false,
      author: { name: "Newest Author" },
    },
  ],
  capabilities: {
    status: {
      enabled: true,
      options: [],
    },
    labels: {
      enabled: true,
      options: [],
    },
    iteration: {
      enabled: false,
      options: [],
    },
    composer: {
      enabled: true,
      modes: ["write", "preview"],
      supportsQuickActions: true,
    },
    timeTracking: {
      enabled: true,
      supportsQuickActions: true,
    },
  },
  author: { name: "Cristhofer Pincetti", username: "cpincetti" },
  createdAt: "2026-04-19T09:30:00Z",
  status: { id: "status::todo", label: "To do" },
  linkedItems: [
    {
      reference: { provider: "gitlab", issueId: "g/p#2" },
      key: "g/p#2",
      title: "Linked issue",
      relationLabel: "Related to",
      state: "opened",
      labels: [],
    },
  ],
  childItems: [
    {
      reference: { provider: "gitlab", issueId: "g/p#3" },
      key: "g/p#3",
      title: "Child issue",
      relationLabel: "Child item",
      state: "opened",
      labels: [],
    },
  ],
} as unknown as IssueDetailsSnapshot;

describe("IssueDetailsMainSection", () => {
  it("renders markdown body first, collapsible relations, composer actions, and newer activity first", () => {
    const onSubmitComment = vi.fn().mockResolvedValue(undefined);
    const onOpenIssue = vi.fn();
    const onToggleIssueState = vi.fn().mockResolvedValue(undefined);

    render(
      <I18nProvider>
        <IssueDetailsMainSection
          details={details}
          timezone="America/Santiago"
          codeTheme="timely-night"
          composerMode="write"
          commentBody="Hello"
          busy={false}
          onComposerModeChange={vi.fn()}
          onCommentBodyChange={vi.fn()}
          onSubmitComment={onSubmitComment}
          onToggleIssueState={onToggleIssueState}
          onOpenIssue={onOpenIssue}
        />
      </I18nProvider>,
    );

    expect(screen.queryByRole("heading", { name: "Reports page" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Description" })).not.toBeInTheDocument();
    expect(screen.queryByText(/rendered from markdown/i)).not.toBeInTheDocument();
    expect(screen.getByText("Issue description")).toBeInTheDocument();
    expect(screen.getByTestId("markdown-preview-plain")).toBeInTheDocument();
    expect(screen.getByTestId("markdown-preview-plain")).toHaveAttribute(
      "data-class-name",
      expect.not.stringContaining("bg-"),
    );
    expect(screen.getByTestId("markdown-preview-plain")).toHaveAttribute(
      "data-class-name",
      expect.not.stringContaining("border"),
    );
    expect(screen.getByTestId("markdown-preview-plain")).toHaveAttribute(
      "data-class-name",
      expect.not.stringContaining("shadow"),
    );
    expect(screen.getByRole("heading", { name: "Linked items" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Child items" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Activity" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Comment" })).toBeInTheDocument();
    expect(screen.queryByText("Quick actions")).not.toBeInTheDocument();
    expect(screen.queryByText("Split")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close issue/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /collapse linked items/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /collapse child items/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/write a comment or drag your files here/i)).toBeInTheDocument();
    expect(screen.queryByText(/gitlab quick actions/i)).not.toBeInTheDocument();

    const commentHeading = screen.getByRole("heading", { name: "Comment" });
    const activityHeading = screen.getByRole("heading", { name: "Activity" });
    expect(commentHeading.compareDocumentPosition(activityHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    const newestNote = screen.getByText("Newest note");
    const olderNote = screen.getByText("Older note");
    expect(newestNote.compareDocumentPosition(olderNote)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.queryByText("2026-04-19T10:00:00Z")).not.toBeInTheDocument();
    expect(screen.getByTestId("relations-scroll-linked-items")).toHaveClass("max-h-80");
    expect(screen.getByTestId("relations-scroll-linked-items")).not.toHaveClass("rounded-[1.35rem]");
    expect(screen.getByTestId("relations-scroll-linked-items")).not.toHaveClass("border");
    expect(screen.getByTestId("relations-scroll-child-items")).not.toHaveClass("bg-field/25");

    fireEvent.click(screen.getByRole("button", { name: /collapse linked items/i }));
    expect(screen.queryByRole("button", { name: /linked issue/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /expand linked items/i }));
    fireEvent.click(screen.getByRole("button", { name: /linked issue/i }));
    fireEvent.click(screen.getByRole("button", { name: /child issue/i }));
    fireEvent.click(screen.getByRole("button", { name: /post comment/i }));
    fireEvent.click(screen.getByRole("button", { name: /close issue/i }));

    expect(onOpenIssue).toHaveBeenNthCalledWith(1, {
      provider: "gitlab",
      issueId: "g/p#2",
    });
    expect(onOpenIssue).toHaveBeenNthCalledWith(2, {
      provider: "gitlab",
      issueId: "g/p#3",
    });
    expect(onSubmitComment).toHaveBeenCalledTimes(1);
    expect(onToggleIssueState).toHaveBeenCalledTimes(1);
  });
});
