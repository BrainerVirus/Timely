import Laptop from "lucide-react/dist/esm/icons/laptop.js";
import Moon from "lucide-react/dist/esm/icons/moon.js";
import Palette from "lucide-react/dist/esm/icons/palette.js";
import Sun from "lucide-react/dist/esm/icons/sun.js";
import { m } from "motion/react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { staggerItem } from "@/shared/lib/animations/animations";
import { getChoiceButtonClassName } from "@/shared/lib/control-styles/control-styles";
import { AccordionItem } from "@/shared/ui/Accordion/Accordion";
import { Label } from "@/shared/ui/Label/Label";

import type { Theme } from "@/app/providers/use-theme/use-theme";

const THEME_OPTIONS: Array<{ value: Theme; icon: typeof Sun }> = [
  { value: "system", icon: Laptop },
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
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
  const { allowDecorativeAnimation } = useMotionSettings();

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
      <AccordionItem
        title={t("settings.appearance")}
        icon={Palette}
        summary={themeSummary}
        allowDecorativeAnimation={allowDecorativeAnimation}
      >
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
