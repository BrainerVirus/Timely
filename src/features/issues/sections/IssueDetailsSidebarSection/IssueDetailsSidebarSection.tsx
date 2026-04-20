import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.js";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { formatIssueDateRange } from "@/features/issues/lib/issue-date-format";
import {
  getAssignedIssueLabelBadgeClassName,
  getAssignedIssueWorkflowBadgeClassName,
} from "@/features/issues/ui/AssignedIssuesBoard/lib/assigned-issue-badge-tone";
import { shiftDate } from "@/shared/lib/date/date";
import { cn, getWeekStartsOnIndex } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/Badge/Badge";
import { Button } from "@/shared/ui/Button/Button";
import { Combobox, ComboboxCollection, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/shared/ui/Combobox/Combobox";
import { Input } from "@/shared/ui/Input/Input";
import { Label } from "@/shared/ui/Label/Label";
import { PagerControl } from "@/shared/ui/PagerControl/PagerControl";
import {
  type CalendarWeekStartsOn,
  SingleDayPicker,
} from "@/shared/ui/SingleDayPicker/SingleDayPicker";
import {
  type SearchComboboxOption,
  matchesQuery,
} from "@/shared/ui/SearchCombobox/search-combobox.lib";

import type { IssueDetailsSnapshot, ScheduleSnapshot } from "@/shared/types/dashboard";

interface IssueDetailsSidebarSectionProps {
  details: IssueDetailsSnapshot;
  schedule: ScheduleSnapshot;
  timezone: string;
  busy: boolean;
  selectedState: string;
  selectedLabels: string[];
  selectedMilestoneId?: string | null;
  selectedIterationId?: string | null;
  timeSpent: string;
  spentDate: Date;
  summary: string;
  metadataDirty: boolean;
  onStateChange: (value: string) => void;
  onToggleLabel: (value: string) => void;
  onMilestoneChange?: (value: string | null) => void;
  onIterationChange?: (value: string | null) => void;
  onSaveMetadata: () => Promise<void>;
  onTimeSpentChange: (value: string) => void;
  onSpentDateChange: (value: Date) => void;
  onSummaryChange: (value: string) => void;
  onSubmitTime: () => Promise<void>;
}

const inspectorSectionClassName =
  "rounded-[1.75rem] border-2 border-border-subtle bg-panel/85 p-5 shadow-clay";
const inspectorRowClassName =
  "space-y-2 border-t border-border-subtle/70 pt-4 first:border-t-0 first:pt-0";
function getChangedLabelIds(current: string[], next: string[]) {
  const currentSet = new Set(current);
  const nextSet = new Set(next);

  return [...new Set([...current, ...next])].filter(
    (value) => currentSet.has(value) !== nextSet.has(value),
  );
}

export function IssueDetailsSidebarSection({
  details,
  schedule,
  timezone,
  busy,
  selectedState: _selectedState,
  selectedLabels,
  selectedMilestoneId = null,
  selectedIterationId = null,
  timeSpent,
  spentDate,
  summary,
  metadataDirty,
  onStateChange: _onStateChange,
  onToggleLabel,
  onMilestoneChange,
  onIterationChange,
  onSaveMetadata,
  onTimeSpentChange,
  onSpentDateChange,
  onSummaryChange,
  onSubmitTime,
}: Readonly<IssueDetailsSidebarSectionProps>) {
  const { formatDateShort, locale, t } = useI18n();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => spentDate);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [labelsQuery, setLabelsQuery] = useState("");
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [milestoneQuery, setMilestoneQuery] = useState("");
  const [iterationOpen, setIterationOpen] = useState(false);
  const [iterationQuery, setIterationQuery] = useState("");
  const inspectorRef = useRef<HTMLDivElement | null>(null);
  const previousLabelsOpenRef = useRef(false);
  const previousMilestoneOpenRef = useRef(false);
  const previousIterationOpenRef = useRef(false);
  const labelsInputId = useId();
  const milestoneInputId = useId();
  const iterationInputId = useId();
  const calendarWeekStartsOn: CalendarWeekStartsOn = getWeekStartsOnIndex(
    schedule.weekStart,
    schedule.timezone,
  );
  const referenceDate = useMemo(() => new Date(), []);
  const labelOptions = useMemo<SearchComboboxOption[]>(
    () =>
      details.capabilities.labels.options.map((option) => ({
        value: option.id,
        label: option.label,
      })),
    [details.capabilities.labels.options],
  );
  const filteredLabelOptions = useMemo(() => {
    const query = labelsQuery.trim().toLowerCase();
    if (!query) {
      return labelOptions;
    }

    return labelOptions.filter((option) => matchesQuery(option, query));
  }, [labelOptions, labelsQuery]);

  const milestoneOptions = useMemo<SearchComboboxOption[]>(
    () =>
      details.capabilities.milestone.options.map((option) => ({
        value: option.id,
        label: option.label,
      })),
    [details.capabilities.milestone.options],
  );
  const filteredMilestoneOptions = useMemo(() => {
    const query = milestoneQuery.trim().toLowerCase();
    if (!query) {
      return milestoneOptions;
    }
    return milestoneOptions.filter((option) => matchesQuery(option, query));
  }, [milestoneOptions, milestoneQuery]);

  const iterationOptions = useMemo<SearchComboboxOption[]>(
    () =>
      details.capabilities.iteration.options.map((option) => ({
        value: option.id,
        label: option.label,
      })),
    [details.capabilities.iteration.options],
  );
  const filteredIterationOptions = useMemo(() => {
    const query = iterationQuery.trim().toLowerCase();
    if (!query) {
      return iterationOptions;
    }
    return iterationOptions.filter((option) => matchesQuery(option, query));
  }, [iterationOptions, iterationQuery]);

  let selectedMilestoneLabel: string | null = null;
  if (selectedMilestoneId) {
    selectedMilestoneLabel =
      milestoneOptions.find((option) => option.value === selectedMilestoneId)?.label ??
      details.milestone?.label ??
      details.milestoneTitle ??
      selectedMilestoneId;
  } else if (details.milestoneTitle) {
    selectedMilestoneLabel = details.milestoneTitle;
  }

  let selectedIterationLabel: string | null = null;
  if (selectedIterationId) {
    selectedIterationLabel =
      iterationOptions.find((option) => option.value === selectedIterationId)?.label ??
      details.iteration?.label ??
      selectedIterationId;
  } else if (details.iteration?.label) {
    selectedIterationLabel = details.iteration.label;
  }

  const milestoneEditable = details.capabilities.milestone.enabled && Boolean(onMilestoneChange);
  const iterationEditable = details.capabilities.iteration.enabled && Boolean(onIterationChange);

  let milestoneActionLabel: string | undefined;
  if (milestoneEditable) {
    milestoneActionLabel = milestoneOpen ? t("common.close") : t("issues.editMilestone");
  }

  let iterationActionLabel: string | undefined;
  if (iterationEditable) {
    iterationActionLabel = iterationOpen ? t("common.close") : t("issues.editIteration");
  }

  const hasIterationDates = Boolean(
    details.iteration?.startDate || details.iteration?.dueDate,
  );
  let iterationHintText: string | null = null;
  if (hasIterationDates) {
    iterationHintText = formatIssueDateRange(
      locale,
      details.iteration?.startDate,
      details.iteration?.dueDate,
      timezone,
    );
  } else if (!iterationEditable) {
    iterationHintText =
      details.capabilities.iteration.reason ?? t("issues.iterationEditableLater");
  }

  useEffect(() => {
    if (previousLabelsOpenRef.current && !labelsOpen && metadataDirty) {
      void onSaveMetadata();
    }
    previousLabelsOpenRef.current = labelsOpen;
  }, [labelsOpen, metadataDirty, onSaveMetadata]);

  useEffect(() => {
    if (previousMilestoneOpenRef.current && !milestoneOpen && metadataDirty) {
      void onSaveMetadata();
    }
    previousMilestoneOpenRef.current = milestoneOpen;
  }, [milestoneOpen, metadataDirty, onSaveMetadata]);

  useEffect(() => {
    if (previousIterationOpenRef.current && !iterationOpen && metadataDirty) {
      void onSaveMetadata();
    }
    previousIterationOpenRef.current = iterationOpen;
  }, [iterationOpen, metadataDirty, onSaveMetadata]);

  useEffect(() => {
    if (!labelsOpen && !milestoneOpen && !iterationOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }

      if (inspectorRef.current?.contains(event.target)) {
        return;
      }

      setLabelsOpen(false);
      setMilestoneOpen(false);
      setIterationOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [iterationOpen, labelsOpen, milestoneOpen]);

  return (
    <aside
      className="space-y-5 xl:sticky xl:top-16 xl:self-start"
      ref={inspectorRef}
    >
      <section className={inspectorSectionClassName}>
        <div className="space-y-1">
          <h2 className="font-display text-xl font-semibold text-foreground">
            {t("issues.metadataSection")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("issues.metadataSectionHint")}</p>
        </div>

        <div className="mt-5 space-y-4">
          {details.capabilities.status.enabled && details.status ? (
            <InspectorRow label={t("issues.statusField")}>
              <div>
                <Badge
                  className={cn(
                    "normal-case tracking-normal",
                    getAssignedIssueWorkflowBadgeClassName(details.status.label),
                  )}
                >
                  {details.status.label}
                </Badge>
              </div>
            </InspectorRow>
          ) : null}

          <InspectorRow
            label={t("issues.labelsField")}
            actionLabel={labelsOpen ? t("common.close") : t("issues.editLabels")}
            onAction={() => setLabelsOpen((current) => !current)}
          >
            {labelsOpen ? (
              <div className="space-y-3">
                <Label htmlFor={labelsInputId} className="sr-only">
                  {t("issues.labelsField")}
                </Label>
                <Combobox
                  multiple
                  open={labelsOpen}
                  value={selectedLabels}
                  inputValue={labelsQuery}
                  items={labelOptions}
                  filteredItems={filteredLabelOptions}
                  filter={null}
                  itemToStringLabel={(value: unknown) =>
                    typeof value === "string"
                      ? labelOptions.find((option) => option.value === value)?.label ?? value
                      : ""
                  }
                  onInputValueChange={setLabelsQuery}
                  onOpenChange={setLabelsOpen}
                  onValueChange={(value) => {
                    if (!Array.isArray(value)) {
                      return;
                    }

                    const nextSelection = value.filter(
                      (item): item is string => typeof item === "string",
                    );
                    for (const changed of getChangedLabelIds(selectedLabels, nextSelection)) {
                      onToggleLabel(changed);
                    }
                  }}
                >
                  <ComboboxInput
                    id={labelsInputId}
                    aria-label={t("issues.labelsField")}
                    className="w-full min-w-0 max-w-none"
                    disabled={busy}
                    placeholder={t("common.search")}
                    triggerAriaLabel={t("issues.selectLabels")}
                  />
                  <ComboboxContent sideOffset={6}>
                    <ComboboxEmpty>{t("common.noResults")}</ComboboxEmpty>
                    <ComboboxList className="max-h-64">
                      <ComboboxCollection>
                        {(item: SearchComboboxOption) => (
                          <ComboboxItem key={item.value} value={item.value}>
                            <span className="flex-1 truncate">{item.label}</span>
                          </ComboboxItem>
                        )}
                      </ComboboxCollection>
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedLabels.length > 0 ? (
                  selectedLabels.map((labelId) => {
                    const label =
                      labelOptions.find((option) => option.value === labelId)?.label ?? labelId;

                    return (
                      <Badge
                        key={labelId}
                        className={cn(
                          "normal-case tracking-normal",
                          getAssignedIssueLabelBadgeClassName(label),
                        )}
                      >
                        {label}
                      </Badge>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">{t("common.none")}</p>
                )}
              </div>
            )}
          </InspectorRow>

          <InspectorRow
            label={t("issues.milestoneField")}
            actionLabel={milestoneActionLabel}
            onAction={milestoneEditable ? () => setMilestoneOpen((current) => !current) : undefined}
          >
            {milestoneEditable && milestoneOpen ? (
              <div className="space-y-3">
                <Label htmlFor={milestoneInputId} className="sr-only">
                  {t("issues.milestoneField")}
                </Label>
                <Combobox
                  open={milestoneOpen}
                  value={selectedMilestoneId ?? ""}
                  inputValue={milestoneQuery}
                  items={milestoneOptions}
                  filteredItems={filteredMilestoneOptions}
                  filter={null}
                  itemToStringLabel={(value: unknown) =>
                    typeof value === "string"
                      ? milestoneOptions.find((option) => option.value === value)?.label ?? value
                      : ""
                  }
                  onInputValueChange={setMilestoneQuery}
                  onOpenChange={setMilestoneOpen}
                  onValueChange={(value) => {
                    if (typeof value !== "string") {
                      return;
                    }
                    onMilestoneChange?.(value.length > 0 ? value : null);
                  }}
                >
                  <ComboboxInput
                    id={milestoneInputId}
                    aria-label={t("issues.milestoneField")}
                    className="w-full min-w-0 max-w-none"
                    disabled={busy}
                    placeholder={t("common.search")}
                    triggerAriaLabel={t("issues.selectMilestone")}
                  />
                  <ComboboxContent sideOffset={6}>
                    <ComboboxEmpty>{t("common.noResults")}</ComboboxEmpty>
                    <ComboboxList className="max-h-64">
                      <ComboboxCollection>
                        {(item: SearchComboboxOption) => (
                          <ComboboxItem key={item.value} value={item.value}>
                            <span className="flex-1 truncate">{item.label}</span>
                          </ComboboxItem>
                        )}
                      </ComboboxCollection>
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
                {selectedMilestoneId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                    disabled={busy}
                    onClick={() => onMilestoneChange?.(null)}
                  >
                    {t("issues.unassignMilestone")}
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-1">
                {selectedMilestoneLabel ? (
                  <p className="text-sm font-medium text-foreground">{selectedMilestoneLabel}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("issues.noMilestoneAssigned")}
                  </p>
                )}
              </div>
            )}
          </InspectorRow>

          <InspectorRow
            label={t("issues.iterationField")}
            actionLabel={iterationActionLabel}
            onAction={iterationEditable ? () => setIterationOpen((current) => !current) : undefined}
          >
            {iterationEditable && iterationOpen ? (
              <div className="space-y-3">
                <Label htmlFor={iterationInputId} className="sr-only">
                  {t("issues.iterationField")}
                </Label>
                <Combobox
                  open={iterationOpen}
                  value={selectedIterationId ?? ""}
                  inputValue={iterationQuery}
                  items={iterationOptions}
                  filteredItems={filteredIterationOptions}
                  filter={null}
                  itemToStringLabel={(value: unknown) =>
                    typeof value === "string"
                      ? iterationOptions.find((option) => option.value === value)?.label ?? value
                      : ""
                  }
                  onInputValueChange={setIterationQuery}
                  onOpenChange={setIterationOpen}
                  onValueChange={(value) => {
                    if (typeof value !== "string") {
                      return;
                    }
                    onIterationChange?.(value.length > 0 ? value : null);
                  }}
                >
                  <ComboboxInput
                    id={iterationInputId}
                    aria-label={t("issues.iterationField")}
                    className="w-full min-w-0 max-w-none"
                    disabled={busy}
                    placeholder={t("common.search")}
                    triggerAriaLabel={t("issues.selectIteration")}
                  />
                  <ComboboxContent sideOffset={6}>
                    <ComboboxEmpty>{t("common.noResults")}</ComboboxEmpty>
                    <ComboboxList className="max-h-64">
                      <ComboboxCollection>
                        {(item: SearchComboboxOption) => (
                          <ComboboxItem key={item.value} value={item.value}>
                            <span className="flex-1 truncate">{item.label}</span>
                          </ComboboxItem>
                        )}
                      </ComboboxCollection>
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
                {selectedIterationId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                    disabled={busy}
                    onClick={() => onIterationChange?.(null)}
                  >
                    {t("issues.unassignIteration")}
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-1">
                {selectedIterationLabel ? (
                  <p className="text-sm text-foreground/90">{selectedIterationLabel}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("issues.noIterationAssigned")}
                  </p>
                )}
                {iterationHintText ? (
                  <p className="text-xs text-muted-foreground">{iterationHintText}</p>
                ) : null}
              </div>
            )}
          </InspectorRow>
        </div>
      </section>

      <section className={inspectorSectionClassName}>
        <div className="space-y-1">
          <h2 className="font-display text-xl font-semibold text-foreground">
            {t("issues.logTimeSection")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("issues.timeSectionHint")}</p>
        </div>

        <div className="mt-5 space-y-4">
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

          <Button
            type="button"
            className="w-full"
            disabled={busy}
            onClick={() => void onSubmitTime()}
          >
            {t("issues.submitTime")}
          </Button>
        </div>
      </section>
    </aside>
  );
}

function InspectorRow({
  label,
  actionLabel,
  onAction,
  children,
}: Readonly<{
  label: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}>) {
  return (
    <div className={inspectorRowClassName}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        {actionLabel ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            onClick={onAction}
          >
            {actionLabel}
            <ChevronDown className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}
