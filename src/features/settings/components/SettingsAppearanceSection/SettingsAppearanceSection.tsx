import Laptop from "lucide-react/dist/esm/icons/laptop.js";
import Moon from "lucide-react/dist/esm/icons/moon.js";
import Palette from "lucide-react/dist/esm/icons/palette.js";
import Sun from "lucide-react/dist/esm/icons/sun.js";
import { m } from "motion/react";
import { useI18n } from "@/core/services/I18nService/i18n";
import { AccordionItem } from "@/shared/components/Accordion/Accordion";
import { Label } from "@/shared/components/Label/Label";
import { staggerItem } from "@/shared/utils/animations";
import { getChoiceButtonClassName } from "@/shared/utils/control-styles";

import type { Theme } from "@/core/hooks/use-theme/use-theme";

const THEME_OPTIONS: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: "system", label: "System", icon: Laptop },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export interface SettingsAppearanceSectionProps {
  themeSummary: string;
  theme: Theme;
  onChangeTheme: (theme: Theme) => void;
}

export function SettingsAppearanceSection({
  themeSummary,
  theme,
  onChangeTheme,
}: Readonly<SettingsAppearanceSectionProps>) {
  const { t } = useI18n();

  function getThemeLabel(themeValue: Theme): string {
    if (themeValue === "system") {
      return t("settings.system");
    }
    if (themeValue === "light") {
      return t("settings.light");
    }
    return t("settings.dark");
  }

  return (
    <m.div variants={staggerItem}>
      <AccordionItem title={t("settings.appearance")} icon={Palette} summary={themeSummary}>
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label>{t("settings.theme")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = theme === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onChangeTheme(option.value)}
                    className={getChoiceButtonClassName(active, "gap-2")}
                  >
                    <Icon className="h-4 w-4" />
                    {getThemeLabel(option.value)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </AccordionItem>
    </m.div>
  );
}
