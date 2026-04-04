import Database from "lucide-react/dist/esm/icons/database.js";
import { m } from "motion/react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { staggerItem } from "@/shared/lib/animations/animations";
import { AccordionItem } from "@/shared/ui/Accordion/Accordion";
import { Button } from "@/shared/ui/Button/Button";

export interface SettingsDataManagementSectionProps {
  onResetAllData: () => void;
}

export function SettingsDataManagementSection({
  onResetAllData,
}: Readonly<SettingsDataManagementSectionProps>) {
  const { t } = useI18n();
  const { allowDecorativeAnimation } = useMotionSettings();

  return (
    <m.div variants={staggerItem}>
      <AccordionItem
        title={t("settings.dataManagement")}
        icon={Database}
        variant="destructive"
        allowDecorativeAnimation={allowDecorativeAnimation}
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("settings.resetDataDescription")}</p>
          <Button variant="destructive" onClick={onResetAllData}>
            {t("settings.resetAllData")}
          </Button>
        </div>
      </AccordionItem>
    </m.div>
  );
}
