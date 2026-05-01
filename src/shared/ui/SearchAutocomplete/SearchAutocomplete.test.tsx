import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect, useRef, useState } from "react";
import { SearchAutocomplete } from "@/shared/ui/SearchAutocomplete/SearchAutocomplete";

import type { SearchAutocompleteSuggestion } from "@/shared/ui/SearchAutocomplete/search-autocomplete.lib";

const suggestions: SearchAutocompleteSuggestion[] = [
  { value: "audit#1", label: "Audit #1", searchText: "audit integration" },
  { value: "reports#1", label: "Reports #1", searchText: "reports frontend" },
];

function ControlledSearchAutocompleteHarness({
  initialValue = "",
  initialAppliedValue = "",
  syncAppliedToValue = false,
  debounceAppliedMs,
}: Readonly<{
  initialValue?: string;
  initialAppliedValue?: string;
  syncAppliedToValue?: boolean;
  debounceAppliedMs?: number;
}>) {
  const [value, setValue] = useState(initialValue);
  const [appliedValue, setAppliedValue] = useState(initialAppliedValue);
  const didMountRef = useRef(false);

  useEffect(() => {
    if (!syncAppliedToValue) return;
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    setAppliedValue(value);
  }, [syncAppliedToValue, value]);

  useEffect(() => {
    if (debounceAppliedMs === undefined) return;
    const timer = window.setTimeout(() => {
      setAppliedValue(value);
    }, debounceAppliedMs);
    return () => window.clearTimeout(timer);
  }, [debounceAppliedMs, value]);

  return (
    <>
      <SearchAutocomplete
        value={value}
        appliedValue={appliedValue}
        suggestions={suggestions}
        onValueChange={setValue}
      />
      <output data-testid="search-draft">{value}</output>
      <output data-testid="search-applied">{appliedValue}</output>
    </>
  );
}

