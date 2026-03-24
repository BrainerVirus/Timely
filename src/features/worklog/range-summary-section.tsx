import { m } from "motion/react";
import { useMemo } from "react";
import { SectionHeading } from "@/shared/components/SectionHeading/SectionHeading";
import { StatPanel } from "@/shared/components/StatPanel/StatPanel";
import { useFormatHours } from "@/shared/hooks/use-format-hours/use-format-hours";
import { springGentle } from "@/shared/utils/animations";
import { useI18n } from "@/core/services/I18nService/i18n";
import { useMotionSettings } from "@/core/services/MotionService/motion";

import type { DayOverview, MonthSnapshot } from "@/shared/types/dashboard";

interface RangeSummarySectionProps {
  summary: MonthSnapshot;
  days: DayOverview[];
  title: string;
  note: string;
  rangeStartDate: string;
  rangeEndDate: string;
  comparisonDate: string;
  dataKey?: string;
}

export function RangeSummarySection({
  summary,
  days,
  title,
  note,
  rangeStartDate,
  rangeEndDate,
  comparisonDate,
  dataKey,
}: Readonly<RangeSummarySectionProps>) {
  const fh = useFormatHours();
  const { t } = useI18n();
  const { allowDecorativeAnimation } = useMotionSettings();
  const comparison = useMemo(
    () => buildRangeComparison(summary, days, rangeStartDate, rangeEndDate, comparisonDate),
    [comparisonDate, days, rangeEndDate, rangeStartDate, summary],
  );
  const animationKey =
    dataKey ??
    `${rangeStartDate}:${rangeEndDate}:${comparisonDate}:${comparison.loggedHours}:${comparison.expectedHours}:${comparison.missingHours}:${summary.targetHours}`;
  const items = [
    {
      title: t("dashboard.loggedTime"),
      value: fh(comparison.loggedHours),
      note: t("dashboard.loggedAcrossRange"),
    },
    {
      title: t("dashboard.expectedHours"),
      value: fh(comparison.expectedHours),
      note: comparison.isOpenRange
        ? t("dashboard.expectedThroughYesterday")
        : t("dashboard.expectedForRange"),
    },
    {
      title: t("dashboard.missingHours"),
      value: fh(comparison.missingHours),
      note: t("dashboard.missingHoursNote"),
    },
    {
      title: t("dashboard.targetTime"),
      value: fh(summary.targetHours),
      note: t("dashboard.expectedLoad"),
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHeading title={title} note={note} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item, index) =>
          allowDecorativeAnimation ? (
            <m.div
              key={`${animationKey}:${item.title}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springGentle, delay: 0.04 + index * 0.04 }}
            >
              <StatPanel title={item.title} value={item.value} note={item.note} />
            </m.div>
          ) : (
            <div key={`${animationKey}:${item.title}`}>
              <StatPanel title={item.title} value={item.value} note={item.note} />
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function buildRangeComparison(
  summary: MonthSnapshot,
  days: DayOverview[],
  rangeStartDate: string,
  rangeEndDate: string,
  comparisonDate: string,
) {
  const yesterdayDate = shiftDateInput(comparisonDate, -1);
  const isOpenRange = rangeStartDate <= comparisonDate && rangeEndDate >= comparisonDate;
  const comparisonEndDate = isOpenRange ? yesterdayDate : rangeEndDate;

  const loggedHours =
    days.length > 0
      ? sumHoursForRange(days, rangeStartDate, rangeEndDate, (day) => day.loggedHours)
      : summary.loggedHours;
  const expectedHours =
    days.length > 0
      ? sumHoursForRange(days, rangeStartDate, comparisonEndDate, (day) => day.targetHours)
      : summary.targetHours;

  return {
    loggedHours,
    expectedHours,
    missingHours: Math.max(expectedHours - loggedHours, 0),
    isOpenRange,
  };
}

function sumHoursForRange(
  days: DayOverview[],
  rangeStartDate: string,
  rangeEndDate: string,
  pick: (day: DayOverview) => number,
) {
  return days.reduce((total, day) => {
    if (day.date < rangeStartDate || day.date > rangeEndDate) {
      return total;
    }

    return total + pick(day);
  }, 0);
}

function shiftDateInput(dateInput: string, amount: number) {
  const date = parseDateInputValue(dateInput);
  date.setDate(date.getDate() + amount);
  return toDateInputValue(date);
}

function parseDateInputValue(value: string) {
  return new Date(`${value}T12:00:00`);
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
