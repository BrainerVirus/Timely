import { m } from "motion/react";
import { SectionHeading } from "@/components/shared/section-heading";
import { StatPanel } from "@/components/shared/stat-panel";
import { useFormatHours } from "@/hooks/use-format-hours";
import { useI18n } from "@/lib/i18n";

import type { MonthSnapshot } from "@/types/dashboard";

interface RangeSummarySectionProps {
  summary: MonthSnapshot;
  title: string;
  note: string;
}

export function RangeSummarySection({ summary, title, note }: RangeSummarySectionProps) {
  const fh = useFormatHours();
  const { t } = useI18n();
  const items = [
    {
      title: t("dashboard.loggedTime"),
      value: fh(summary.loggedHours),
      note: t("dashboard.loggedAcrossRange"),
    },
    {
      title: t("dashboard.targetTime"),
      value: fh(summary.targetHours),
      note: t("dashboard.expectedLoad"),
    },
    {
      title: t("dashboard.cleanDays"),
      value: String(summary.cleanDays),
      note: t("dashboard.overflowCount", { count: summary.overflowDays }),
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHeading title={title} note={note} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <m.div
            key={item.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.15, delay: index * 0.06 }}
          >
            <StatPanel title={item.title} value={item.value} note={item.note} />
          </m.div>
        ))}
      </div>
    </div>
  );
}
