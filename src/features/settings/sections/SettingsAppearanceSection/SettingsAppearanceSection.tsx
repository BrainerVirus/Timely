import Check from "lucide-react/dist/esm/icons/check.js";
import Laptop from "lucide-react/dist/esm/icons/laptop.js";
import Moon from "lucide-react/dist/esm/icons/moon.js";
import Palette from "lucide-react/dist/esm/icons/palette.js";
import Sun from "lucide-react/dist/esm/icons/sun.js";
import { m } from "motion/react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import {
  ISSUE_CODE_THEME_OPTIONS,
  getIssueCodeThemeLabel,
} from "@/features/issues/lib/issue-code-theme";
import { staggerItem } from "@/shared/lib/animations/animations";
import { getChoiceButtonClassName } from "@/shared/lib/control-styles/control-styles";
import { cn } from "@/shared/lib/utils";
import { AccordionItem } from "@/shared/ui/Accordion/Accordion";
import { Label } from "@/shared/ui/Label/Label";

import type { Theme } from "@/app/providers/use-theme/use-theme";
import type { IssueCodeTheme } from "@/shared/types/dashboard";

const THEME_OPTIONS: Array<{ value: Theme; icon: typeof Sun }> = [
  { value: "system", icon: Laptop },
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
];

export interface SettingsAppearanceSectionProps {
  themeSummary: string;
  theme: Theme;
  onChangeTheme: (theme: Theme) => void;
  issueCodeTheme: IssueCodeTheme;
  onChangeIssueCodeTheme: (theme: IssueCodeTheme) => void;
}

export function SettingsAppearanceSection({
  themeSummary,
  theme,
  onChangeTheme,
  issueCodeTheme,
  onChangeIssueCodeTheme,
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

          <div className="space-y-2">
            <Label>{t("settings.issueCodeTheme")}</Label>
            <p className="text-sm text-muted-foreground">{t("settings.issueCodeThemeHint")}</p>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {ISSUE_CODE_THEME_OPTIONS.map((option) => {
                const active = issueCodeTheme === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onChangeIssueCodeTheme(option.value)}
                    className={cn(
                      "space-y-3 rounded-2xl border-2 p-3 text-left transition",
                      active
                        ? "border-primary bg-primary/8 shadow-clay"
                        : "border-border-subtle bg-field/65 shadow-clay-inset hover:border-border-strong hover:bg-field/80",
                    )}
                  >
                    <div
                      className={cn(
                        "overflow-hidden rounded-xl border border-white/10",
                        option.previewClassName,
                      )}
                    >
                      <div className="grid grid-cols-[2rem_1fr] text-[0.72rem] leading-5 opacity-90">
                        <span className="border-r border-current/10 px-2 py-2 text-current/60">
                          1
                          <br />
                          2
                          <br />3
                        </span>
                        <span className="px-3 py-2 font-mono">
                          const issue = "timely"
                          <br />
                          /spend 1h
                          <br />
                          status: done
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-foreground">
                        {getIssueCodeThemeLabel(option.value)}
                      </span>
                      {active ? <Check className="h-4 w-4 text-primary" /> : null}
                    </div>
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
