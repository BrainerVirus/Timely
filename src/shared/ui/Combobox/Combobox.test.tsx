import { render, screen } from "@testing-library/react";
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
});
