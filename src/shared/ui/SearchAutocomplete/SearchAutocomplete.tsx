import SearchIcon from "lucide-react/dist/esm/icons/search.js";
import { useId } from "react";
import { cn } from "@/shared/lib/utils";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/InputGroup/InputGroup";
import { useSearchAutocompleteController } from "@/shared/ui/SearchAutocomplete/internal/use-search-autocomplete-controller";

import type { SearchAutocompleteSuggestion } from "@/shared/ui/SearchAutocomplete/search-autocomplete.lib";

interface SearchAutocompleteProps {
  value: string;
  appliedValue?: string;
  suggestions: SearchAutocompleteSuggestion[];
  onValueChange: (value: string) => void;
  onSelectSuggestion?: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
}

export function SearchAutocomplete({
  value,
  appliedValue,
  suggestions,
  onValueChange,
  onSelectSuggestion,
  placeholder = "Search",
  emptyLabel = "No results",
  ariaLabel,
  disabled = false,
  className,
  contentClassName,
}: Readonly<SearchAutocompleteProps>) {
  const listboxId = useId();
  const controller = useSearchAutocompleteController({
    value,
    selectionValue: appliedValue ?? value,
    suggestions,
    disabled,
    onValueChange,
    onSelectSuggestion,
  });

  return (
    <div className={cn("relative w-full min-w-0", className)}>
      <InputGroup className="w-full">
        <InputGroupAddon align="inline-start" className="pointer-events-none">
          <span
            data-slot="search-autocomplete-icon"
            className="flex items-center text-muted-foreground"
          >
            <SearchIcon className="size-4" />
          </span>
        </InputGroupAddon>
        <InputGroupInput
          ref={controller.inputRef}
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={controller.open}
          aria-controls={controller.open ? listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            controller.open && controller.highlightedIndex >= 0
              ? `${listboxId}-option-${controller.highlightedIndex}`
              : undefined
          }
          placeholder={placeholder}
          disabled={disabled}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="none"
          autoComplete="off"
          value={value}
          onChange={(event) => {
            controller.handleInputValueChange(event.target.value);
          }}
          onFocus={controller.handleInputFocus}
          onBlur={controller.handleInputBlur}
          onKeyDown={controller.handleKeyDown}
        />
      </InputGroup>

      {controller.open ? (
        <div
          id={listboxId}
          role="listbox"
          className={cn(
            "absolute inset-x-0 top-full z-50 mt-1.5 max-h-96 overflow-hidden rounded-2xl border-2 border-border-strong bg-popover text-card-foreground shadow-clay-popup",
            contentClassName,
          )}
        >
          {controller.filteredSuggestions.length === 0 ? (
            <div className="flex justify-center py-8 text-center text-sm text-muted-foreground">
              {emptyLabel}
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto overscroll-contain p-2">
              {controller.filteredSuggestions.map((suggestion, index) => {
                const highlighted = index === controller.highlightedIndex;
                return (
                  <button
                    id={`${listboxId}-option-${index}`}
                    key={suggestion.value}
                    type="button"
                    role="option"
                    aria-selected={highlighted}
                    className={cn(
                      "relative flex w-full cursor-default items-center gap-2 rounded-xl px-3 py-2 pr-8 text-left text-sm outline-hidden transition-all",
                      highlighted ? "bg-field-hover text-foreground" : "text-muted-foreground",
                    )}
                    onMouseEnter={() => {
                      controller.handleSuggestionPointerEnter(index);
                    }}
                    onMouseDown={() => {
                      controller.clearPendingBlur();
                    }}
                    onClick={() => {
                      controller.handleSuggestionSelection(suggestion);
                    }}
                  >
                    <span className="flex-1 text-left">{suggestion.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
