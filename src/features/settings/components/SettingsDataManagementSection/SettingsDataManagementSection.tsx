import Database from "lucide-react/dist/esm/icons/database.js";
import { m } from "motion/react";
import { useI18n } from "@/core/services/I18nService/i18n";
import { AccordionItem } from "@/shared/components/Accordion/Accordion";
import { Button } from "@/shared/components/Button/Button";
import { staggerItem } from "@/shared/utils/animations";

export interface SettingsDataManagementSectionProps {
  onResetAllData: () => void;
}

export function SettingsDataManagementSection({
  onResetAllData,
}: Readonly<SettingsDataManagementSectionProps>) {
  const { t } = useI18n();

  return (
    <m.div variants={staggerItem}>
      <AccordionItem title={t("settings.dataManagement")} icon={Database} variant="destructive">
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
