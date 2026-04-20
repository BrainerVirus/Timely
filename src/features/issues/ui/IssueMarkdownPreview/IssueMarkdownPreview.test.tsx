import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { IssueMarkdownPreview } from "@/features/issues/ui/IssueMarkdownPreview/IssueMarkdownPreview";

vi.mock("@uiw/react-md-editor", () => ({
  default: {
    Markdown: ({ source }: { source: string }) => <div>{source}</div>,
  },
}));

describe("IssueMarkdownPreview", () => {
  it("renders the empty preview message when no source is provided", async () => {
    render(
      <I18nProvider>
        <IssueMarkdownPreview source="" />
      </I18nProvider>,
    );

    expect(await screen.findByText(/nothing to preview yet/i)).toBeInTheDocument();
  });

  it("applies the selected issue code theme to rendered markdown", async () => {
    const { container } = render(
      <I18nProvider>
        <IssueMarkdownPreview source="```ts\nconst x = 1\n```" codeTheme="dracula" />
      </I18nProvider>,
    );

    await screen.findByText(/const x = 1/i);
    expect(container.firstChild).toHaveAttribute("data-issue-code-theme", "dracula");
  });
});
