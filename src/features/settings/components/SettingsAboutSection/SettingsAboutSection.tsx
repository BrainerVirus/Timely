import Info from "lucide-react/dist/esm/icons/info.js";
import MessageCircleMore from "lucide-react/dist/esm/icons/message-circle-more.js";
import { m } from "motion/react";
import { useI18n } from "@/core/services/I18nService/i18n";
import { useMotionSettings } from "@/core/services/MotionService/motion";
import { AccordionItem } from "@/shared/components/Accordion/Accordion";
import { Button } from "@/shared/components/Button/Button";
import { staggerItem } from "@/shared/utils/animations";

export interface SettingsAboutSectionProps {
  appVersion: string;
  onOpenAbout: () => void;
}

export function SettingsAboutSection({
  appVersion,
  onOpenAbout,
}: Readonly<SettingsAboutSectionProps>) {
  const { t } = useI18n();
  const { allowDecorativeAnimation } = useMotionSettings();

  return (
    <m.div variants={staggerItem}>
      <AccordionItem
        title={t("settings.aboutSectionTitle")}
        icon={Info}
        summary={`v${appVersion}`}
        allowDecorativeAnimation={allowDecorativeAnimation}
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("settings.aboutSectionDescription")}</p>
          <Button variant="ghost" onClick={onOpenAbout}>
            <MessageCircleMore className="mr-1.5 h-3.5 w-3.5" />
            {t("settings.viewAppDetails")}
          </Button>
        </div>
      </AccordionItem>
    </m.div>
  );
}
