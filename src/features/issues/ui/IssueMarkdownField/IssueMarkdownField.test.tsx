import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { IssueMarkdownField } from "@/features/issues/ui/IssueMarkdownField/IssueMarkdownField";

vi.mock("@uiw/react-md-editor", () => ({
  default: Object.assign(
    ({ value }: { value?: string }) => <div>{value}</div>,
    {
      Markdown: ({ source }: { source: string }) => <div>{source}</div>,
    },
  ),
}));

describe("IssueMarkdownField", () => {
  it("shows a loading label while the editor chunk loads", () => {
    render(
      <I18nProvider>
        <IssueMarkdownField value="" onChange={vi.fn()} />
      </I18nProvider>,
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders the preview surface when preview mode is selected", async () => {
    render(
      <I18nProvider>
        <IssueMarkdownField value="" onChange={vi.fn()} mode="preview" />
      </I18nProvider>,
    );
    expect(await screen.findByText(/nothing to preview yet/i)).toBeInTheDocument();
  });
});
