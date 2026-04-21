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
import { Skeleton, SkeletonText } from "@/shared/ui/Skeleton/Skeleton";

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
  isHydrating?: boolean;
  currentUsername?: string;
  onComposerModeChange: (mode: IssueComposerMode) => void;
  onCommentBodyChange: (value: string) => void;
  onSubmitComment: () => Promise<void>;
  onToggleIssueState: () => Promise<void>;
  onOpenIssue: (reference: IssueRouteReference) => void;
  onEditComment?: (noteId: string, body: string) => Promise<void>;
  onDeleteComment?: (noteId: string) => Promise<void>;
}

const sectionClassName = "space-y-4 border-t border-border-subtle/70 pt-6";

export function IssueDetailsMainSection({
  details,
  timezone,
  codeTheme,
  composerMode,
  commentBody,
  busy,
  isHydrating = false,
  currentUsername,
  onComposerModeChange,
  onCommentBodyChange,
  onSubmitComment,
  onToggleIssueState,
  onOpenIssue,
  onEditComment,
  onDeleteComment,
}: Readonly<IssueDetailsMainSectionProps>) {
  const { locale, t } = useI18n();
  const [linkedItemsCollapsed, setLinkedItemsCollapsed] = useState(false);
  const [childItemsCollapsed, setChildItemsCollapsed] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [editingMode, setEditingMode] = useState<IssueComposerMode>("write");
  const activity = useMemo(
    () =>
      [...details.activity].sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      ),
    [details.activity],
  );

  const descriptionMissing = details.description === undefined;
  const activityMissing = activity.length === 0 && isHydrating;

  return (
    <div className="space-y-8">
      <section>
        {descriptionMissing && isHydrating ? (
          <div data-testid="issue-description-skeleton" aria-hidden="true">
            <SkeletonText lines={5} className="space-y-3" lineClassName="h-3" />
          </div>
        ) : (
          <IssueMarkdownPreview
            source={details.description ?? ""}
            codeTheme={codeTheme}
            className="min-h-0 p-0"
            presentation="plain"
          />
        )}
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

        {activityMissing ? (
          <div
            className="space-y-4"
            data-testid="issue-activity-skeleton"
            aria-hidden="true"
          >
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : activity.length === 0 ? (
          <div className="px-1 py-2 text-sm text-muted-foreground">
            {t("issues.activityEmpty")}
          </div>
        ) : (
          <div className="space-y-0">
            {activity.map((item, index) => {
              const viewerForCommentActions = details.viewerUsername ?? currentUsername;
              const canManage =
                !item.system &&
                viewerForCommentActions !== undefined &&
                viewerForCommentActions !== "" &&
                item.author?.username === viewerForCommentActions &&
                (Boolean(onEditComment) || Boolean(onDeleteComment));
              const isEditing = editingNoteId === item.id;

              return (
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
                    <div className="flex items-center gap-3">
                      <time className="text-xs text-muted-foreground">
                        {formatIssueTimestamp(locale, item.createdAt, timezone)}
                      </time>
                      {canManage && !isEditing ? (
                        <div className="flex items-center gap-1">
                          {onEditComment ? (
                            <button
                              type="button"
                              className="text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-60"
                              disabled={busy}
                              onClick={() => {
                                setEditingNoteId(item.id);
                                setEditingBody(item.body);
                                setEditingMode("write");
                              }}
                            >
                              {t("issues.editComment")}
                            </button>
                          ) : null}
                          {onDeleteComment ? (
                            <button
                              type="button"
                              className="text-xs font-medium text-destructive/80 transition hover:text-destructive disabled:opacity-60"
                              disabled={busy}
                              onClick={() => {
                                if (globalThis.confirm(t("issues.confirmDeleteComment"))) {
                                  void onDeleteComment(item.id);
                                }
                              }}
                            >
                              {t("issues.deleteComment")}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {isEditing && onEditComment ? (
                    <div className="space-y-3">
                      <IssueMarkdownField
                        value={editingBody}
                        onChange={setEditingBody}
                        codeTheme={codeTheme}
                        mode={editingMode}
                        onModeChange={setEditingMode}
                        disabled={busy}
                        placeholder={t("issues.commentPlaceholder")}
                        className="border-border-subtle/80"
                        height={320}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="soft"
                          disabled={busy || !editingBody.trim()}
                          onClick={() => {
                            void (async () => {
                              await onEditComment(item.id, editingBody);
                              setEditingNoteId(null);
                              setEditingBody("");
                            })();
                          }}
                        >
                          {t("issues.saveComment")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => {
                            setEditingNoteId(null);
                            setEditingBody("");
                          }}
                        >
                          {t("issues.cancelCommentEdit")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <IssueMarkdownPreview
                      source={item.body}
                      codeTheme={codeTheme}
                      className="rounded-[1.25rem] border border-border-subtle/70 bg-field/35 p-4"
                    />
                  )}
                </article>
              );
            })}
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

const relationsScrollTestId = (title: string) =>
  `relations-scroll-${title.toLowerCase().replaceAll(/\s+/g, "-")}`;

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
  const scrollTestId = relationsScrollTestId(title);

  return (
    <section className={sectionClassName}>
      <div className="flex items-center justify-between gap-3">
        <SectionHeading icon={icon} title={title} />
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle bg-field/55 text-muted-foreground transition hover:border-border-strong hover:text-foreground"
          aria-expanded={!collapsed}
          aria-controls={scrollTestId}
          aria-label={`${collapsed ? "Expand" : "Collapse"} ${title}`}
          onClick={onToggleCollapsed}
        >
          <ChevronDown className={cn("h-4 w-4 transition", collapsed ? "-rotate-90" : "rotate-0")} />
        </button>
      </div>
      <div
        aria-hidden={collapsed}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
          collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div id={scrollTestId} className="min-h-0">
            {items.length === 0 ? (
              <div className="px-1 py-2 text-sm text-muted-foreground">{emptyMessage}</div>
            ) : (
              <div
                data-testid={scrollTestId}
                className="max-h-80 min-h-0 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable] scroll-smooth"
              >
                <div className="space-y-2 pr-2">
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
              </div>
            )}
          </div>
        </div>
      </div>
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
