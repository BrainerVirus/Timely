import CheckCircle2 from "lucide-react/dist/esm/icons/circle-check.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/Button/Button";

import type { SchedulePhase } from "@/domains/schedule/state/schedule-form/schedule-form";

export function ScheduleSaveButton({
  phase,
  onClick,
}: Readonly<{
  phase: SchedulePhase;
  onClick: () => void;
}>) {
  const { t } = useI18n();
  const saveButtonConfig: Record<
    SchedulePhase,
    { icon: typeof Loader2 | typeof CheckCircle2 | null; label: string }
  > = {
    saving: {
      icon: Loader2,
      label: t("settings.savingSchedule"),
    },
    saved: {
      icon: CheckCircle2,
      label: t("settings.scheduleSaved"),
    },
    idle: {
      icon: null,
      label: t("settings.saveSchedule"),
    },
  };
  const { icon: Icon, label } = saveButtonConfig[phase];
  return (
    <Button onClick={onClick} disabled={phase === "saving"}>
      {Icon && <Icon className={cn("mr-1.5 h-3.5 w-3.5", phase === "saving" && "animate-spin")} />}
      {label}
    </Button>
  );
}
