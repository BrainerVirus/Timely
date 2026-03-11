import ChevronsUpDown from "lucide-react/dist/esm/icons/chevrons-up-down.js";
import Search from "lucide-react/dist/esm/icons/search.js";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface SearchComboboxOption {
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

export function SearchCombobox({
  value,
  options,
  searchPlaceholder = "Search...",
  displayLabel,
  onChange,
  className,
}: SearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? options.filter((opt) => opt.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const selectedLabel = displayLabel ?? options.find((opt) => opt.value === value)?.label ?? value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-10 min-w-56 items-center justify-between gap-3 rounded-xl border-2 border-border bg-muted px-3 py-2 text-left text-sm text-foreground shadow-[var(--shadow-clay-inset)] transition outline-none focus:border-ring focus:ring-2 focus:ring-ring/20",
            className,
          )}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        style={{ width: "var(--radix-popover-trigger-width)" }}
        className="max-w-[calc(100vw-3rem)] overflow-hidden border-border bg-card p-0 text-card-foreground shadow-[var(--shadow-clay)]"
      >
        <div className="border-b border-border/70 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9"
            />
          </div>
        </div>
        <ScrollArea className="h-72">
          <div className="grid gap-1 bg-card p-2">
            {filtered.map((opt) => {
              const active = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-all",
                    active
                      ? "bg-primary/12 text-foreground shadow-[var(--shadow-clay-inset)]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.badge ? (
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      {opt.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
