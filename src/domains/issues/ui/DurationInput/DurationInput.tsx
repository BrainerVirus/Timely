import { formatDurationPreview, normalizeDurationParts } from "@/domains/issues/lib/duration";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/Button/Button";
import { Input } from "@/shared/ui/Input/Input";

import type { DurationParts } from "@/domains/issues/types/duration";

type DurationUnit = keyof DurationParts;

interface DurationInputProps {
  value: DurationParts;
  locale: string;
  disabled?: boolean;
  onChange: (value: DurationParts) => void;
}

const segmentLabels: Record<DurationUnit, string> = {
  weeks: "Weeks",
  days: "Days",
  hours: "Hours",
  minutes: "Minutes",
};

const segmentSuffixes: Record<DurationUnit, string> = {
  weeks: "w",
  days: "d",
  hours: "h",
  minutes: "m",
};

const quickActions = [
  { label: "+15m", ariaLabel: "Add 15 minutes", minutes: 15 },
  { label: "+30m", ariaLabel: "Add 30 minutes", minutes: 30 },
  { label: "+1h", ariaLabel: "Add 1 hour", minutes: 60 },
  { label: "+2h", ariaLabel: "Add 2 hours", minutes: 120 },
  { label: "+4h", ariaLabel: "Add 4 hours", minutes: 240 },
] as const;

const zeroDuration: DurationParts = { weeks: 0, days: 0, hours: 0, minutes: 0 };

export function DurationInput({
  value,
  locale,
  disabled = false,
  onChange,
}: Readonly<DurationInputProps>) {
  const normalized = normalizeDurationParts(value);
  const preview = formatDurationPreview(normalized, locale);

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
        Spent time
      </legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Object.keys(segmentLabels).map((unit) => {
          const typedUnit = unit as DurationUnit;

          return (
            <label key={unit} className="space-y-1 text-xs font-bold text-muted-foreground">
              <span>{segmentLabels[typedUnit]}</span>
              <div className="relative">
                <Input
                  className="pr-8 text-center font-mono text-sm font-semibold"
                  inputMode="numeric"
                  min={0}
                  step={typedUnit === "minutes" ? 5 : 1}
                  type="number"
                  aria-label={segmentLabels[typedUnit]}
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
                  {segmentSuffixes[typedUnit]}
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
          aria-label="Clear duration"
          className="px-3"
          onClick={() => onChange(zeroDuration)}
        >
          clear
        </Button>
      </div>
      <p
        className={cn(
          "rounded-xl border-2 border-border-subtle bg-field px-3 py-2 text-sm font-medium shadow-clay-inset",
          preview === "No time selected" ? "text-muted-foreground" : "text-foreground",
        )}
        aria-live="polite"
      >
        {preview}
      </p>
    </fieldset>
  );
}
