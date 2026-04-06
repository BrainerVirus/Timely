import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { IssueMarkdownField } from "@/features/issues/ui/IssueMarkdownField/IssueMarkdownField";

describe("IssueMarkdownField", () => {
  it("shows a loading label while the editor chunk loads", () => {
    render(
      <I18nProvider>
        <IssueMarkdownField value="" onChange={vi.fn()} />
      </I18nProvider>,
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
