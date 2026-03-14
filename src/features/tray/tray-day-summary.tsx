import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import Target from "lucide-react/dist/esm/icons/target.js";
import Timer from "lucide-react/dist/esm/icons/timer.js";
import { useMemo } from "react";
import { getIssueToneBorderClass } from "@/components/shared/issue-tone";
import { useFormatHours } from "@/hooks/use-format-hours";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { DayOverview, IssueBreakdown } from "@/types/dashboard";

export function TrayDaySummary({ selectedDay }: { selectedDay: DayOverview }) {
  const summaryItems = useTrayDaySummaryItems(selectedDay);
  const focusIssue = selectedDay.topIssues[0];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {summaryItems.map((item) => (
          <div
            key={item.title}
            className="rounded-[1.35rem] border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] px-2.5 py-2 shadow-[var(--shadow-clay)]"
          >
            <div className="flex items-center gap-1.5 text-[0.62rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              <TrayMetricIcon icon={item.icon} />
              <span>{item.title}</span>
            </div>
            <p className="mt-1.5 font-display text-xl leading-none font-semibold text-foreground">
              {item.value}
            </p>
            <p className="mt-1 truncate text-[0.68rem] text-muted-foreground">{item.note}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-2">
        <TrayIssuesList issues={selectedDay.topIssues} />
        <TrayFocusCard issue={focusIssue} focusHours={selectedDay.focusHours} />
      </div>
    </div>
  );
}

function TrayIssuesList({ issues }: { issues: IssueBreakdown[] }) {
  const { t } = useI18n();

  if (issues.length === 0) {
    return (
      <div className="rounded-[1.5rem] border-2 border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel)]/80 px-4 py-4 text-sm text-muted-foreground shadow-[var(--shadow-clay-inset)]">
        <p className="font-semibold text-foreground">{t("home.noIssuesToday")}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t("worklog.pickDifferentDate")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {issues.slice(0, 2).map((issue) => (
        <div key={`${issue.key}-${issue.title}`}>
          <TrayIssueCard issue={issue} />
        </div>
      ))}
    </div>
  );
}

function TrayIssueCard({ issue }: { issue: IssueBreakdown }) {
  const fh = useFormatHours();

  return (
    <div
      className={cn(
        "rounded-[1.35rem] border-2 border-l-4 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel-elevated)] px-3 py-2.5 shadow-[var(--shadow-clay)]",
        getIssueToneBorderClass(issue.tone),
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm leading-snug font-medium text-foreground">
            {issue.title}
          </p>
          <p className="mt-0.5 truncate font-mono text-[0.68rem] text-muted-foreground">
            {issue.key}
          </p>
        </div>
        <span className="shrink-0 rounded-xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-field)] px-2 py-1 text-xs font-semibold text-foreground tabular-nums shadow-[var(--shadow-clay-inset)]">
          {fh(issue.hours)}
        </span>
      </div>
    </div>
  );
}

function TrayFocusCard({
  issue,
  focusHours,
}: {
  issue: IssueBreakdown | undefined;
  focusHours: number;
}) {
  const fh = useFormatHours();
  const { t } = useI18n();

  return (
    <div className="rounded-[1.5rem] border-2 border-primary/20 bg-primary/8 px-3.5 py-3 shadow-[var(--shadow-clay)]">
      <p className="text-[0.62rem] font-semibold tracking-[0.18em] text-primary uppercase">
        {t("home.todayFocus")}
      </p>
      <p className="mt-1 font-display text-lg font-semibold text-foreground">
        {issue?.key ?? t("home.cleanSlate")}
      </p>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {issue?.title ?? t("home.noIssuesTodayDescription")}
      </p>
      <div className="mt-3 inline-flex rounded-full border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel)]/90 px-2.5 py-1 text-[0.7rem] font-semibold text-foreground shadow-[var(--shadow-clay)]">
        {fh(focusHours)} {t("home.petMetricFocus").toLowerCase()}
      </div>
    </div>
  );
}

function useTrayDaySummaryItems(selectedDay: DayOverview) {
  const fh = useFormatHours();
  const { t } = useI18n();
  const delta = selectedDay.loggedHours - selectedDay.targetHours;

  return useMemo(
    () => [
      {
        title: t("worklog.logged"),
        value: fh(selectedDay.loggedHours),
        note: t("tray.logged", { hours: fh(selectedDay.loggedHours) }),
        icon: "timer" as const,
      },
      {
        title: t("worklog.target"),
        value: fh(selectedDay.targetHours),
        note: t("week.target", { hours: fh(selectedDay.targetHours) }),
        icon: "target" as const,
      },
      {
        title: t("worklog.delta"),
        value: formatSignedHours(fh, delta),
        note:
          delta >= 0 ? t("worklog.deltaPositive") : t("tray.left", { hours: fh(Math.abs(delta)) }),
        icon: "sparkles" as const,
      },
    ],
    [delta, fh, selectedDay.loggedHours, selectedDay.targetHours, t],
  );
}

function TrayMetricIcon({ icon }: { icon: "timer" | "target" | "sparkles" }) {
  if (icon === "target") {
    return <Target className="h-3.5 w-3.5" />;
  }
  if (icon === "sparkles") {
    return <Sparkles className="h-3.5 w-3.5" />;
  }
  return <Timer className="h-3.5 w-3.5" />;
}

function formatSignedHours(formatHours: (value: number) => string, value: number) {
  if (value > 0) return `+${formatHours(value)}`;
  if (value < 0) return `-${formatHours(Math.abs(value))}`;
  return formatHours(0);
}
