import { render, screen } from "@testing-library/react";
import { SearchCombobox } from "@/shared/components/SearchCombobox/SearchCombobox";

vi.mock("@/core/services/I18nService/i18n", () => ({
  useI18n: vi.fn(() => ({ t: (key: string) => key })),
}));

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
