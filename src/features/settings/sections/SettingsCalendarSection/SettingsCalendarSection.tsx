import CalendarDays from "lucide-react/dist/esm/icons/calendar-days.js";
import { m } from "motion/react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { HolidayPreferencesPanel } from "@/features/settings/ui/HolidayPreferencesPanel/HolidayPreferencesPanel";
import { AccordionItem } from "@/shared/ui/Accordion/Accordion";
import { staggerItem } from "@/shared/lib/animations/animations";
import { normalizeHolidayCountryMode } from "@/shared/lib/utils";

import type { AppPreferences, HolidayCountryOption } from "@/shared/types/dashboard";

export interface SettingsCalendarSectionProps {
  holidaySummary: string;
  timezone: string;
  calendarWeekStartsOn: 0 | 1 | 5 | 6;
  preferences: AppPreferences;
  resolvedHolidayCountryCode: string | undefined;
  countries: HolidayCountryOption[];
  onSavePreferences: (nextPreferences: AppPreferences) => Promise<void>;
}

export function SettingsCalendarSection({
  holidaySummary,
  timezone,
  calendarWeekStartsOn,
  preferences,
  resolvedHolidayCountryCode,
  countries,
  onSavePreferences,
}: Readonly<SettingsCalendarSectionProps>) {
  const { t } = useI18n();
  const { allowDecorativeAnimation } = useMotionSettings();

  return (
    <m.div variants={staggerItem}>
      <AccordionItem
        title={t("settings.calendarAndHolidays")}
        icon={CalendarDays}
        summary={holidaySummary}
        allowDecorativeAnimation={allowDecorativeAnimation}
      >
        <HolidayPreferencesPanel
          timezone={timezone}
          weekStartsOn={calendarWeekStartsOn}
          preferences={{
            ...preferences,
            holidayCountryMode: normalizeHolidayCountryMode(preferences.holidayCountryMode),
            holidayCountryCode: resolvedHolidayCountryCode,
          }}
          countries={countries}
          onSavePreferences={onSavePreferences}
        />
      </AccordionItem>
    </m.div>
  );
}
