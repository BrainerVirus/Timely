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

  it("matches grouped options by badge text", async () => {
    render(
      <SearchCombobox
        value=""
        options={[
          { value: "Africa/Abidjan", label: "(GMT+0) Abidjan", badge: "Africa" },
          { value: "America/Santiago", label: "(GMT-4) Santiago", badge: "America" },
        ]}
        onChange={vi.fn()}
        searchPlaceholder="Search"
      />,
    );

    fireEvent.click(screen.getByRole("button"));
    fireEvent.change(screen.getByPlaceholderText("Search"), {
      target: { value: "africa" },
    });
    await new Promise((resolve) => window.setTimeout(resolve, 250));

    expect(screen.getByText("Africa")).toBeInTheDocument();
    expect(screen.getByText("(GMT+0) Abidjan")).toBeInTheDocument();
    expect(screen.queryByText("(GMT-4) Santiago")).not.toBeInTheDocument();
  });

  it("matches hidden search text for grouped options", async () => {
    render(
      <SearchCombobox
        value=""
        options={[
          {
            value: "iter-web-current",
            label: "WEB · Apr 7 - 20, 2026",
            badge: "WEB",
            searchText: "web current apr 7 2026-04-07 sprint",
          },
        ]}
        onChange={vi.fn()}
        searchPlaceholder="Search"
      />,
    );

    fireEvent.click(screen.getByRole("button"));
    fireEvent.change(screen.getByPlaceholderText("Search"), {
      target: { value: "web current" },
    });
    await new Promise((resolve) => window.setTimeout(resolve, 250));

    expect(screen.getByText("WEB · Apr 7 - 20, 2026")).toBeInTheDocument();
  });
});
