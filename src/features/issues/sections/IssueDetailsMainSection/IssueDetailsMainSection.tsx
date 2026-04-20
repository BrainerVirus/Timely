import { useMemo, useState, type ReactNode } from "react";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.js";
import Link2 from "lucide-react/dist/esm/icons/link-2.js";
import ListTree from "lucide-react/dist/esm/icons/list-tree.js";
import MessageSquare from "lucide-react/dist/esm/icons/message-square.js";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { formatIssueTimestamp } from "@/features/issues/lib/issue-date-format";
import { IssueMarkdownField } from "@/features/issues/ui/IssueMarkdownField/IssueMarkdownField";
import { IssueMarkdownPreview } from "@/features/issues/ui/IssueMarkdownPreview/IssueMarkdownPreview";
import {
  getAssignedIssueStateBadgeClassName,
} from "@/features/issues/ui/AssignedIssuesBoard/lib/assigned-issue-badge-tone";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/Badge/Badge";
import { Button } from "@/shared/ui/Button/Button";
import { ScrollArea } from "@/shared/ui/ScrollArea/ScrollArea";

import type { IssueComposerMode } from "@/features/issues/types/issue-details";
import type {
  IssueCodeTheme,
  IssueDetailsSnapshot,
  IssueRouteReference,
} from "@/shared/types/dashboard";

interface IssueDetailsMainSectionProps {
  details: IssueDetailsSnapshot;
  timezone: string;
  codeTheme: IssueCodeTheme;
  composerMode: IssueComposerMode;
  commentBody: string;
  busy: boolean;
  onComposerModeChange: (mode: IssueComposerMode) => void;
  onCommentBodyChange: (value: string) => void;
  onSubmitComment: () => Promise<void>;
  onToggleIssueState: () => Promise<void>;
  onOpenIssue: (reference: IssueRouteReference) => void;
}

const sectionClassName = "space-y-4 border-t border-border-subtle/70 pt-6";

