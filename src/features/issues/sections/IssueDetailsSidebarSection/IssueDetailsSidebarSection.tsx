import { useMemo, useState } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { shiftDate } from "@/shared/lib/date/date";
import { cn, getWeekStartsOnIndex } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/Badge/Badge";
import { Button } from "@/shared/ui/Button/Button";
import { Input } from "@/shared/ui/Input/Input";
import { Label } from "@/shared/ui/Label/Label";
import { PagerControl } from "@/shared/ui/PagerControl/PagerControl";
import { ScrollArea } from "@/shared/ui/ScrollArea/ScrollArea";
import {
  type CalendarWeekStartsOn,
  SingleDayPicker,
} from "@/shared/ui/SingleDayPicker/SingleDayPicker";

import type { IssueDetailsSnapshot, ScheduleSnapshot } from "@/shared/types/dashboard";

interface IssueDetailsSidebarSectionProps {
  details: IssueDetailsSnapshot;
  schedule: ScheduleSnapshot;
  busy: boolean;
  selectedState: string;
  selectedLabels: string[];
  timeSpent: string;
  spentDate: Date;
  summary: string;
  metadataDirty: boolean;
  onStateChange: (value: string) => void;
  onToggleLabel: (value: string) => void;
  onSaveMetadata: () => Promise<void>;
  onTimeSpentChange: (value: string) => void;
  onSpentDateChange: (value: Date) => void;
  onSummaryChange: (value: string) => void;
  onSubmitTime: () => Promise<void>;
}

export function IssueDetailsSidebarSection({
  details,
  schedule,
  busy,
  selectedState,
  selectedLabels,
  timeSpent,
  spentDate,
  summary,
  metadataDirty,
  onStateChange,
  onToggleLabel,
  onSaveMetadata,
  onTimeSpentChange,
  onSpentDateChange,
  onSummaryChange,
  onSubmitTime,
}: Readonly<IssueDetailsSidebarSectionProps>) {
  const { t, formatDateShort } = useI18n();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => spentDate);
  const calendarWeekStartsOn: CalendarWeekStartsOn = getWeekStartsOnIndex(
    schedule.weekStart,
    schedule.timezone,
  );
  const referenceDate = useMemo(() => new Date(), []);

  return (
    <aside className="space-y-6">
      <section className="space-y-4 rounded-3xl border-2 border-border-subtle bg-panel/90 p-5 shadow-clay">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">
            {t("issues.metadataSection")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("issues.metadataSectionHint")}</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">{t("issues.statusField")}</h3>
          <div className="grid gap-2">
            {details.capabilities.status.options.map((option) => {
              const active = option.id === selectedState;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={cn(
                    "rounded-2xl border-2 px-3 py-2 text-left text-sm font-medium transition",
                    active
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-border-subtle bg-field text-muted-foreground hover:border-border-strong hover:text-foreground",
                  )}
                  disabled={busy || !details.capabilities.status.enabled}
                  onClick={() => onStateChange(option.id)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">{t("issues.labelsField")}</h3>
            <Badge>{selectedLabels.length}</Badge>
          </div>
          <ScrollArea className="h-[220px] rounded-2xl border-2 border-border-subtle bg-field/50">
            <div className="space-y-2 p-3">
              {details.capabilities.labels.options.map((option) => {
                const checked = selectedLabels.includes(option.id);
                return (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-border-subtle bg-panel px-3 py-2 text-sm text-foreground shadow-clay"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={busy || !details.capabilities.labels.enabled}
                      onChange={() => onToggleLabel(option.id)}
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">{t("issues.iterationField")}</h3>
          <div className="rounded-2xl border-2 border-border-subtle bg-field/60 p-3">
            <p className="font-medium text-foreground">
              {details.iteration?.label ?? t("issues.noIterationAssigned")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {details.capabilities.iteration.reason ?? t("issues.iterationEditableLater")}
            </p>
          </div>
        </div>

        <Button
          type="button"
          className="w-full"
          disabled={busy || !metadataDirty}
          onClick={() => void onSaveMetadata()}
        >
          {t("issues.saveMetadata")}
        </Button>
      </section>

      <section className="space-y-4 rounded-3xl border-2 border-border-subtle bg-panel/90 p-5 shadow-clay">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">
            {t("issues.logTimeSection")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("issues.timeSectionHint")}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="issue-hub-duration">{t("issues.timeSpent")}</Label>
          <Input
            id="issue-hub-duration"
            value={timeSpent}
            onChange={(event) => onTimeSpentChange(event.target.value)}
            placeholder="1h30m"
            disabled={busy}
          />
        </div>

        <div className="space-y-1.5">
          <span className="text-sm font-medium text-foreground">{t("issues.spentDate")}</span>
          <div className="flex flex-wrap items-center gap-2">
            <PagerControl
              label={formatDateShort(spentDate)}
              scopeLabel={t("common.day")}
              onPrevious={() => onSpentDateChange(shiftDate(spentDate, -1))}
              onCurrent={() => onSpentDateChange(referenceDate)}
              onNext={() => onSpentDateChange(shiftDate(spentDate, 1))}
              disabled={busy}
              compact
            />
            <SingleDayPicker
              open={calendarOpen}
              onOpenChange={setCalendarOpen}
              selectedDate={spentDate}
              visibleMonth={visibleMonth}
              onSelectDate={(value) => {
                onSpentDateChange(value);
                setVisibleMonth(value);
              }}
              onVisibleMonthChange={setVisibleMonth}
              buttonLabel={t("issues.pickSpentDate")}
              holidays={[]}
              weekStartsOn={calendarWeekStartsOn}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="issue-hub-summary">{t("issues.summaryOptional")}</Label>
          <Input
            id="issue-hub-summary"
            value={summary}
            onChange={(event) => onSummaryChange(event.target.value)}
            disabled={busy}
          />
        </div>

        <p className="text-xs text-muted-foreground">{t("issues.quickActionHint")}</p>
        <Button
          type="button"
          className="w-full"
          disabled={busy}
          onClick={() => void onSubmitTime()}
        >
          {t("issues.submitTime")}
        </Button>
      </section>
    </aside>
  );
}
