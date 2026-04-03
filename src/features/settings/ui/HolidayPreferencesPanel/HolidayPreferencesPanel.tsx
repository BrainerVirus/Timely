import * as React from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { HolidayCountryControls } from "@/features/settings/ui/HolidayPreferencesPanel/internal/HolidayCountryControls/HolidayCountryControls";
import { HolidayListPanel } from "@/features/settings/ui/HolidayPreferencesPanel/internal/HolidayListPanel/HolidayListPanel";
import { useHolidayPanelState } from "@/features/settings/ui/HolidayPreferencesPanel/internal/use-holiday-panel-state";
import { Calendar } from "@/shared/ui/Calendar/Calendar";
import { getCountryCodeForTimezone, resolveHolidayCountryCode } from "@/shared/lib/utils";

import type { AppPreferences, HolidayCountryOption } from "@/shared/types/dashboard";

interface HolidayPreferencesPanelProps {
  timezone: string;
  weekStartsOn?: 0 | 1 | 5 | 6;
  preferences: AppPreferences;
  countries: HolidayCountryOption[];
  onSavePreferences: (next: AppPreferences) => Promise<void>;
}

export function HolidayPreferencesPanel({
  timezone,
  weekStartsOn = 0,
  preferences,
  countries,
  onSavePreferences,
}: Readonly<HolidayPreferencesPanelProps>) {
  const { formatMonthDayWeekday, t, locale } = useI18n();
  const detectedCountryCode = getCountryCodeForTimezone(timezone);
  const resolvedCountryCode = resolveHolidayCountryCode(
    preferences.holidayCountryMode,
    preferences.holidayCountryCode,
    timezone,
  );
  const resolvedCountryLabel =
    countries.find((country) => country.code === resolvedCountryCode)?.label ??
    resolvedCountryCode ??
    t("settings.noCountry");
  const holidayPanel = useHolidayPanelState(resolvedCountryCode, t);

  async function handleCountryChange(value: string) {
    await onSavePreferences({
      ...preferences,
      holidayCountryMode: "manual",
      holidayCountryCode: value,
    });
  }

  async function handleUseDetectedCountry() {
    if (!detectedCountryCode) {
      return;
    }

    await onSavePreferences({
      ...preferences,
      holidayCountryMode: "auto",
      holidayCountryCode: detectedCountryCode,
    });
  }

  return (
    <div className="space-y-4">
      <HolidayCountryControls
        countries={countries}
        detectedCountryCode={detectedCountryCode}
        onChangeCountry={(value) => void handleCountryChange(value)}
        onUseDetectedCountry={() => void handleUseDetectedCountry()}
        preferences={preferences}
        resolvedCountryCode={resolvedCountryCode}
        resolvedCountryLabel={resolvedCountryLabel}
        t={t}
      />

      <div className="grid items-stretch gap-4 @xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Calendar
          mode="single"
          month={holidayPanel.state.visibleMonth}
          selected={holidayPanel.state.selectedDate}
          locale={locale}
          labels={{
            labelNav: () => t("common.calendar"),
            labelNext: () => t("common.next"),
            labelPrevious: () => t("common.previous"),
          }}
          onSelect={holidayPanel.setSelectedDate}
          onMonthChange={holidayPanel.handleMonthChange}
          weekStartsOn={weekStartsOn}
          className="w-full"
          holidays={holidayPanel.calendarHolidays}
        />

        <HolidayListPanel
          currentHolidays={holidayPanel.currentHolidays}
          currentYear={holidayPanel.currentYear}
          formatMonthDayWeekday={formatMonthDayWeekday}
          isLoadingCurrentYear={holidayPanel.isLoadingCurrentYear}
          onFocusHoliday={holidayPanel.focusHoliday}
          onYearChange={holidayPanel.handleYearChange}
          selectedDateKey={holidayPanel.selectedDateKey}
          selectedYear={holidayPanel.state.selectedYear}
          t={t}
        />
      </div>
    </div>
  );
}
