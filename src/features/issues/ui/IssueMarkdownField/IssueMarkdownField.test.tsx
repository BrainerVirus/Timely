import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState, type TextareaHTMLAttributes } from "react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { IssueMarkdownField } from "@/features/issues/ui/IssueMarkdownField/IssueMarkdownField";

vi.mock("@uiw/react-md-editor", () => ({
  default: Object.assign(
    ({
      value,
      onChange,
      textareaProps,
      commands,
    }: {
      value?: string;
      onChange?: (value?: string) => void;
      textareaProps?: TextareaHTMLAttributes<HTMLTextAreaElement>;
      commands?: Array<{ name?: string }>;
    }) => (
      <div>
        <div>{commands?.map((command) => command.name).join("|")}</div>
        <textarea
          aria-label="Markdown editor"
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          {...textareaProps}
        />
      </div>
    ),
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

  it("renders an integrated preview toggle instead of split mode chrome", async () => {
    render(
      <I18nProvider>
        <IssueMarkdownField
          value=""
          onChange={vi.fn()}
          placeholder="Write a comment or drag your files here..."
        />
      </I18nProvider>,
    );

    expect(await screen.findByRole("button", { name: "Preview" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Split" })).not.toBeInTheDocument();
    expect(
      await screen.findByPlaceholderText("Write a comment or drag your files here..."),
    ).toBeInTheDocument();
  });

  it("renders the preview surface when preview mode is selected", async () => {
    render(
      <I18nProvider>
        <IssueMarkdownField value="" onChange={vi.fn()} mode="preview" />
      </I18nProvider>,
    );
    expect(await screen.findByText(/nothing to preview yet/i)).toBeInTheDocument();
  });

  it("suggests and inserts the /spend quick action", async () => {
    function Harness() {
      const [value, setValue] = useState("/");
      return <IssueMarkdownField value={value} onChange={setValue} />;
    }

    render(
      <I18nProvider>
        <Harness />
      </I18nProvider>,
    );

    const editor = await screen.findByRole("textbox", { name: "Markdown editor" });
    fireEvent.change(editor, { target: { value: "/sp" } });

    const suggestion = await screen.findByRole("button", { name: "/spend 1h" });
    fireEvent.click(suggestion);

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "Markdown editor" })).toHaveValue("/spend 1h ");
    });
  });
});
