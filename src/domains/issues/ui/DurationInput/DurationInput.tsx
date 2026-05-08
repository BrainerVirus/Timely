import { formatDurationPreview, normalizeDurationParts } from "@/domains/issues/lib/duration";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/Button/Button";
import { Input } from "@/shared/ui/Input/Input";

import type { DurationParts } from "@/domains/issues/types/duration";

type DurationUnit = keyof DurationParts;

export interface DurationInputLabels {
  legend: string;
  segmentLabels: Record<DurationUnit, string>;
  segmentSuffixes: Record<DurationUnit, string>;
  quickActions: {
    add15Minutes: string;
    add30Minutes: string;
    add1Hour: string;
    add2Hours: string;
    add4Hours: string;
  };
  clear: string;
  clearAriaLabel: string;
  emptyPreview: string;
}

interface DurationInputProps {
  value: DurationParts;
  locale: string;
  labels: DurationInputLabels;
  disabled?: boolean;
  onChange: (value: DurationParts) => void;
}

const durationUnits = ["weeks", "days", "hours", "minutes"] as const;

const zeroDuration: DurationParts = { weeks: 0, days: 0, hours: 0, minutes: 0 };

export function DurationInput({
  value,
  locale,
  labels,
  disabled = false,
  onChange,
}: Readonly<DurationInputProps>) {
  const normalized = normalizeDurationParts(value);
  const preview = formatDurationPreview(normalized, locale, labels.emptyPreview);
  const quickActions = [
    { label: "+15m", ariaLabel: labels.quickActions.add15Minutes, minutes: 15 },
    { label: "+30m", ariaLabel: labels.quickActions.add30Minutes, minutes: 30 },
    { label: "+1h", ariaLabel: labels.quickActions.add1Hour, minutes: 60 },
    { label: "+2h", ariaLabel: labels.quickActions.add2Hours, minutes: 120 },
    { label: "+4h", ariaLabel: labels.quickActions.add4Hours, minutes: 240 },
  ] as const;

  function updateSegment(unit: DurationUnit, nextValue: number) {
    onChange(normalizeDurationParts({ ...normalized, [unit]: Math.max(0, Math.trunc(nextValue)) }));
  }

  function adjustSegment(unit: DurationUnit, delta: number) {
    updateSegment(unit, normalized[unit] + delta);
  }

  function addMinutes(minutes: number) {
    onChange(normalizeDurationParts({ ...normalized, minutes: normalized.minutes + minutes }));
  }

  return (
    <fieldset
      className="space-y-3 rounded-2xl border-2 border-border-subtle bg-card p-3 shadow-clay"
      disabled={disabled}
    >
      <legend className="px-1 font-display text-sm font-semibold text-foreground">
        {labels.legend}
      </legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {durationUnits.map((typedUnit) => {
          return (
            <label key={typedUnit} className="space-y-1 text-xs font-bold text-muted-foreground">
              <span>{labels.segmentLabels[typedUnit]}</span>
              <div className="relative">
                <Input
                  className="pr-8 text-center font-mono text-sm font-semibold"
                  inputMode="numeric"
                  min={0}
                  step={typedUnit === "minutes" ? 5 : 1}
                  type="number"
                  aria-label={labels.segmentLabels[typedUnit]}
                  value={normalized[typedUnit]}
                  onChange={(event) => updateSegment(typedUnit, Number(event.target.value || 0))}
                  onKeyDown={(event) => {
                    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
                      return;
                    }

                    event.preventDefault();
                    const direction = event.key === "ArrowUp" ? 1 : -1;
                    const step = typedUnit === "minutes" ? 5 : 1;
                    adjustSegment(typedUnit, direction * step);
                  }}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold text-muted-foreground/70">
                  {labels.segmentSuffixes[typedUnit]}
                </span>
              </div>
            </label>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {quickActions.map((action) => (
          <Button
            key={action.label}
            type="button"
            variant="ghost"
            size="sm"
            aria-label={action.ariaLabel}
            className="px-3"
            onClick={() => addMinutes(action.minutes)}
          >
            {action.label}
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={labels.clearAriaLabel}
          className="px-3"
          onClick={() => onChange(zeroDuration)}
        >
          {labels.clear}
        </Button>
      </div>
      <p
        className={cn(
          "rounded-xl border-2 border-border-subtle bg-field px-3 py-2 text-sm font-medium shadow-clay-inset",
          preview === labels.emptyPreview ? "text-muted-foreground" : "text-foreground",
        )}
        aria-live="polite"
      >
        {preview}
      </p>
    </fieldset>
  );
}
