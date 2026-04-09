import { act, fireEvent, render, screen } from "@testing-library/react";
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

  it("does not show raw value when selected option is missing", () => {
    render(
      <SearchCombobox
        value="2721401"
        options={[{ value: "all", label: "All" }]}
        onChange={vi.fn()}
        searchPlaceholder="Search"
      />,
    );

    expect(screen.getByRole("combobox")).toHaveValue("");
    expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
  });

  it("selects whole current text on focus so next typing can replace it", () => {
    render(
      <SearchCombobox
        value="iter-web-current"
        options={[
          {
            value: "iter-web-current",
            label: "WEB · Apr 7 - 20, 2026",
            badge: "WEB",
          },
        ]}
        onChange={vi.fn()}
        searchPlaceholder="Search"
        replaceOnFocus
      />,
    );

    const input = screen.getByDisplayValue("WEB · Apr 7 - 20, 2026") as HTMLInputElement;
    fireEvent.focus(input);

    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
  });

  it("opens selected value as empty draft input when replaceOnFocus is enabled", () => {
    render(
      <SearchCombobox
        value="iter-web-current"
        options={[
          {
            value: "iter-web-current",
            label: "WEB · Apr 7 - 20, 2026",
            badge: "WEB",
          },
        ]}
        onChange={vi.fn()}
        searchPlaceholder="Search"
        replaceOnFocus
      />,
    );

    const input = screen.getByRole("combobox");
    fireEvent.click(input);

    expect(input).toHaveValue("");
  });

  it("restores original selected value when draft edit is abandoned", async () => {
    const onChange = vi.fn();
    render(
      <SearchCombobox
        value="iter-web-current"
        options={[
          {
            value: "iter-web-current",
            label: "WEB · Apr 7 - 20, 2026",
            badge: "WEB",
          },
          {
            value: "iter-web-next",
            label: "WEB · Apr 21 - May 4, 2026",
            badge: "WEB",
          },
        ]}
        onChange={onChange}
        searchPlaceholder="Search"
        replaceOnFocus
      />,
    );

    const input = screen.getByRole("combobox");
    fireEvent.click(screen.getByRole("button"));
    fireEvent.change(input, { target: { value: "may" } });
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    });

    fireEvent.keyDown(input, { key: "Escape" });

    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("WEB · Apr 7 - 20, 2026");
  });

  it("commits new value only after selecting option from draft search", async () => {
    const onChange = vi.fn();
    render(
      <SearchCombobox
        value="iter-web-current"
        options={[
          {
            value: "iter-web-current",
            label: "WEB · Apr 7 - 20, 2026",
            badge: "WEB",
          },
          {
            value: "iter-web-next",
            label: "WEB · Apr 21 - May 4, 2026",
            badge: "WEB",
          },
        ]}
        onChange={onChange}
        searchPlaceholder="Search"
        replaceOnFocus
      />,
    );

    const input = screen.getByRole("combobox");
    fireEvent.click(screen.getByRole("button"));
    fireEvent.change(input, { target: { value: "may" } });
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    });

    fireEvent.click(screen.getByText("WEB · Apr 21 - May 4, 2026"));

    expect(onChange).toHaveBeenCalledWith("iter-web-next");
  });
});