export function IssueDetailsMainSection({
  details,
  timezone,
  codeTheme,
  composerMode,
  commentBody,
  busy,
  onComposerModeChange,
  onCommentBodyChange,
  onSubmitComment,
  onToggleIssueState,
  onOpenIssue,
}: Readonly<IssueDetailsMainSectionProps>) {
  const { locale, t } = useI18n();
  const [linkedItemsCollapsed, setLinkedItemsCollapsed] = useState(false);
  const [childItemsCollapsed, setChildItemsCollapsed] = useState(false);
  const activity = useMemo(
    () =>
      [...details.activity].sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      ),
    [details.activity],
  );

  return (
    <div className="space-y-8">
      <section>
        <IssueMarkdownPreview
          source={details.description ?? ""}
          codeTheme={codeTheme}
          className="min-h-0 p-0"
          presentation="plain"
        />
      </section>

      <IssueRelationsSection
        icon={<Link2 className="h-4 w-4" />}
        title={t("issues.linkedItemsSection")}
        t={t}
        collapsed={linkedItemsCollapsed}
        onToggleCollapsed={() => setLinkedItemsCollapsed((current) => !current)}
        emptyMessage={t("issues.linkedItemsEmpty")}
        items={details.linkedItems ?? []}
        onOpenIssue={onOpenIssue}
      />

      <IssueRelationsSection
        icon={<ListTree className="h-4 w-4" />}
        title={t("issues.childItemsSection")}
        t={t}
        collapsed={childItemsCollapsed}
        onToggleCollapsed={() => setChildItemsCollapsed((current) => !current)}
        emptyMessage={t("issues.childItemsEmpty")}
        items={details.childItems ?? []}
        onOpenIssue={onOpenIssue}
      />

      <section className={sectionClassName}>
        <SectionHeading
          icon={<MessageSquare className="h-4 w-4" />}
          title={t("issues.commentSection")}
          hint={t("issues.markdownEditorHint")}
        />
        <IssueMarkdownField
          value={commentBody}
          onChange={onCommentBodyChange}
          codeTheme={codeTheme}
          mode={composerMode}
          onModeChange={onComposerModeChange}
          disabled={busy}
          placeholder={t("issues.commentPlaceholder")}
          className="border-border-subtle/80"
          height={440}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="soft"
            className="min-w-[9.75rem]"
            disabled={busy || !commentBody.trim()}
            onClick={() => void onSubmitComment()}
          >
            {t("issues.submitComment")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="min-w-[9.75rem]"
            disabled={busy}
            onClick={() => void onToggleIssueState()}
          >
            {details.state === "closed"
              ? t("issues.reopenIssueAction")
              : t("issues.closeIssueAction")}
          </Button>
        </div>
      </section>

      <section className={sectionClassName}>
        <div className="flex items-start justify-between gap-4">
          <SectionHeading
            icon={<MessageSquare className="h-4 w-4" />}
            title={t("issues.activitySection")}
            hint={t("issues.activitySectionHint")}
          />
          <Badge className="normal-case tracking-normal">{activity.length}</Badge>
        </div>

        {activity.length === 0 ? (
          <div className="px-1 py-2 text-sm text-muted-foreground">
            {t("issues.activityEmpty")}
          </div>
        ) : (
          <div className="space-y-0">
            {activity.map((item, index) => (
              <article
                key={item.id}
                className={cn(
                  "relative border-border-subtle/70 py-5 pl-8",
                  index < activity.length - 1 ? "border-b" : "",
                )}
              >
                <span className="absolute top-0 left-[7px] h-full w-px bg-border-subtle/70" />
                <span className="absolute top-7 left-0 h-4 w-4 rounded-full border-2 border-primary/35 bg-panel" />
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {item.author?.name ?? t("issues.systemAuthor")}
                    </span>
                    <Badge
                      className={cn(
                        "normal-case tracking-normal",
                        item.system
                          ? "border-secondary/35 bg-secondary/10 text-secondary"
                          : "border-accent/35 bg-accent/10 text-accent",
                      )}
                    >
                      {item.system ? t("issues.activitySystem") : t("issues.activityComment")}
                    </Badge>
                  </div>
                  <time className="text-xs text-muted-foreground">
                    {formatIssueTimestamp(locale, item.createdAt, timezone)}
                  </time>
                </div>
                <IssueMarkdownPreview
                  source={item.body}
                  codeTheme={codeTheme}
                  className="rounded-[1.25rem] border border-border-subtle/70 bg-field/35 p-4"
                />
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionHeading({
  icon,
  title,
  hint,
}: Readonly<{
  icon: ReactNode;
  title: string;
  hint?: string;
}>) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
      </div>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function IssueRelationsSection({
  icon,
  title,
  t,
  collapsed,
  onToggleCollapsed,
  emptyMessage,
  items,
  onOpenIssue,
}: Readonly<{
  icon: ReactNode;
  title: string;
  t: (key: "common.open" | "issues.statusClosed") => string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  emptyMessage: string;
  items: NonNullable<IssueDetailsSnapshot["linkedItems"]>;
  onOpenIssue: (reference: IssueRouteReference) => void;
}>) {
  return (
    <section className={sectionClassName}>
      <div className="flex items-center justify-between gap-3">
        <SectionHeading icon={icon} title={title} />
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle bg-field/55 text-muted-foreground transition hover:border-border-strong hover:text-foreground"
          aria-label={`${collapsed ? "Expand" : "Collapse"} ${title}`}
          onClick={onToggleCollapsed}
        >
          <ChevronDown className={cn("h-4 w-4 transition", collapsed ? "-rotate-90" : "rotate-0")} />
        </button>
      </div>
      {collapsed ? null : items.length === 0 ? (
        <div className="px-1 py-2 text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <ScrollArea
          className="max-h-80"
          data-testid={`relations-scroll-${title.toLowerCase().replace(/\s+/g, "-")}`}
          viewportClassName="overscroll-contain scroll-smooth"
        >
          <div className="space-y-2 pr-3">
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                className="w-full rounded-[1.15rem] border border-border-subtle bg-field/45 px-4 py-4 text-left transition hover:border-border-strong hover:bg-field/60"
                onClick={() => onOpenIssue(item.reference)}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {item.relationLabel}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="font-mono text-xs text-muted-foreground">{item.key}</p>
                  </div>
                  <Badge
                    className={cn(
                      "normal-case tracking-normal",
                      getAssignedIssueStateBadgeClassName(item.state),
                    )}
                  >
                    {statusLabel(item.state, t)}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
    </section>
  );
}

function statusLabel(
  value: string,
  t: (key: "common.open" | "issues.statusClosed") => string,
) {
  if (value === "opened") {
    return t("common.open");
  }

  if (value === "closed") {
    return t("issues.statusClosed");
  }

  return value;
}
