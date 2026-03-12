import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

import type { AuditFlag } from "@/types/dashboard";

interface AuditViewProps {
  flags: AuditFlag[];
}

export function AuditView({ flags }: AuditViewProps) {
  const { formatAuditSeverity, t } = useI18n();

  return (
    <div className="space-y-6">
      <Card className="space-y-4" data-onboarding="audit-card">
        <SectionHeading title={t("audit.title")} note={t("audit.note")} />
        <div className="space-y-2">
          {flags.map((flag) => (
            <div
              key={flag.title}
              className="rounded-xl border-2 border-border bg-muted p-3 shadow-[var(--shadow-clay-inset)]"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">{flag.title}</h3>
                <Badge tone={flag.severity}>{formatAuditSeverity(flag.severity)}</Badge>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{flag.detail}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
