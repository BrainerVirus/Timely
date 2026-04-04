import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.js";
import Copy from "lucide-react/dist/esm/icons/copy.js";
import Download from "lucide-react/dist/esm/icons/download.js";
import Loader2 from "lucide-react/dist/esm/icons/loader-circle.js";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.js";
import Terminal from "lucide-react/dist/esm/icons/terminal.js";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.js";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { staggerItem } from "@/shared/lib/animations/animations";
import { cn } from "@/shared/lib/utils";
import { AccordionItem } from "@/shared/ui/Accordion/Accordion";
import { Button } from "@/shared/ui/Button/Button";
import { SearchCombobox } from "@/shared/ui/SearchCombobox/SearchCombobox";

import type { DiagnosticLogEntry } from "@/shared/types/dashboard";

export interface SettingsDiagnosticsSectionProps {
  diagnosticsSummary: string;
  diagnostics: DiagnosticLogEntry[];
  diagnosticsBusy: boolean;
  selectedFeatureFilter: string;
  onChangeFeatureFilter: (value: string) => void;
  onRefreshDiagnostics: () => void;
  onClearDiagnostics: () => void;
  onCopyDiagnostics: () => void;
  onExportDiagnostics: () => void;
}

export function SettingsDiagnosticsSection({
  diagnosticsSummary,
  diagnostics,
  diagnosticsBusy,
  selectedFeatureFilter,
  onChangeFeatureFilter,
  onRefreshDiagnostics,
  onClearDiagnostics,
  onCopyDiagnostics,
  onExportDiagnostics,
}: Readonly<SettingsDiagnosticsSectionProps>) {
  const { t } = useI18n();
  const { allowDecorativeAnimation } = useMotionSettings();
  const [expanded, setExpanded] = useState(false);
  const diagnosticsScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded || !diagnosticsScrollRef.current) {
      return;
    }
    diagnosticsScrollRef.current.scrollTop = 0;
  }, [diagnostics, expanded]);

  return (
    <m.div variants={staggerItem}>
      <AccordionItem
        title={t("settings.diagnosticsSection")}
        icon={Terminal}
        summary={diagnosticsSummary}
        allowDecorativeAnimation={allowDecorativeAnimation}
      >
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {t("settings.remindersDiagnosticsDescription")}
          </p>

          <div className="overflow-hidden rounded-xl border-2 border-border-subtle bg-panel shadow-(--shadow-clay)">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-field-hover"
              onClick={() => setExpanded((value) => !value)}
            >
              <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t("settings.remindersDiagnosticsTitle")}
              </span>
              <ChevronDown
                className={cn(
                  "ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform",
                  expanded ? "rotate-180" : null,
                )}
              />
            </button>

            <AnimatePresence initial={false}>
              {expanded ? (
                <m.div
                  initial={allowDecorativeAnimation ? { height: 0, opacity: 0 } : false}
                  animate={allowDecorativeAnimation ? { height: "auto", opacity: 1 } : {}}
                  exit={allowDecorativeAnimation ? { height: 0, opacity: 0 } : {}}
                  transition={{ duration: allowDecorativeAnimation ? 0.22 : 0 }}
                  className="overflow-hidden"
                >
                  <DiagnosticsConsoleBody
                    diagnostics={diagnostics}
                    diagnosticsBusy={diagnosticsBusy}
                    selectedFeatureFilter={selectedFeatureFilter}
                    onChangeFeatureFilter={onChangeFeatureFilter}
                    onRefreshDiagnostics={onRefreshDiagnostics}
                    onCopyDiagnostics={onCopyDiagnostics}
                    onExportDiagnostics={onExportDiagnostics}
                    onClearDiagnostics={onClearDiagnostics}
                    diagnosticsScrollRef={diagnosticsScrollRef}
                  />
                </m.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </AccordionItem>
    </m.div>
  );
}

interface DiagnosticsConsoleBodyProps {
  diagnostics: DiagnosticLogEntry[];
  diagnosticsBusy: boolean;
  selectedFeatureFilter: string;
  onChangeFeatureFilter: (value: string) => void;
  onRefreshDiagnostics: () => void;
  onCopyDiagnostics: () => void;
  onExportDiagnostics: () => void;
  onClearDiagnostics: () => void;
  diagnosticsScrollRef: { current: HTMLDivElement | null };
}

