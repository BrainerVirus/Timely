import { m } from "motion/react";
import { SectionHeading } from "@/components/shared/section-heading";
import { StatPanel } from "@/components/shared/stat-panel";
import { Card } from "@/components/ui/card";
import { useFormatHours } from "@/hooks/use-format-hours";

import type { MonthSnapshot } from "@/types/dashboard";

interface MonthViewProps {
  month: MonthSnapshot;
}

export function MonthView({ month }: MonthViewProps) {
  const fh = useFormatHours();
  const items = [
    { title: "Logged", value: fh(month.loggedHours), note: "This month" },
    { title: "Target", value: fh(month.targetHours), note: "Planned load" },
    { title: "Clean days", value: String(month.cleanDays), note: `${month.overflowDays} overflow` },
  ];

  return (
    <div className="space-y-4">
      <Card className="space-y-3" data-onboarding="month-card">
        <SectionHeading title="Month" note="Balance and trajectory." />
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
      </Card>
    </div>
  );
}
