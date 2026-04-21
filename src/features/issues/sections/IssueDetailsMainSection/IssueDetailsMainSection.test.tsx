import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { IssueDetailsMainSection } from "@/features/issues/sections/IssueDetailsMainSection/IssueDetailsMainSection";

import type { IssueDetailsSnapshot } from "@/shared/types/dashboard";

vi.mock("@/features/issues/ui/IssueMarkdownField/IssueMarkdownField", () => ({
  IssueMarkdownField: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange?: (next: string) => void;
    placeholder?: string;
  }) => (
    <div>
      <button type="button">Preview</button>
      <textarea
        aria-label="Comment field"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
      />
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
      author: { name: "Older Author", username: "someoneelse" },
    },
    {
      id: "newer",
      type: "comment",
      body: "Newest note",
      createdAt: "2026-04-19T10:00:00Z",
      system: false,
      author: { name: "Newest Author", username: "cpincetti" },
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
    milestone: {
      enabled: true,
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
          activityItems={details.activity}
          activityHasMore={false}
          activityLoadingMore={false}
          onLoadMoreActivity={vi.fn().mockResolvedValue(undefined)}
        />
      </I18nProvider>,
    );

    expect(screen.queryByRole("heading", { name: "Reports page" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Description" })).not.toBeInTheDocument();
    expect(screen.queryByText(/rendered from markdown/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit description/i })).not.toBeInTheDocument();
    const descriptionPreview = screen
      .getAllByTestId("markdown-preview-plain")
      .find((node) => node.textContent?.includes("Issue description"));
    expect(screen.getByText("Issue description")).toBeInTheDocument();
    expect(descriptionPreview).toBeDefined();
    expect(descriptionPreview).toHaveAttribute(
      "data-class-name",
      expect.not.stringContaining("bg-"),
    );
    expect(descriptionPreview).toHaveAttribute(
      "data-class-name",
      expect.not.stringContaining("border"),
    );
    expect(descriptionPreview).toHaveAttribute(
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
    expect(screen.getByTestId("relations-scroll-linked-items")).toHaveClass("max-h-[27rem]");
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

  it("shows Edit/Delete only for comments whose author matches currentUsername and saves edits", async () => {
    const onEditComment = vi.fn().mockResolvedValue(undefined);
    const onDeleteComment = vi.fn().mockResolvedValue(undefined);
    const confirmSpy = vi.spyOn(globalThis, "confirm").mockReturnValue(true);

    render(
      <I18nProvider>
        <IssueDetailsMainSection
          details={details}
          timezone="America/Santiago"
          codeTheme="timely-night"
          composerMode="write"
          commentBody=""
          busy={false}
          currentUsername="cpincetti"
          onComposerModeChange={vi.fn()}
          onCommentBodyChange={vi.fn()}
          onSubmitComment={vi.fn().mockResolvedValue(undefined)}
          onToggleIssueState={vi.fn().mockResolvedValue(undefined)}
          onOpenIssue={vi.fn()}
          activityItems={details.activity}
          activityHasMore={false}
          activityLoadingMore={false}
          onLoadMoreActivity={vi.fn().mockResolvedValue(undefined)}
          onEditComment={onEditComment}
          onDeleteComment={onDeleteComment}
        />
      </I18nProvider>,
    );

    const ownedArticle = screen.getByText("Newest note").closest("article") as HTMLElement;
    const otherArticle = screen.getByText("Older note").closest("article") as HTMLElement;
    expect(within(ownedArticle).getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(within(ownedArticle).getByRole("button", { name: /delete/i })).toBeInTheDocument();
    expect(within(otherArticle).queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
    expect(within(otherArticle).queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();

    fireEvent.click(within(ownedArticle).getByRole("button", { name: /edit/i }));
    fireEvent.click(within(ownedArticle).getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(onEditComment).toHaveBeenCalledTimes(1);
    });
    expect(onEditComment.mock.calls[0]?.[0]).toBe("newer");
    expect(typeof onEditComment.mock.calls[0]?.[1]).toBe("string");

    fireEvent.click(within(ownedArticle).getByRole("button", { name: /delete/i }));
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(onDeleteComment).toHaveBeenCalledWith("newer");
    });

    confirmSpy.mockRestore();
  });

  it("saves description when editing from the hub-controlled props", async () => {
    const onSaveDescription = vi.fn().mockResolvedValue(undefined);

    function Harness() {
      const [draft, setDraft] = useState("Issue description");
      return (
        <IssueDetailsMainSection
          details={details}
          timezone="America/Santiago"
          codeTheme="timely-night"
          composerMode="write"
          commentBody=""
          busy={false}
          onComposerModeChange={vi.fn()}
          onCommentBodyChange={vi.fn()}
          onSubmitComment={vi.fn().mockResolvedValue(undefined)}
          onToggleIssueState={vi.fn().mockResolvedValue(undefined)}
          onOpenIssue={vi.fn()}
          activityItems={details.activity}
          activityHasMore={false}
          activityLoadingMore={false}
          onLoadMoreActivity={vi.fn().mockResolvedValue(undefined)}
          descriptionEditing
          descriptionDraft={draft}
          onDescriptionDraftChange={setDraft}
          onDescriptionComposerModeChange={vi.fn()}
          onCancelDescriptionEdit={vi.fn()}
          onSaveDescription={onSaveDescription}
        />
      );
    }

    render(
      <I18nProvider>
        <Harness />
      </I18nProvider>,
    );

    const descriptionField = screen.getByPlaceholderText(/write the issue description/i);
    fireEvent.change(descriptionField, { target: { value: "## Updated" } });
    fireEvent.click(screen.getByRole("button", { name: /save description/i }));

    await waitFor(() => {
      expect(onSaveDescription).toHaveBeenCalledWith("## Updated");
    });
  });

  it("uses details.viewerUsername for comment actions when currentUsername is not passed", () => {
    const detailsWithViewer = {
      ...details,
      viewerUsername: "cpincetti",
    } as IssueDetailsSnapshot;

    render(
      <I18nProvider>
        <IssueDetailsMainSection
          details={detailsWithViewer}
          timezone="America/Santiago"
          codeTheme="timely-night"
          composerMode="write"
          commentBody=""
          busy={false}
          onComposerModeChange={vi.fn()}
          onCommentBodyChange={vi.fn()}
          onSubmitComment={vi.fn().mockResolvedValue(undefined)}
          onToggleIssueState={vi.fn().mockResolvedValue(undefined)}
          onOpenIssue={vi.fn()}
          activityItems={detailsWithViewer.activity}
          activityHasMore={false}
          activityLoadingMore={false}
          onLoadMoreActivity={vi.fn().mockResolvedValue(undefined)}
          onEditComment={vi.fn()}
          onDeleteComment={vi.fn()}
        />
      </I18nProvider>,
    );

    const ownedArticle = screen.getByText("Newest note").closest("article") as HTMLElement;
    expect(within(ownedArticle).getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(within(ownedArticle).getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });
});
