import { render, screen } from "@testing-library/react";
import { SearchCombobox } from "@/shared/components/SearchCombobox/SearchCombobox";

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
});
