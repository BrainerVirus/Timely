import Accessibility from "lucide-react/dist/esm/icons/accessibility.js";
import { m } from "motion/react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { staggerItem } from "@/shared/lib/animations/animations";
import { getChoiceButtonClassName } from "@/shared/lib/control-styles/control-styles";
import { AccordionItem } from "@/shared/ui/Accordion/Accordion";
import { Label } from "@/shared/ui/Label/Label";

import type { AppPreferences } from "@/shared/types/dashboard";

const LANGUAGE_OPTIONS = ["auto", "en", "es", "pt"] as const;

export interface SettingsAccessibilitySectionProps {
  accessibilitySummary: string;
  currentLanguage: AppPreferences["language"];
  formatLanguageLabel: (value: (typeof LANGUAGE_OPTIONS)[number]) => string;
  onChangeLanguage: (language: AppPreferences["language"]) => void;
}

export function SettingsAccessibilitySection({
  accessibilitySummary,
  currentLanguage,
  formatLanguageLabel,
  onChangeLanguage,
}: Readonly<SettingsAccessibilitySectionProps>) {
  const { t } = useI18n();
  const { allowDecorativeAnimation } = useMotionSettings();

  return (
    <m.div variants={staggerItem}>
      <AccordionItem
        title={t("settings.accessibility")}
        icon={Accessibility}
        summary={accessibilitySummary}
        allowDecorativeAnimation={allowDecorativeAnimation}
      >
        <div className="space-y-1.5">
          <Label>{t("common.language")}</Label>
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGE_OPTIONS.map((option) => {
              const active = currentLanguage === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChangeLanguage(option)}
                  className={getChoiceButtonClassName(active, "justify-start text-left")}
                >
                  <span className="text-sm font-bold">{formatLanguageLabel(option)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </AccordionItem>
    </m.div>
  );
}
