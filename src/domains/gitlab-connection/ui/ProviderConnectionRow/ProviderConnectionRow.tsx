import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.js";
import LogOut from "lucide-react/dist/esm/icons/log-out.js";
import { AnimatePresence, m } from "motion/react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/Button/Button";

import type { LucideIcon } from "lucide-react";

interface ProviderConnectionRowProps {
  providerName: string;
  providerIcon: LucideIcon;
  isConnected: boolean;
  connectionSummary?: string;
  isExpanded: boolean;
  onToggle: () => void;
  onDisconnect?: () => void;
  children: React.ReactNode;
}

export function ProviderConnectionRow({
  providerName,
  providerIcon: Icon,
  isConnected,
  connectionSummary,
  isExpanded,
  onToggle,
  onDisconnect,
  children,
}: Readonly<ProviderConnectionRowProps>) {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl border-2 border-border-subtle bg-panel-elevated shadow-card">
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3",
          isExpanded ? "rounded-t-2xl" : "rounded-2xl",
        )}
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-border-subtle bg-field shadow-clay">
          <Icon className="h-5 w-5 text-secondary" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold text-foreground">{providerName}</p>
          {isConnected && connectionSummary ? (
            <p className="text-xs text-success">{connectionSummary}</p>
          ) : null}
        </div>

        {isConnected ? (
          <Button variant="ghost" size="sm" onClick={onDisconnect}>
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            {t("providers.disconnect")}
          </Button>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-xl border-2 px-4 py-2 text-sm font-bold transition-all active:translate-y-px active:shadow-none",
              isExpanded
                ? "border-border-strong bg-panel text-muted-foreground shadow-clay hover:bg-field-hover"
                : "border-primary/80 bg-primary text-primary-foreground shadow-button-primary hover:brightness-110",
            )}
          >
            {isExpanded ? null : t("providers.connect")}
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isExpanded ? "rotate-180" : "",
              )}
            />
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && !isConnected ? (
          <m.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t-2 border-border-subtle px-4 pt-4 pb-4">{children}</div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
