import { m } from "motion/react";
import { SectionHeading } from "@/components/shared/section-heading";
import { StatPanel } from "@/components/shared/stat-panel";
import { WeekView } from "@/features/dashboard/week-view";
import { useFormatHours } from "@/hooks/use-format-hours";

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
  title = "Period summary",
  note,
  rangeStartDate,
  onSelectDay,
}: MonthViewProps) {
  const fh = useFormatHours();
  const items = [
    { title: "Logged", value: fh(month.loggedHours), note: "Across selected range" },
    { title: "Target", value: fh(month.targetHours), note: "Expected load" },
    { title: "Clean days", value: String(month.cleanDays), note: `${month.overflowDays} overflow` },
  ];

  return (
    <div className="space-y-6" data-onboarding="month-card">
      <div className="space-y-4">
        <SectionHeading title={title} note={note} />
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
        title="Daily breakdown"
        note="Pick a day to open its full summary."
        startDate={rangeStartDate}
        viewMode="period"
        onSelectDay={onSelectDay}
      />
    </div>
  );
}
