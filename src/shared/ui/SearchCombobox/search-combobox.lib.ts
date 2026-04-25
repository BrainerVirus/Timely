export interface SearchComboboxOption {
  value: string;
  label: string;
  badge?: string;
  searchText?: string;
}

export interface ItemGroup {
  value: string;
  label: string;
  items: SearchComboboxOption[];
}

export function matchesQuery(
  option: SearchComboboxOption,
  queryValue: string,
  groupLabel?: string,
) {
  const tokens = queryValue.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const haystacks = [option.label, option.value, option.searchText, option.badge, groupLabel]
    .filter(Boolean)
    .map((candidate) => candidate!.toLowerCase());

  return tokens.every((token) => haystacks.some((candidate) => candidate.includes(token)));
}

export function buildGroups(options: SearchComboboxOption[]): ItemGroup[] {
  const map = new Map<string, SearchComboboxOption[]>();
  for (const option of options) {
    const key = option.badge ?? "";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(option);
  }
  return [...map.entries()].map(([label, items]) => ({ value: label, label, items }));
}
