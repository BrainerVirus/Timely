import { render, screen } from "@testing-library/react";
import {
  ComboboxWithAnchor,
  useComboboxAnchorRef,
} from "@/shared/ui/Combobox/combobox-anchor-context";

function Probe() {
  const anchorRef = useComboboxAnchorRef();
  return <output>{anchorRef ? "ready" : "missing"}</output>;
}

describe("combobox-anchor-context", () => {
  it("provides an anchor ref to combobox children", () => {
    render(
      <ComboboxWithAnchor>
        <Probe />
      </ComboboxWithAnchor>,
    );

    expect(screen.getByText("ready")).toBeInTheDocument();
  });
});
