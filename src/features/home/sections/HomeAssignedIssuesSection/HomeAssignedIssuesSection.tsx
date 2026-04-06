import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { Button } from "@/shared/ui/Button/Button";
import { SectionHeading } from "@/shared/ui/SectionHeading/SectionHeading";

import type { AssignedIssueSnapshot } from "@/shared/types/dashboard";

interface HomeAssignedIssuesSectionProps {
  issues: AssignedIssueSnapshot[];
  onOpenBoard: () => void;
  onOpenIssue: (issue: AssignedIssueSnapshot) => void;
}

export function HomeAssignedIssuesSection({
  issues,
  onOpenBoard,
  onOpenIssue,
}: Readonly<HomeAssignedIssuesSectionProps>) {
  const { t } = useI18n();

  if (issues.length === 0) {
    return null;
  }

  const preview = issues.slice(0, 5);

  return (
    <section className="rounded-3xl border-2 border-border-subtle bg-panel/90 p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeading title={t("home.assignedIssuesTitle")} note={t("home.assignedIssuesHint")} />
        <Button type="button" variant="soft" size="sm" onClick={onOpenBoard}>
          {t("home.assignedIssuesOpenBoard")}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
      <ul className="mt-4 space-y-2">
        {preview.map((issue) => (
          <li key={issue.key}>
            <button
              type="button"
              onClick={() => onOpenIssue(issue)}
              className="flex w-full items-start justify-between gap-3 rounded-xl border border-border-subtle bg-field px-3 py-2 text-left text-sm transition-colors hover:border-primary/35 hover:bg-panel-elevated"
            >
              <span className="min-w-0 flex-1 text-pretty font-medium leading-snug text-foreground">
                {issue.title}
              </span>
              <span className="shrink-0 break-all text-right font-mono text-xs text-muted-foreground">
                {issue.key}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {issues.length > preview.length ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {t("home.assignedIssuesMore", { count: issues.length - preview.length })}
        </p>
      ) : null}
    </section>
  );
}
