import { fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/app/providers/I18nService/i18n";
import { AssignedIssuesSearchBox } from "@/features/issues/ui/AssignedIssuesBoard/internal/AssignedIssuesSearchBox/AssignedIssuesSearchBox";

describe("AssignedIssuesSearchBox", () => {
  it("applies a suggestion when one is selected", () => {
    const onValueChange = vi.fn();

    render(
      <I18nProvider>
        <AssignedIssuesSearchBox
          value="rep"
          suggestions={[{ value: "reports#1", label: "reports#1" }]}
          onValueChange={onValueChange}
        />
      </I18nProvider>,
    );

    const input = screen.getByPlaceholderText(/search assigned issues/i);
    fireEvent.focus(input);
    fireEvent.mouseDown(screen.getByRole("button", { name: "reports#1" }));

    expect(onValueChange).toHaveBeenCalledWith("reports#1");
  });
});
