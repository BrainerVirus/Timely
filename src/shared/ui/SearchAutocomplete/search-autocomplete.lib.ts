export interface SearchAutocompleteSuggestion {
  value: string;
  label: string;
  searchText?: string;
}

export function matchesSearchAutocompleteQuery(
  suggestion: SearchAutocompleteSuggestion,
  queryValue: string,
) {
  const tokens = queryValue.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const haystacks = [suggestion.label, suggestion.value, suggestion.searchText]
    .filter(Boolean)
    .map((candidate) => candidate!.toLowerCase());

  return tokens.every((token) => haystacks.some((candidate) => candidate.includes(token)));
}
