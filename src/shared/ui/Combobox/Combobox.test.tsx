import { fireEvent, render, screen } from "@testing-library/react";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@/shared/ui/Combobox/Combobox";

describe("Combobox", () => {
  it("renders combobox with input", () => {
    render(
      <Combobox>
        <ComboboxInput placeholder="Search" />
        <ComboboxContent>
          <ComboboxList>
            <ComboboxItem value="a">Option A</ComboboxItem>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );
    expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
  });

  it("keeps popup min and max width anchored to the trigger", () => {
    render(
      <Combobox>
        <ComboboxInput placeholder="Search" />
        <ComboboxContent>
          <ComboboxList>
            <ComboboxItem value="a">Option A</ComboboxItem>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );

    fireEvent.click(screen.getByRole("button"));

    const popup = document.querySelector('[data-slot="combobox-content"]');
    expect(popup).not.toBeNull();
    expect(popup).toHaveClass("min-w-(--anchor-width)");
    expect(popup).toHaveClass("max-w-(--anchor-width)");
  });
});
