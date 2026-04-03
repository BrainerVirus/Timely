import { m } from "motion/react";
import { useFormatHours } from "@/app/hooks/use-format-hours/use-format-hours";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { Badge } from "@/shared/ui/Badge/Badge";
import { cn } from "@/shared/lib/utils";

import type { DayOverview } from "@/shared/types/dashboard";
import type { Transition } from "motion/react";

interface WeekDayCardProps {
  day: DayOverview;
  date: Date;
  cardDateLabel: string;
  allowDecorativeAnimation: boolean;
  onSelectDay?: (day: DayOverview, date: Date) => void;
  transition: Transition;
}

export function WeekDayCard({
  day,
  date,
  cardDateLabel,
  allowDecorativeAnimation,
  onSelectDay,
  transition,
}: Readonly<WeekDayCardProps>) {
  const fh = useFormatHours();
  const { formatDayStatus, t } = useI18n();
  const isToday = day.isToday;
  const hasHoliday = Boolean(day.holidayName);
  const holidayTone = day.loggedHours > 0 ? "holiday-worked" : "holiday-empty";
  const cardClassName = cn(
    "flex h-full min-h-44 w-full flex-col rounded-2xl border-2 border-border-subtle bg-panel-elevated p-3 text-left transition-all",
    "shadow-card",
    isToday &&
      "border-primary/55 bg-[color-mix(in_oklab,var(--color-panel-elevated)_82%,var(--color-primary)_18%)] shadow-button-soft",
    hasHoliday &&
      (holidayTone === "holiday-empty"
        ? "border-warning/65 bg-[color-mix(in_oklab,var(--color-panel-elevated)_78%,var(--color-warning)_22%)] shadow-card"
        : "border-warning/65 bg-[color-mix(in_oklab,var(--color-panel)_72%,var(--color-warning)_28%)] shadow-card"),
    isToday && hasHoliday && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
    onSelectDay &&
      "cursor-pointer hover:border-primary/20 hover:bg-panel active:translate-y-px active:shadow-none",
  );

  const content = (
    <>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-base font-semibold text-foreground capitalize">
          {cardDateLabel}
        </span>
      </div>

      {isToday || hasHoliday ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {isToday ? (
            <Badge tone="planned" className="text-[0.62rem]">
              {t("common.today")}
            </Badge>
          ) : null}
          {hasHoliday ? (
            <Badge tone="holiday" className="max-w-full truncate text-[0.62rem]">
              {day.holidayName}
            </Badge>
          ) : null}
        </div>
      ) : null}

      <p className="mt-2 font-display text-2xl font-semibold text-foreground">{fh(day.loggedHours)}</p>
      <p className="mt-0.5 text-xs tracking-wide text-muted-foreground uppercase">
        {t("week.target", { hours: fh(day.targetHours) })}
      </p>

      <div className="mt-auto pt-3">
        <Badge tone={day.status} className="text-[0.65rem]">
          {formatDayStatus(day.status)}
        </Badge>
      </div>
    </>
  );

  return (
    <m.div
      data-grid-stagger-item="true"
      className="h-full"
      initial={allowDecorativeAnimation ? { opacity: 0, y: 8 } : { opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition}
    >
      {onSelectDay ? (
        <button type="button" onClick={() => onSelectDay(day, date)} className={cardClassName}>
          {content}
        </button>
      ) : (
        <div className={cardClassName}>{content}</div>
      )}
    </m.div>
  );
}
