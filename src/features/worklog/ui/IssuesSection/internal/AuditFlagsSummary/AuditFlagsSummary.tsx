import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle.js";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.js";
import { useState } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { Badge } from "@/shared/ui/Badge/Badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/Sheet/Sheet";

import type { AuditFlag } from "@/shared/types/dashboard";

interface AuditFlagsSummaryProps {
  auditFlags?: AuditFlag[];
}

export function AuditFlagsSummary({ auditFlags }: Readonly<AuditFlagsSummaryProps>) {
  const { formatAuditSeverity, t } = useI18n();
  const [auditSheetOpen, setAuditSheetOpen] = useState(false);

  if (!auditFlags) {
    return null;
  }

  if (auditFlags.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-success" />
        {t("common.noFlags")}
      </span>
    );
  }

  return (
    <Sheet open={auditSheetOpen} onOpenChange={setAuditSheetOpen}>
      <SheetTrigger asChild>
        <button type="button" className="cursor-pointer">
          <Badge tone="high">
            <AlertTriangle className="mr-1 h-3 w-3" />
            {t("worklog.auditFlagCount", { count: auditFlags.length })}
          </Badge>
        </button>
      </SheetTrigger>
      <SheetContent side="right" closeButtonAriaLabel={t("ui.close")}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            {t("worklog.auditFlags")}
          </SheetTitle>
          <SheetDescription>{t("worklog.auditFlagsDescription")}</SheetDescription>
        </SheetHeader>
        <div className="space-y-2 px-4 pb-4">
          {auditFlags.map((flag) => (
            <div
              key={`${flag.title}-${flag.detail}`}
              className="rounded-xl border-2 border-border-subtle bg-field p-3 shadow-clay-inset"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{flag.title}</p>
                <Badge tone={flag.severity} className="shrink-0">
                  {formatAuditSeverity(flag.severity)}
                </Badge>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{flag.detail}</p>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
