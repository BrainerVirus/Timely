import { m } from "motion/react";
import { SectionHeading } from "@/components/shared/section-heading";
import { StatPanel } from "@/components/shared/stat-panel";
import { WeekView } from "@/features/dashboard/week-view";
import { useFormatHours } from "@/hooks/use-format-hours";
import { useI18n } from "@/lib/i18n";

import type { DayOverview, MonthSnapshot } from "@/types/dashboard";

interface MonthViewProps {
  month: MonthSnapshot;
  days: DayOverview[];
  title?: string;
  note: string;
  rangeStartDate: string;
  onSelectDay?: (day: DayOverview, date: Date) => void;
}

export function MonthView({
  month,
  days,
  title,
  note,
  rangeStartDate,
  onSelectDay,
}: MonthViewProps) {
  const fh = useFormatHours();
  const { t } = useI18n();
  const resolvedTitle = title ?? t("worklog.periodSummary");
  const items = [
    {
      title: t("worklog.logged"),
      value: fh(month.loggedHours),
      note: t("dashboard.loggedAcrossRange"),
    },
    {
      title: t("worklog.target"),
      value: fh(month.targetHours),
      note: t("dashboard.expectedLoad"),
    },
    {
      title: t("dashboard.cleanDays"),
      value: String(month.cleanDays),
      note: t("dashboard.overflowCount", { count: month.overflowDays }),
    },
  ];

  return (
    <div className="space-y-6" data-onboarding="month-card">
      <div className="space-y-4">
        <SectionHeading title={resolvedTitle} note={note} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <m.div
              key={item.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.15, delay: i * 0.06 }}
            >
              <StatPanel title={item.title} value={item.value} note={item.note} />
            </m.div>
          ))}
        </div>
      </div>
      <WeekView
        week={days}
        title={t("dashboard.dailyBreakdown")}
        note={t("dashboard.pickDayToOpen")}
        startDate={rangeStartDate}
        viewMode="period"
        onSelectDay={onSelectDay}
      />
    </div>
  );
}
