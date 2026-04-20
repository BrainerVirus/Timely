import type { IssueCodeTheme } from "@/shared/types/dashboard";

export const DEFAULT_ISSUE_CODE_THEME: IssueCodeTheme = "timely-night";

export const ISSUE_CODE_THEME_OPTIONS: Array<{
  value: IssueCodeTheme;
  label: string;
  previewClassName: string;
}> = [
  {
    value: "timely-night",
    label: "Timely Night",
    previewClassName: "bg-[#13202d] text-[#f7e6dc]",
  },
  {
    value: "dark-pro",
    label: "Dark Pro",
    previewClassName: "bg-[#1c222b] text-[#d9e6f2]",
  },
  {
    value: "dracula",
    label: "Dracula",
    previewClassName: "bg-[#282a36] text-[#f8f8f2]",
  },
  {
    value: "solarized-dark",
    label: "Solarized Dark",
    previewClassName: "bg-[#002b36] text-[#93a1a1]",
  },
  {
    value: "solarized-light",
    label: "Solarized Light",
    previewClassName: "bg-[#fdf6e3] text-[#586e75]",
  },
];

export function normalizeIssueCodeTheme(value?: string | null): IssueCodeTheme {
  if (ISSUE_CODE_THEME_OPTIONS.some((option) => option.value === value)) {
    return value as IssueCodeTheme;
  }

  return DEFAULT_ISSUE_CODE_THEME;
}

export function getIssueCodeThemeLabel(value: IssueCodeTheme): string {
  return ISSUE_CODE_THEME_OPTIONS.find((option) => option.value === value)?.label ?? "Timely Night";
}