function DiagnosticsConsoleBody({
  diagnostics,
  diagnosticsBusy,
  selectedFeatureFilter,
  onChangeFeatureFilter,
  onRefreshDiagnostics,
  onCopyDiagnostics,
  onExportDiagnostics,
  onClearDiagnostics,
  diagnosticsScrollRef,
}: Readonly<DiagnosticsConsoleBodyProps>) {
  const { t } = useI18n();
  const filterOptions = [
    { value: "all", label: t("settings.diagnosticsFeatureFilterAll") },
    { value: "notifications", label: t("settings.diagnosticsFeatureFilterNotifications") },
  ];

  return (
    <div className="space-y-2 border-t border-border-subtle p-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchCombobox
          value={selectedFeatureFilter}
          options={filterOptions}
          searchPlaceholder={t("common.search")}
          noResultsLabel={t("common.noResults")}
          onChange={onChangeFeatureFilter}
          className="h-8 w-52 max-w-52 min-w-52"
          contentClassName="w-52 min-w-52 max-w-52"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRefreshDiagnostics}
          disabled={diagnosticsBusy}
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          {t("settings.remindersDiagnosticsRefresh")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCopyDiagnostics}
          disabled={diagnosticsBusy}
        >
          <Copy className="mr-1.5 h-3.5 w-3.5" />
          {t("settings.remindersDiagnosticsCopy")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onExportDiagnostics}
          disabled={diagnosticsBusy}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          {t("settings.remindersDiagnosticsExport")}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onClearDiagnostics}
          disabled={diagnosticsBusy}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          {t("settings.remindersDiagnosticsClear")}
        </Button>
      </div>

      <div
        ref={diagnosticsScrollRef}
        className="max-h-48 overflow-y-auto overscroll-contain scroll-smooth rounded-lg border-2 border-border-subtle bg-field p-2 font-mono text-xs leading-relaxed shadow-(--shadow-clay-inset)"
      >
        {diagnosticsBusy ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t("settings.remindersDiagnosticsLoading")}
          </p>
        ) : null}
        {!diagnosticsBusy && diagnostics.length === 0 ? (
          <p className="text-muted-foreground">{t("settings.remindersDiagnosticsEmpty")}</p>
        ) : null}
        {diagnosticsBusy
          ? null
          : diagnostics.map((entry) => {
              const levelClassName = getDiagnosticsLineClassName(entry.level);

              return (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-start gap-x-1.5 gap-y-1 break-words"
                >
                  <span
                    className={cn(
                      "rounded-md border px-1.5 py-0.5 font-semibold shadow-(--shadow-clay-inset)",
                      getDiagnosticsFeatureClassName(entry.feature),
                    )}
                  >
                    [{entry.feature}]
                  </span>
                  <span
                    className={cn(
                      "rounded-md border border-border-subtle/70 bg-panel-elevated px-1.5 py-0.5 tabular-nums shadow-(--shadow-clay-inset)",
                      getDiagnosticsTimeClassName(),
                    )}
                  >
                    [{entry.timestamp}]
                  </span>
                  <span className={cn("font-semibold uppercase", levelClassName)}>
                    [{entry.level}]
                  </span>
                  <span className={cn("font-medium", levelClassName)}>
                    [{entry.source}:{entry.event}]
                  </span>
                  <span className={cn("min-w-0 flex-1 break-all", levelClassName)}>
                    {entry.message}
                  </span>
                </div>
              );
            })}
      </div>
    </div>
  );
}

function getDiagnosticsLineClassName(level: DiagnosticLogEntry["level"]): string {
  if (level === "error") {
    return "text-destructive";
  }
  if (level === "warn") {
    return "text-warning";
  }
  return "text-accent";
}

function getDiagnosticsTimeClassName(): string {
  return "text-secondary";
}

function getDiagnosticsFeatureClassName(feature: DiagnosticLogEntry["feature"]): string {
  if (feature === "notifications") {
    return "border-primary/25 bg-primary/10 text-primary";
  }

  return "border-border-subtle bg-field text-muted-foreground";
}
