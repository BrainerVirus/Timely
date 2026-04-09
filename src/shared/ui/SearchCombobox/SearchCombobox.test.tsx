import { fireEvent, render, screen } from "@testing-library/react";
import { SearchCombobox } from "@/shared/ui/SearchCombobox/SearchCombobox";

describe("SearchCombobox", () => {
  it("renders with options", () => {
    render(
      <SearchCombobox
        value=""
        options={[{ value: "a", label: "Option A" }]}
        onChange={vi.fn()}
        searchPlaceholder="Search"
      />,
    );
    expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
  });

  it("keeps popup width anchored to the trigger by default", () => {
    render(
      <SearchCombobox
        value=""
        options={[{ value: "a", label: "Option A" }]}
        onChange={vi.fn()}
        searchPlaceholder="Search"
        className="w-full"
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    const popup = document.querySelector('[data-slot="combobox-content"]');
    expect(popup).not.toBeNull();
    expect(popup).toHaveClass("w-(--anchor-width)");
    expect(popup).not.toHaveClass("w-full");
  });
});
