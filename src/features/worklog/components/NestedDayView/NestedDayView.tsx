import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.js";
import { m } from "motion/react";
import { useI18n } from "@/core/services/I18nService/i18n";
import { useMotionSettings } from "@/core/services/MotionService/motion";
import { DaySummaryPanel } from "@/features/worklog/components/DaySummaryPanel/DaySummaryPanel";
import { Button } from "@/shared/components/Button/Button";
import { StaggerGroup } from "@/shared/components/PageTransition/PageTransition";
import { staggerItem } from "@/shared/utils/animations";

import type { AuditFlag, DayOverview } from "@/shared/types/dashboard";

interface NestedDayViewProps {
  parentMode: "week" | "period";
  onBack: () => void;
  selectedDay: DayOverview;
  auditFlags: AuditFlag[];
}

export function NestedDayView({
  parentMode,
  onBack,
  selectedDay,
  auditFlags,
}: Readonly<NestedDayViewProps>) {
  const { t } = useI18n();
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();

  return (
    <StaggerGroup
      className="space-y-6"
      allowDecorativeAnimation={allowDecorativeAnimation}
      windowVisibility={windowVisibility}
    >
      <m.div variants={staggerItem}>
        <Button type="button" variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ChevronLeft className="h-4 w-4" />
          {t("worklog.backTo", {
            parent: parentMode === "period" ? t("common.period") : t("common.week"),
          })}
        </Button>
      </m.div>
      <m.div variants={staggerItem}>
        <DaySummaryPanel selectedDay={selectedDay} auditFlags={auditFlags} />
      </m.div>
    </StaggerGroup>
  );
}
