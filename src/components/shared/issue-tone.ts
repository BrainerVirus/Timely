const ISSUE_TONE_BORDER_CLASS: Record<string, string> = {
  emerald: "border-l-success/50",
  amber: "border-l-secondary/50",
  cyan: "border-l-primary/50",
  rose: "border-l-destructive/50",
  violet: "border-l-primary/50",
};

export function getIssueToneBorderClass(tone: string): string {
  return ISSUE_TONE_BORDER_CLASS[tone] ?? "border-l-primary/50";
}