describe("SearchAutocomplete", () => {
  it("renders a left-aligned search icon", () => {
    const { container } = render(
      <SearchAutocomplete
        value=""
        suggestions={suggestions}
        onValueChange={vi.fn()}
        placeholder="Search issues"
        className="w-full min-w-[14rem]"
      />,
    );

    expect(screen.getByPlaceholderText("Search issues")).toBeInTheDocument();
    expect(document.querySelector('[data-slot="search-autocomplete-icon"]')).not.toBeNull();
    expect(container.firstChild).toHaveClass("w-full");
    expect(container.firstChild).toHaveClass("min-w-[14rem]");
  });

  it("shows current query text and selects all of it on focus", async () => {
    render(
      <SearchAutocomplete
        value="audit#1"
        appliedValue="audit#1"
        suggestions={suggestions}
        onValueChange={vi.fn()}
        placeholder="Search issues"
      />,
    );

    const input = screen.getByPlaceholderText("Search issues") as HTMLInputElement;
    fireEvent.focus(input);

    await waitFor(() => {
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe(input.value.length);
    });
  });

  it("opens suggestions only for focused non-empty input with matches", async () => {
    const view = render(
      <SearchAutocomplete
        value=""
        suggestions={suggestions}
        onValueChange={vi.fn()}
        placeholder="Search issues"
      />,
    );

    const input = screen.getByPlaceholderText("Search issues");
    fireEvent.focus(input);
    expect(screen.queryByRole("option", { name: "Audit #1" })).not.toBeInTheDocument();

    view.rerender(
      <SearchAutocomplete
        value="audit"
        suggestions={suggestions}
        onValueChange={vi.fn()}
        placeholder="Search issues"
      />,
    );

    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Audit #1" })).toBeInTheDocument();
    });
  });

  it("closes suggestions on escape without mutating the current query", async () => {
    const onValueChange = vi.fn();

    render(
      <SearchAutocomplete
        value="audit"
        appliedValue="audit"
        suggestions={suggestions}
        onValueChange={onValueChange}
        placeholder="Search issues"
      />,
    );

    const input = screen.getByPlaceholderText("Search issues");
    fireEvent.focus(input);
    await screen.findByRole("option", { name: "Audit #1" });

    fireEvent.keyDown(input, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("option", { name: "Audit #1" })).not.toBeInTheDocument();
    });
    expect(onValueChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("audit");
  });

  it("supports deterministic keyboard selection", async () => {
    const onValueChange = vi.fn();
    const onSelectSuggestion = vi.fn();

    render(
      <SearchAutocomplete
        value="audit"
        suggestions={suggestions}
        onValueChange={onValueChange}
        onSelectSuggestion={onSelectSuggestion}
        placeholder="Search issues"
      />,
    );

    const input = screen.getByPlaceholderText("Search issues");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith("audit#1");
      expect(onSelectSuggestion).toHaveBeenCalledWith("audit#1");
    });
  });

  it("supports mouse selection and closes the overlay", async () => {
    const onValueChange = vi.fn();
    const onSelectSuggestion = vi.fn();

    render(
      <SearchAutocomplete
        value="rep"
        suggestions={suggestions}
        onValueChange={onValueChange}
        onSelectSuggestion={onSelectSuggestion}
        placeholder="Search issues"
      />,
    );

    const input = screen.getByPlaceholderText("Search issues");
    fireEvent.focus(input);
    fireEvent.click(await screen.findByRole("option", { name: "Reports #1" }));

    expect(onValueChange).toHaveBeenCalledWith("reports#1");
    expect(onSelectSuggestion).toHaveBeenCalledWith("reports#1");

    await waitFor(() => {
      expect(screen.queryByRole("option", { name: "Reports #1" })).not.toBeInTheDocument();
    });
  });

  it("lets a new query replace a previous selection without restoring old text", async () => {
    render(<ControlledSearchAutocompleteHarness initialValue="audit" debounceAppliedMs={300} />);

    const input = screen.getByRole("combobox") as HTMLInputElement;

    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByTestId("search-draft")).toHaveTextContent("audit#1");
      expect(screen.getByTestId("search-applied")).toHaveTextContent("audit#1");
    });

    fireEvent.focus(input);
    await waitFor(() => {
      expect(input).toHaveValue("audit#1");
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe(input.getAttribute("value")?.length ?? input.value.length);
    });

    fireEvent.input(input, { target: { value: "rep" } });

    expect(screen.getByTestId("search-draft")).toHaveTextContent("rep");

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Reports #1" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("option", { name: "Audit #1" })).not.toBeInTheDocument();
  });

  it("keeps draft typing stable while applied search lags behind debounce", async () => {
    vi.useFakeTimers();

    render(
      <ControlledSearchAutocompleteHarness
        initialValue="audit#1"
        initialAppliedValue="audit#1"
        debounceAppliedMs={300}
      />,
    );

    const input = screen.getByRole("combobox");

    fireEvent.focus(input);
    fireEvent.input(input, { target: { value: "rep" } });

    expect(screen.getByTestId("search-draft")).toHaveTextContent("rep");
    expect(screen.getByTestId("search-applied")).toHaveTextContent("audit#1");
    expect(input).toHaveValue("rep");

    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    expect(screen.getByTestId("search-draft")).toHaveTextContent("rep");
    expect(screen.getByTestId("search-applied")).toHaveTextContent("audit#1");

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByTestId("search-draft")).toHaveTextContent("rep");
    expect(screen.getByTestId("search-applied")).toHaveTextContent("rep");

    vi.useRealTimers();
  });

  it("does not restore the previous committed query when typing over a selected search", async () => {
    vi.useFakeTimers();

    render(
      <ControlledSearchAutocompleteHarness
        initialValue="audit#1"
        initialAppliedValue="audit#1"
        debounceAppliedMs={300}
      />,
    );

    const input = screen.getByRole("combobox");

    fireEvent.focus(input);
    fireEvent.input(input, { target: { value: "mfe" } });

    expect(screen.getByTestId("search-draft")).toHaveTextContent("mfe");
    expect(input).toHaveValue("mfe");

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByTestId("search-draft")).toHaveTextContent("mfe");
    expect(input).toHaveValue("mfe");
    expect(screen.getByTestId("search-applied")).toHaveTextContent("audit#1");

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(screen.getByTestId("search-draft")).toHaveTextContent("mfe");
    expect(screen.getByTestId("search-applied")).toHaveTextContent("mfe");
    expect(input).toHaveValue("mfe");

    vi.useRealTimers();
  });

  it("keeps an intentional backspace clear empty instead of restoring the previous query", async () => {
    vi.useFakeTimers();

    render(
      <ControlledSearchAutocompleteHarness
        initialValue="audit#1"
        initialAppliedValue="audit#1"
        debounceAppliedMs={300}
      />,
    );

    const input = screen.getByRole("combobox");

    fireEvent.focus(input);
    fireEvent.input(input, { target: { value: "" } });
    fireEvent.blur(input);

    expect(screen.getByTestId("search-draft")).toHaveTextContent("");
    expect(input).toHaveValue("");
    expect(screen.getByTestId("search-applied")).toHaveTextContent("audit#1");

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.getByTestId("search-draft")).toHaveTextContent("");
    expect(screen.getByTestId("search-applied")).toHaveTextContent("");
    expect(input).toHaveValue("");

    vi.useRealTimers();
  });
});
