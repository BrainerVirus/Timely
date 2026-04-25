import { useEffect, useMemo, useRef, useState } from "react";
import { matchesSearchAutocompleteQuery } from "@/shared/ui/SearchAutocomplete/search-autocomplete.lib";

import type { SearchAutocompleteSuggestion } from "@/shared/ui/SearchAutocomplete/search-autocomplete.lib";
import type { KeyboardEvent } from "react";

interface UseSearchAutocompleteControllerOptions {
  value: string;
  selectionValue: string;
  suggestions: SearchAutocompleteSuggestion[];
  disabled?: boolean;
  onValueChange: (value: string) => void;
  onSelectSuggestion?: (value: string) => void;
}

export function useSearchAutocompleteController({
  value,
  selectionValue,
  suggestions,
  disabled = false,
  onValueChange,
  onSelectSuggestion,
}: Readonly<UseSearchAutocompleteControllerOptions>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(
    () => () => {
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current);
      }
    },
    [],
  );

  const filteredSuggestions = useMemo(() => {
    const normalizedValue = value.trim();
    if (!normalizedValue) return [] as SearchAutocompleteSuggestion[];
    return suggestions.filter((suggestion) =>
      matchesSearchAutocompleteQuery(suggestion, normalizedValue),
    );
  }, [suggestions, value]);

  const open = !disabled && isFocused && value.trim().length > 0 && filteredSuggestions.length > 0;

  useEffect(() => {
    if (!open) {
      setHighlightedIndex(-1);
      return;
    }
    setHighlightedIndex((current) => {
      if (current >= filteredSuggestions.length) return 0;
      return current === -1 ? 0 : current;
    });
  }, [filteredSuggestions.length, open]);

  function clearPendingBlur() {
    if (blurTimeoutRef.current) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  }

  function selectAllText() {
    const input = inputRef.current;
    if (!input || selectionValue.length === 0) return;
    window.setTimeout(() => {
      input.setSelectionRange(0, input.value.length);
    }, 0);
  }

  function commitSuggestion(suggestion: SearchAutocompleteSuggestion) {
    clearPendingBlur();
    onValueChange(suggestion.value);
    onSelectSuggestion?.(suggestion.value);
    setIsFocused(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      clearPendingBlur();
      setIsFocused(false);
      return;
    }

    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((current) =>
        current < filteredSuggestions.length - 1 ? current + 1 : 0,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) =>
        current > 0 ? current - 1 : filteredSuggestions.length - 1,
      );
      return;
    }

    if (event.key === "Enter") {
      const highlightedSuggestion = filteredSuggestions[highlightedIndex];
      if (!highlightedSuggestion) return;
      event.preventDefault();
      commitSuggestion(highlightedSuggestion);
    }
  }

  return {
    inputRef,
    filteredSuggestions,
    highlightedIndex,
    open,
    clearPendingBlur,
    setHighlightedIndex,
    handleInputValueChange: (nextValue: string) => {
      onValueChange(nextValue);
    },
    handleInputFocus: () => {
      clearPendingBlur();
      setIsFocused(true);
      selectAllText();
    },
    handleInputBlur: () => {
      clearPendingBlur();
      blurTimeoutRef.current = window.setTimeout(() => {
        setIsFocused(false);
      }, 120);
    },
    handleKeyDown,
    handleSuggestionPointerEnter: (index: number) => {
      setHighlightedIndex(index);
    },
    handleSuggestionSelection: (suggestion: SearchAutocompleteSuggestion) => {
      commitSuggestion(suggestion);
    },
  };
}
