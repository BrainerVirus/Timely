import { m } from "motion/react";
import { SectionHeading } from "@/components/shared/section-heading";
import { StatPanel } from "@/components/shared/stat-panel";
import { useFormatHours } from "@/hooks/use-format-hours";
import { springGentle } from "@/lib/animations";
import { useI18n } from "@/lib/i18n";
import { useMotionSettings } from "@/lib/motion";

import type { MonthSnapshot } from "@/types/dashboard";

interface RangeSummarySectionProps {
  summary: MonthSnapshot;
  title: string;
  note: string;
  dataKey?: string;
}

export function RangeSummarySection({ summary, title, note, dataKey }: RangeSummarySectionProps) {
  const fh = useFormatHours();
  const { t } = useI18n();
  const { allowDecorativeAnimation } = useMotionSettings();
  const animationKey =
    dataKey ?? `${summary.loggedHours}-${summary.targetHours}-${summary.cleanDays}`;
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
