import Globe from "lucide-react/dist/esm/icons/globe.js";
import LocateFixed from "lucide-react/dist/esm/icons/locate-fixed.js";
import { Button } from "@/shared/ui/Button/Button";
import { Label } from "@/shared/ui/Label/Label";
import { SearchCombobox } from "@/shared/ui/SearchCombobox/SearchCombobox";

import type { AppPreferences, HolidayCountryOption } from "@/shared/types/dashboard";
import type { useI18n } from "@/app/providers/I18nService/i18n";

type Translate = ReturnType<typeof useI18n>["t"];

interface HolidayCountryControlsProps {
  countries: HolidayCountryOption[];
  detectedCountryCode: string | undefined;
  onChangeCountry: (value: string) => void;
  onUseDetectedCountry: () => void;
  preferences: AppPreferences;
  resolvedCountryCode: string | undefined;
  resolvedCountryLabel: string;
  t: Translate;
}

export function HolidayCountryControls({
  countries,
  detectedCountryCode,
  onChangeCountry,
  onUseDetectedCountry,
  preferences,
  resolvedCountryCode,
  resolvedCountryLabel,
  t,
}: Readonly<HolidayCountryControlsProps>) {
  const countryOptions = countries.map((country) => ({
    value: country.code,
    label: country.label,
  }));

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5">
        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
        {t("settings.holidaySource")}
      </Label>
      <div className="flex flex-wrap items-stretch gap-3">
        <SearchCombobox
          value={resolvedCountryCode ?? ""}
          displayLabel={resolvedCountryLabel}
          options={countryOptions}
          searchPlaceholder={t("common.searchCountry")}
          noResultsLabel={t("common.noResults")}
          onChange={onChangeCountry}
          className="max-w-[24rem] min-w-48"
        />
        <Button
          type="button"
          variant={preferences.holidayCountryMode === "auto" ? "soft" : "ghost"}
          size="default"
          onClick={onUseDetectedCountry}
          disabled={
            !detectedCountryCode ||
            (preferences.holidayCountryMode === "auto" &&
              preferences.holidayCountryCode === detectedCountryCode)
          }
          className="h-10 gap-1.5 self-stretch"
        >
          <LocateFixed className="h-3.5 w-3.5" />
          {preferences.holidayCountryMode === "auto"
            ? t("settings.detected")
            : t("settings.useDetected")}
        </Button>
      </div>
    </div>
  );
}
