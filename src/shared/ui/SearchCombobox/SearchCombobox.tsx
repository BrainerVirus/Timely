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
import { buildGroups, matchesQuery } from "@/shared/ui/SearchCombobox/search-combobox.lib";

import type {
  ItemGroup,
  SearchComboboxOption,
} from "@/shared/ui/SearchCombobox/search-combobox.lib";
interface SearchComboboxProps {
  value: string;
  options: SearchComboboxOption[];
  searchPlaceholder?: string;
  noResultsLabel?: string;
  displayLabel?: string;
  replaceOnFocus?: boolean;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  initialVisibleCount?: number;
  visibleCountIncrement?: number;
}
export function SearchCombobox({
  value,
  options,
  searchPlaceholder = "Search",
  noResultsLabel = "No results",
  displayLabel,
  replaceOnFocus = false,
  onChange,
  disabled = false,
  className,
  contentClassName,
  initialVisibleCount = Number.POSITIVE_INFINITY,
  visibleCountIncrement = initialVisibleCount,
}: Readonly<SearchComboboxProps>) {
  const hasAnyBadge = options.some((o) => Boolean(o.badge));
  const labelMap = React.useMemo(
    () => new Map(options.map((opt) => [opt.value, opt.label])),
    [options],
  );
  const resolvedLabel = displayLabel ?? (value !== "" ? (labelMap.get(value) ?? "") : "");
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [inputValue, setInputValue] = React.useState(resolvedLabel);
  const [visibleCount, setVisibleCount] = React.useState(initialVisibleCount);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const didCommitSelectionRef = React.useRef(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const groups: ItemGroup[] = React.useMemo(() => {
    if (!hasAnyBadge) return [];
    return buildGroups(options);
  }, [options, hasAnyBadge]);
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
  React.useEffect(() => {
    if (!open) setInputValue(resolvedLabel);
  }, [open, resolvedLabel]);
  React.useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );
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
    setInputValue(nextValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(nextValue);
    }, 200);
  }
  const resolvedInputClassName = cn("min-w-72", className);
  function resetDraftToCommittedLabel() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery("");
    setInputValue(resolvedLabel);
  }
  function beginDraftEdit() {
    if (!replaceOnFocus || !resolvedLabel || inputValue !== resolvedLabel) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery("");
    setInputValue("");
  }
  function selectCurrentValue() {
    if (!replaceOnFocus || !resolvedLabel) return;
    inputRef.current?.setSelectionRange(0, inputRef.current.value.length);
  }
  return (
    <Combobox
      value={value}
      inputValue={inputValue}
      onValueChange={(v) => {
        if (typeof v !== "string" || !v) return;
        didCommitSelectionRef.current = true;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setQuery("");
        setInputValue(displayLabel ?? labelMap.get(v) ?? "");
        onChange(v);
      }}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          didCommitSelectionRef.current = false;
          beginDraftEdit();
          if (!replaceOnFocus) {
            setQuery("");
            setInputValue(resolvedLabel);
          }
          if (!replaceOnFocus || !resolvedLabel) selectCurrentValue();
          return;
        }
        if (!didCommitSelectionRef.current) {
          resetDraftToCommittedLabel();
        }
        didCommitSelectionRef.current = false;
      }}
      items={hasAnyBadge ? groups : options}
      filteredItems={hasAnyBadge ? visibleGroups : visibleFlat}
      filter={null}
      onInputValueChange={handleInputValueChange}
      itemToStringLabel={(v: string) => {
        if (displayLabel) return displayLabel;
        return labelMap.get(v) ?? "";
      }}
    >
      <ComboboxInput
        ref={inputRef}
        placeholder={searchPlaceholder}
        showTrigger
        disabled={disabled}
        className={resolvedInputClassName}
        onFocus={selectCurrentValue}
        onClick={beginDraftEdit}
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
