import * as React from "react";
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
} from "@/shared/components/Combobox/Combobox";
import { useI18n } from "@/core/runtime/i18n";
import { cn } from "@/shared/utils/utils";

interface SearchComboboxOption {
  value: string;
  label: string;
  badge?: string;
}

interface SearchComboboxProps {
  value: string;
  options: SearchComboboxOption[];
  searchPlaceholder?: string;
  displayLabel?: string;
  onChange: (value: string) => void;
  className?: string;
}

interface ItemGroup {
  /** Used as the React key and as the group header label */
  value: string;
  label: string;
  items: SearchComboboxOption[];
}

export function SearchCombobox({
  value,
  options,
  searchPlaceholder,
  displayLabel,
  onChange,
  className,
}: Readonly<SearchComboboxProps>) {
  const { t } = useI18n();
  const resolvedSearchPlaceholder = searchPlaceholder ?? t("common.search");
  // -------------------------------------------------------------------------
  // Determine whether to render a grouped or flat list.
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Debounced external filtering.
  // We pass filteredItems to Base UI so it bypasses its own filter engine and
  // uses our pre-filtered arrays instead. filter={null} disables internal filtering.
  // -------------------------------------------------------------------------
  const [query, setQuery] = React.useState("");
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const filteredGroups: ItemGroup[] = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (item) => item.label.toLowerCase().includes(q) || item.value.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query]);

  const filteredFlat: SearchComboboxOption[] = React.useMemo(() => {
    if (hasAnyBadge) return [];
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (item) => item.label.toLowerCase().includes(q) || item.value.toLowerCase().includes(q),
    );
  }, [options, hasAnyBadge, query]);

  function handleInputValueChange(nextValue: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(nextValue);
    }, 200);
  }

  // -------------------------------------------------------------------------
  // Fast lookup: value -> display label for itemToStringLabel callback.
  // -------------------------------------------------------------------------
  const labelMap = React.useMemo(
    () => new Map(options.map((opt) => [opt.value, opt.label])),
    [options],
  );

  return (
    <Combobox
      value={value}
      onValueChange={(v) => {
        if (typeof v === "string" && v) onChange(v);
      }}
      // Pass full item set so Base UI internals are aware of all items.
      items={hasAnyBadge ? groups : options}
      // Pass pre-filtered result so Base UI uses our filter instead of its own.
      filteredItems={hasAnyBadge ? filteredGroups : filteredFlat}
      // Disable internal filtering — we handle it via filteredItems above.
      filter={null}
      onInputValueChange={handleInputValueChange}
      itemToStringLabel={(v: string) => {
        if (displayLabel) return displayLabel;
        return labelMap.get(v) ?? v;
      }}
    >
      <ComboboxInput
        placeholder={resolvedSearchPlaceholder}
        showTrigger
        className={cn("min-w-72", className)}
      />
      <ComboboxContent sideOffset={6}>
        <ComboboxEmpty>{t("common.noResults")}</ComboboxEmpty>
        <ComboboxList>
          {hasAnyBadge
            ? filteredGroups.map((group, groupIdx) => (
                <ComboboxGroup key={group.value} items={group.items}>
                  {group.label ? <ComboboxLabel>{group.label}</ComboboxLabel> : null}
                  <ComboboxCollection>
                    {(item: SearchComboboxOption) => (
                      <ComboboxItem key={item.value} value={item.value}>
                        <span className="flex-1 truncate">{item.label}</span>
                      </ComboboxItem>
                    )}
                  </ComboboxCollection>
                  {groupIdx < filteredGroups.length - 1 ? <ComboboxSeparator /> : null}
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
