import Accessibility from "lucide-react/dist/esm/icons/accessibility.js";
import { m } from "motion/react";
import { useI18n } from "@/core/services/I18nService/i18n";
import { useMotionSettings } from "@/core/services/MotionService/motion";
import { getMotionPreferenceLabel } from "@/features/settings/utils/settings-summary-labels";
import { AccordionItem } from "@/shared/components/Accordion/Accordion";
import { Label } from "@/shared/components/Label/Label";
import { staggerItem } from "@/shared/utils/animations";
import { getChoiceButtonClassName } from "@/shared/utils/control-styles";

import type { AppPreferences, MotionPreference } from "@/shared/types/dashboard";

const MOTION_PREFERENCE_OPTIONS = [
  "system",
  "reduced",
  "full",
] as const satisfies readonly MotionPreference[];

const LANGUAGE_OPTIONS = ["auto", "en", "es", "pt"] as const;

export interface SettingsAccessibilitySectionProps {
  accessibilitySummary: string;
  currentLanguage: AppPreferences["language"];
  formatLanguageLabel: (value: (typeof LANGUAGE_OPTIONS)[number]) => string;
  motionPreference: MotionPreference;
  onChangeLanguage: (language: AppPreferences["language"]) => void;
  onChangeMotionPreference: (preference: MotionPreference) => void;
}

export function SettingsAccessibilitySection({
  accessibilitySummary,
  currentLanguage,
  formatLanguageLabel,
  motionPreference,
  onChangeLanguage,
  onChangeMotionPreference,
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
        <div className="space-y-5">
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

          <div className="space-y-1.5">
            <Label>{t("settings.motionPreference")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {MOTION_PREFERENCE_OPTIONS.map((option) => {
                const active = motionPreference === option;
                const label = getMotionPreferenceLabel(option, t);

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onChangeMotionPreference(option)}
                    className={getChoiceButtonClassName(active, "justify-start text-left")}
                  >
                    <span className="text-sm font-bold">{label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("settings.motionPreferenceDescription")}
            </p>
          </div>
        </div>
      </AccordionItem>
    </m.div>
  );
}
