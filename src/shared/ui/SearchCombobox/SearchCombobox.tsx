import * as React from "react";
import { cn } from "@/shared/lib/utils";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
} from "@/shared/ui/Combobox/Combobox";

interface SearchComboboxOption {
  value: string;
  label: string;
  badge?: string;
  searchText?: string;
}

interface SearchComboboxProps {
  value: string;
  options: SearchComboboxOption[];
  searchPlaceholder?: string;
  noResultsLabel?: string;
  displayLabel?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  initialVisibleCount?: number;
  visibleCountIncrement?: number;
}

interface ItemGroup {
  value: string;
  label: string;
  items: SearchComboboxOption[];
}

export function SearchCombobox({
  value,
  options,
  searchPlaceholder = "Search",
  noResultsLabel = "No results",
  displayLabel,
  onChange,
  disabled = false,
  className,
  contentClassName,
  initialVisibleCount = Number.POSITIVE_INFINITY,
  visibleCountIncrement = initialVisibleCount,
}: Readonly<SearchComboboxProps>) {
  function matchesQuery(option: SearchComboboxOption, queryValue: string, groupLabel?: string) {
    const tokens = queryValue
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    if (tokens.length === 0) {
      return true;
    }

     const haystacks = [
       option.label,
       option.value,
       option.searchText,
       option.badge,
       groupLabel,
     ]
       .filter(Boolean)
       .map((candidate) => candidate!.toLowerCase());

     return tokens.every((token) => haystacks.some((candidate) => candidate.includes(token)));
   }
  const hasAnyBadge = options.some((o) => Boolean(o.badge));

  const groups: ItemGroup[] = React.useMemo(() => {
    if (!hasAnyBadge) return [];
    const map = new Map<string, SearchComboboxOption[]>();
    for (const opt of options) {
      const key = opt.badge ?? "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(opt);
    }
    return [...map.entries()].map(([label, items]) => ({ value: label, label, items }));
  }, [options, hasAnyBadge]);
  const [query, setQuery] = React.useState("");
  const [visibleCount, setVisibleCount] = React.useState(initialVisibleCount);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const filteredGroups: ItemGroup[] = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((item) => matchesQuery(item, q, g.label)),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query]);

  const filteredFlat: SearchComboboxOption[] = React.useMemo(() => {
    if (hasAnyBadge) return [];
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((item) => matchesQuery(item, q));
  }, [options, hasAnyBadge, query]);

  React.useEffect(() => {
    setVisibleCount(initialVisibleCount);
  }, [initialVisibleCount, options, query]);

  const visibleGroups = React.useMemo(() => {
    if (!Number.isFinite(visibleCount)) return filteredGroups;
    let remaining = visibleCount;
    const nextGroups: ItemGroup[] = [];
    for (const group of filteredGroups) {
      if (remaining <= 0) break;
      const items = group.items.slice(0, remaining);
      if (items.length === 0) continue;
      nextGroups.push({ ...group, items });
      remaining -= items.length;
    }
    return nextGroups;
  }, [filteredGroups, visibleCount]);

  const visibleFlat = React.useMemo(() => {
    if (!Number.isFinite(visibleCount)) return filteredFlat;
    return filteredFlat.slice(0, visibleCount);
  }, [filteredFlat, visibleCount]);

  function handleListScroll(event: React.UIEvent<HTMLElement>) {
    if (!Number.isFinite(visibleCount)) return;
    const target = event.currentTarget;
    const reachedBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 24;
    if (!reachedBottom) return;
    setVisibleCount((current) => current + visibleCountIncrement);
  }

  function handleInputValueChange(nextValue: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(nextValue);
    }, 200);
  }
  const labelMap = React.useMemo(
    () => new Map(options.map((opt) => [opt.value, opt.label])),
    [options],
  );
  const resolvedInputClassName = cn("min-w-72", className);

  return (
    <Combobox
      value={value}
      onValueChange={(v) => {
        if (typeof v === "string" && v) onChange(v);
      }}
      items={hasAnyBadge ? groups : options}
      filteredItems={hasAnyBadge ? visibleGroups : visibleFlat}
      filter={null}
      onInputValueChange={handleInputValueChange}
      itemToStringLabel={(v: string) => {
        if (displayLabel) return displayLabel;
        return labelMap.get(v) ?? v;
      }}
    >
      <ComboboxInput
        placeholder={searchPlaceholder}
        showTrigger
        disabled={disabled}
        className={resolvedInputClassName}
      />
      <ComboboxContent sideOffset={6} className={contentClassName}>
        <ComboboxEmpty>{noResultsLabel}</ComboboxEmpty>
        <ComboboxList onScroll={handleListScroll}>
          {hasAnyBadge
            ? visibleGroups.map((group, groupIdx) => (
                <ComboboxGroup key={group.value} items={group.items}>
                  {group.label ? <ComboboxLabel>{group.label}</ComboboxLabel> : null}
                  <ComboboxCollection>
                    {(item: SearchComboboxOption) => (
                      <ComboboxItem key={item.value} value={item.value}>
                        <span className="flex-1 truncate">{item.label}</span>
                      </ComboboxItem>
                    )}
                  </ComboboxCollection>
                  {groupIdx < visibleGroups.length - 1 ? <ComboboxSeparator /> : null}
                </ComboboxGroup>
              ))
            : null}
          {hasAnyBadge ? null : (
            <ComboboxCollection>
              {(item: SearchComboboxOption) => (
                <ComboboxItem key={item.value} value={item.value}>
                  <span className="flex-1 truncate">{item.label}</span>
                </ComboboxItem>
              )}
            </ComboboxCollection>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
