import { fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { IssueDetailsMainSection } from "@/features/issues/sections/IssueDetailsMainSection/IssueDetailsMainSection";

import type { IssueDetailsSnapshot } from "@/shared/types/dashboard";

vi.mock("@/features/issues/ui/IssueMarkdownField/IssueMarkdownField", () => ({
  IssueMarkdownField: ({ value }: { value: string }) => <div>{value || "editor"}</div>,
}));

vi.mock("@/features/issues/ui/IssueMarkdownPreview/IssueMarkdownPreview", () => ({
  IssueMarkdownPreview: ({ source }: { source: string }) => <div>{source || "preview"}</div>,
}));

const details: IssueDetailsSnapshot = {
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
  activity: [],
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
      modes: ["write", "preview", "split"],
      supportsQuickActions: true,
    },
    timeTracking: {
      enabled: true,
      supportsQuickActions: true,
    },
  },
};

describe("IssueDetailsMainSection", () => {
  it("renders the details and forwards comment submission", () => {
    const onSubmitComment = vi.fn().mockResolvedValue(undefined);

    render(
      <I18nProvider>
        <IssueDetailsMainSection
          details={details}
          composerMode="write"
          commentBody="Hello"
          busy={false}
          onComposerModeChange={vi.fn()}
          onCommentBodyChange={vi.fn()}
          onSubmitComment={onSubmitComment}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole("heading", { name: "Reports page" })).toBeInTheDocument();
    expect(screen.getByText(/no activity yet for this issue/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /post comment/i }));
    expect(onSubmitComment).toHaveBeenCalledTimes(1);
  });
});
