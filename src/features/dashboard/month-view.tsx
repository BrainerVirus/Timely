import { motion } from "motion/react";
import { SectionHeading } from "@/components/shared/section-heading";
import { StatPanel } from "@/components/shared/stat-panel";
import { Card } from "@/components/ui/card";
import { cardContainerVariants } from "@/lib/animations";
import { formatHours } from "@/lib/utils";

import type { MonthSnapshot } from "@/types/dashboard";

interface MonthViewProps {
  month: MonthSnapshot;
}

export function MonthView({ month }: MonthViewProps) {
  return (
    <motion.div
      variants={cardContainerVariants}
      initial="initial"
      animate="animate"
      className="space-y-4"
    >
      <Card className="space-y-3">
        <SectionHeading title="Month" note="Balance and trajectory." />
        <motion.div
          variants={cardContainerVariants}
          initial="initial"
          animate="animate"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <StatPanel title="Logged" value={formatHours(month.loggedHours)} note="This month" />
          <StatPanel title="Target" value={formatHours(month.targetHours)} note="Planned load" />
          <StatPanel
            title="Clean days"
            value={String(month.cleanDays)}
            note={`${month.overflowDays} overflow`}
          />
        </motion.div>
      </Card>
    </motion.div>
  );
}
