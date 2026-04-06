import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import { useI18n } from "@/app/providers/I18nService/i18n";
import {
  getCompactIconButtonClassName,
  getNeutralSegmentedControlClassName,
} from "@/shared/lib/control-styles/control-styles";

export function PagerControl({
  label,
  scopeLabel,
  onPrevious,
  onCurrent,
  onNext,
  disabled = false,
  disablePrevious = false,
  disableNext = false,
  compact = false,
}: Readonly<{
  label: string;
  scopeLabel?: string;
  onPrevious: () => void;
  onCurrent: () => void;
  onNext: () => void;
  disabled?: boolean;
  disablePrevious?: boolean;
  disableNext?: boolean;
  compact?: boolean;
}>) {
  const { t } = useI18n();
  const prevAria = scopeLabel ? `${t("common.previous")} ${scopeLabel}` : t("common.previous");
  const nextAria = scopeLabel ? `${t("common.next")} ${scopeLabel}` : t("common.next");

  const iconButtonClass = compact
    ? "size-7 rounded-md border-transparent bg-transparent text-muted-foreground shadow-none hover:border-border-subtle hover:bg-field-hover"
    : "rounded-lg border-transparent bg-transparent shadow-none hover:border-border-subtle hover:bg-field-hover";

  const labelButtonClass = compact
    ? "h-7 min-w-16 rounded-md border-transparent bg-transparent px-2 text-xs hover:bg-field-hover"
    : "rounded-lg border-transparent bg-transparent px-2 hover:bg-field-hover";

  const containerClass = compact
    ? "inline-flex items-center gap-0.5 rounded-lg border-2 border-border-subtle bg-tray p-0.5 shadow-clay"
    : "inline-flex items-center gap-1 rounded-xl border-2 border-border-subtle bg-tray p-1 shadow-clay";

  return (
    <div className={containerClass}>
      <button
        type="button"
        aria-label={prevAria}
        onClick={onPrevious}
        disabled={disabled || disablePrevious}
        className={getCompactIconButtonClassName(false, iconButtonClass)}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label={label}
        onClick={onCurrent}
        disabled={disabled}
        className={getNeutralSegmentedControlClassName(false, labelButtonClass)}
      >
        {label}
      </button>
      <button
        type="button"
        aria-label={nextAria}
        onClick={onNext}
        disabled={disabled || disableNext}
        className={getCompactIconButtonClassName(false, iconButtonClass)}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
