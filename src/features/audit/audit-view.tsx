import { m } from "motion/react";
import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cardContainerVariants, cardItemVariants } from "@/lib/animations";

import type { AuditFlag } from "@/types/dashboard";

interface AuditViewProps {
  flags: AuditFlag[];
}

export function AuditView({ flags }: AuditViewProps) {
  return (
    <m.div
      variants={cardContainerVariants}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      <Card className="space-y-4" data-onboarding="audit-card">
        <SectionHeading title="Audit" note="Underfills and overages." />
        <div className="space-y-2">
          {flags.map((flag) => (
            <m.div
              key={flag.title}
              variants={cardItemVariants}
              className="rounded-xl border border-border bg-muted p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">{flag.title}</h3>
                <Badge tone={flag.severity}>{flag.severity}</Badge>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{flag.detail}</p>
            </m.div>
          ))}
        </div>
      </Card>
    </m.div>
  );
}
