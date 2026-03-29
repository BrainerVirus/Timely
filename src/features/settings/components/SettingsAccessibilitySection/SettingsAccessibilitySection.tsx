import Accessibility from "lucide-react/dist/esm/icons/accessibility.js";
import { m } from "motion/react";
import { useI18n } from "@/core/services/I18nService/i18n";
import { useMotionSettings } from "@/core/services/MotionService/motion";
import { AccordionItem } from "@/shared/components/Accordion/Accordion";
import { Label } from "@/shared/components/Label/Label";
import { staggerItem } from "@/shared/utils/animations";
import { getChoiceButtonClassName } from "@/shared/utils/control-styles";

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
