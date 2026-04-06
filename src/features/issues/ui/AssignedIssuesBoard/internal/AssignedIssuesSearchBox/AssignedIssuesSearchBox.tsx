import { useState } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/Input/Input";

import type { AssignedIssueSuggestion } from "@/shared/types/dashboard";

interface AssignedIssuesSearchBoxProps {
  value: string;
  suggestions: AssignedIssueSuggestion[];
  onValueChange: (value: string) => void;
}

export function AssignedIssuesSearchBox({
  value,
  suggestions,
  onValueChange,
}: Readonly<AssignedIssuesSearchBoxProps>) {
  const { t } = useI18n();
  const [focused, setFocused] = useState(false);
  const visibleSuggestions = focused && value.trim().length > 0 && suggestions.length > 0;

  return (
    <div className="relative flex min-w-0 flex-col gap-1.5 text-sm">
      <span className="font-medium text-foreground">{t("issues.searchLabel")}</span>
      <Input
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          window.setTimeout(() => setFocused(false), 120);
        }}
        placeholder={t("issues.searchPlaceholder")}
      />
      <div
        className={cn(
          "absolute inset-x-0 top-full z-20 mt-1 hidden rounded-2xl border-2 border-border-subtle bg-popover p-2 shadow-clay-popup",
          visibleSuggestions && "block",
        )}
      >
        <ul className="space-y-1">
          {suggestions.map((suggestion) => (
            <li key={suggestion.value}>
              <button
                type="button"
                className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-muted-foreground transition hover:bg-field-hover hover:text-foreground"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onValueChange(suggestion.value);
                  setFocused(false);
                }}
              >
                {suggestion.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
