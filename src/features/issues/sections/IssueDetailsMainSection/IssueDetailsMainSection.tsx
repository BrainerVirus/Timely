import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.js";
import Link2 from "lucide-react/dist/esm/icons/link-2.js";
import ListTree from "lucide-react/dist/esm/icons/list-tree.js";
import MessageSquare from "lucide-react/dist/esm/icons/message-square.js";
import { useMemo, useState, type ReactNode, useCallback, useEffect, useRef } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { formatIssueTimestamp } from "@/features/issues/lib/issue-date-format";
import { getAssignedIssueStateBadgeClassName } from "@/features/issues/ui/AssignedIssuesBoard/lib/assigned-issue-badge-tone";
import { IssueOriginBadge } from "@/features/issues/ui/IssueOriginBadge/IssueOriginBadge";
import { IssueMarkdownField } from "@/features/issues/ui/IssueMarkdownField/IssueMarkdownField";
import { IssueMarkdownPreview } from "@/features/issues/ui/IssueMarkdownPreview/IssueMarkdownPreview";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/Badge/Badge";
import { Button } from "@/shared/ui/Button/Button";
import { ScrollArea } from "@/shared/ui/ScrollArea/ScrollArea";
import { Skeleton, SkeletonText } from "@/shared/ui/Skeleton/Skeleton";

import type { IssueComposerMode } from "@/features/issues/types/issue-details";
import type {
  IssueCodeTheme,
  IssueDetailsSnapshot,
  IssueRouteReference,
} from "@/shared/types/dashboard";

type I18nTranslate = ReturnType<typeof useI18n>["t"];

interface IssueDetailsMainSectionProps {
  details: IssueDetailsSnapshot;
  timezone: string;
  codeTheme: IssueCodeTheme;
  composerMode: IssueComposerMode;
  commentBody: string;
  busy: boolean;
  isHydrating?: boolean;
  activityItems: IssueDetailsSnapshot["activity"];
  activityHasMore: boolean;
  activityLoadingMore: boolean;
  onLoadMoreActivity: () => Promise<void>;
  currentUsername?: string;
  onComposerModeChange: (mode: IssueComposerMode) => void;
  onCommentBodyChange: (value: string) => void;
  onSubmitComment: () => Promise<void>;
  onToggleIssueState: () => Promise<void>;
  onOpenIssue: (reference: IssueRouteReference) => void;
  onPrefetchLinkedIssue?: (reference: IssueRouteReference) => void;
  onEditComment?: (noteId: string, body: string) => Promise<void>;
  onDeleteComment?: (noteId: string) => Promise<void>;
  onSaveDescription?: (body: string) => Promise<void>;
  descriptionEditing?: boolean;
  descriptionDraft?: string;
  descriptionComposerMode?: IssueComposerMode;
  onDescriptionDraftChange?: (value: string) => void;
  onDescriptionComposerModeChange?: (mode: IssueComposerMode) => void;
  onCancelDescriptionEdit?: () => void;
}

const sectionClassName = "space-y-4 border-t border-border-subtle/70 pt-6";
const DESCRIPTION_COLLAPSED_HEIGHT = 480;
const ACTIVITY_COLLAPSED_HEIGHT = 544;

export function IssueDetailsMainSection({
  details,
  timezone,
  codeTheme,
  composerMode,
  commentBody,
  busy,
  isHydrating = false,
  activityItems,
  activityHasMore,
  activityLoadingMore,
  onLoadMoreActivity,
  currentUsername,
  onComposerModeChange,
  onCommentBodyChange,
  onSubmitComment,
  onToggleIssueState,
  onOpenIssue,
  onPrefetchLinkedIssue,
  onEditComment,
  onDeleteComment,
  onSaveDescription,
  descriptionEditing = false,
  descriptionDraft = "",
  descriptionComposerMode = "write",
  onDescriptionDraftChange = () => {},
  onDescriptionComposerModeChange = () => {},
  onCancelDescriptionEdit = () => {},
}: Readonly<IssueDetailsMainSectionProps>) {
  const { locale, t } = useI18n();
  const [linkedItemsCollapsed, setLinkedItemsCollapsed] = useState(false);
  const [childItemsCollapsed, setChildItemsCollapsed] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [editingMode, setEditingMode] = useState<IssueComposerMode>("write");
  const [descriptionAnimating, setDescriptionAnimating] = useState(false);
  const [descriptionMaxHeight, setDescriptionMaxHeight] = useState<number | null>(
    DESCRIPTION_COLLAPSED_HEIGHT,
  );
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [activityAnimating, setActivityAnimating] = useState(false);
  const [activityMaxHeight, setActivityMaxHeight] = useState<number | null>(
    ACTIVITY_COLLAPSED_HEIGHT,
  );
  const descriptionContainerRef = useRef<HTMLDivElement | null>(null);
  const activityScrollRef = useRef<HTMLDivElement | null>(null);
  const activitySentinelRef = useRef<HTMLDivElement | null>(null);
  const [activityOverflowing, setActivityOverflowing] = useState(false);
  const [activityNeedsExpansion, setActivityNeedsExpansion] = useState(false);
  const activity = useMemo(
    () => [...activityItems].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [activityItems],
  );

  const descriptionMissing = details.description === undefined;
  const activityMissing = activity.length === 0 && isHydrating;
  const shouldClampDescription =
    !descriptionMissing && !descriptionEditing && (details.description?.trim().length ?? 0) > 600;
  const syncActivityOverflow = useCallback(() => {
    const target = activityScrollRef.current;
    if (!target) {
      setActivityOverflowing(false);
      setActivityNeedsExpansion(false);
      return;
    }
    setActivityOverflowing(target.scrollHeight > target.clientHeight + 1);
    setActivityNeedsExpansion(target.scrollHeight > ACTIVITY_COLLAPSED_HEIGHT + 1);
  }, []);

  useEffect(() => {
    syncActivityOverflow();
    const target = activityScrollRef.current;
    if (!target) {
      return;
    }
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => syncActivityOverflow());
    observer.observe(target);
    return () => observer.disconnect();
  }, [activity.length, activityLoadingMore, syncActivityOverflow]);

  useEffect(() => {
    if (!activityHasMore || activityLoadingMore) {
      return;
    }

    const sentinel = activitySentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting);
        if (!isVisible || activityLoadingMore) {
          return;
        }
        void onLoadMoreActivity();
      },
      {
        root: activityExpanded ? null : activityScrollRef.current,
        rootMargin: "120px 0px",
      },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activityExpanded, activityHasMore, activityLoadingMore, onLoadMoreActivity, activity.length]);

  useEffect(() => {
    if (activityExpanded && !activityNeedsExpansion && !activityAnimating) {
      setActivityExpanded(false);
      setActivityMaxHeight(ACTIVITY_COLLAPSED_HEIGHT);
    }
  }, [activityAnimating, activityExpanded, activityNeedsExpansion]);

  useEffect(() => {
    if (!shouldClampDescription) {
      setDescriptionMaxHeight(null);
      setDescriptionExpanded(false);
      setDescriptionAnimating(false);
      return;
    }
    if (!descriptionExpanded) {
      setDescriptionMaxHeight(DESCRIPTION_COLLAPSED_HEIGHT);
    }
  }, [shouldClampDescription, descriptionExpanded]);

  const toggleDescriptionExpanded = useCallback(() => {
    const container = descriptionContainerRef.current;
    if (!container) {
      setDescriptionExpanded((current) => !current);
      return;
    }

    const expandedHeight = container.scrollHeight;
    if (descriptionExpanded) {
      setDescriptionAnimating(true);
      setDescriptionMaxHeight(expandedHeight);
      requestAnimationFrame(() => {
        setDescriptionExpanded(false);
        setDescriptionMaxHeight(DESCRIPTION_COLLAPSED_HEIGHT);
      });
      return;
    }

    setDescriptionAnimating(true);
    setDescriptionExpanded(true);
    setDescriptionMaxHeight(DESCRIPTION_COLLAPSED_HEIGHT);
    requestAnimationFrame(() => {
      setDescriptionMaxHeight(expandedHeight);
    });
  }, [descriptionExpanded]);

  const toggleActivityExpanded = useCallback(() => {
    const container = activityScrollRef.current;
    if (!container) {
      setActivityExpanded((current) => !current);
      return;
    }

    const expandedHeight = container.scrollHeight;
    if (activityExpanded) {
      setActivityAnimating(true);
      setActivityMaxHeight(expandedHeight);
      requestAnimationFrame(() => {
        setActivityExpanded(false);
        setActivityMaxHeight(ACTIVITY_COLLAPSED_HEIGHT);
      });
      return;
    }

    setActivityAnimating(true);
    setActivityExpanded(true);
    setActivityMaxHeight(ACTIVITY_COLLAPSED_HEIGHT);
    requestAnimationFrame(() => {
      setActivityMaxHeight(expandedHeight);
    });
  }, [activityExpanded]);
  const showActivityExpandControl =
    activity.length > 0 && (activityNeedsExpansion || activityExpanded);

  let descriptionBody: ReactNode;
  if (descriptionMissing && isHydrating) {
    descriptionBody = (
      <div data-testid="issue-description-skeleton" aria-hidden="true">
        <SkeletonText lines={5} className="space-y-3" lineClassName="h-3" />
      </div>
    );
  } else if (descriptionEditing && onSaveDescription) {
    descriptionBody = (
      <div className="space-y-3">
        <IssueMarkdownField
          value={descriptionDraft}
          onChange={onDescriptionDraftChange}
          codeTheme={codeTheme}
          mode={descriptionComposerMode}
          onModeChange={onDescriptionComposerModeChange}
          disabled={busy}
          placeholder={t("issues.descriptionPlaceholder")}
          className="border-border-subtle/80"
          height={360}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="soft"
            disabled={busy}
            onClick={() => {
              void (async () => {
                try {
                  await onSaveDescription(descriptionDraft);
                } catch {
                  // Parent shows error toast and may rethrow.
                }
              })();
            }}
          >
            {t("issues.saveDescription")}
          </Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={onCancelDescriptionEdit}>
            {t("issues.cancelDescriptionEdit")}
          </Button>
        </div>
      </div>
    );
  } else {
    descriptionBody = (
      <IssueMarkdownPreview
        source={details.description ?? ""}
        codeTheme={codeTheme}
        className="min-h-0 px-1 py-0"
        presentation="plain"
      />
    );
  }

  return (
    <div className="space-y-8">
      <section>
        {shouldClampDescription ? (
          <div className="space-y-3">
            <div
              ref={descriptionContainerRef}
              className={cn(
                "relative overflow-hidden transition-[max-height] duration-300 ease-out",
                descriptionExpanded && !descriptionAnimating
                  ? "overflow-visible"
                  : "overflow-hidden",
              )}
              style={{
                maxHeight: descriptionMaxHeight == null ? undefined : `${descriptionMaxHeight}px`,
              }}
              onTransitionEnd={(event) => {
                if (event.propertyName !== "max-height") {
                  return;
                }
                setDescriptionAnimating(false);
                if (descriptionExpanded) {
                  setDescriptionMaxHeight(null);
                } else {
                  setDescriptionMaxHeight(DESCRIPTION_COLLAPSED_HEIGHT);
                }
              }}
            >
              {descriptionBody}
              {!descriptionExpanded ? <BottomFade className="h-18" /> : null}
            </div>
            <div className="flex justify-center">
              <Button
                type="button"
                variant="ghost"
                className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
                onClick={toggleDescriptionExpanded}
              >
                {descriptionExpanded ? t("common.showLess") : t("common.showMore")}
              </Button>
            </div>
          </div>
        ) : (
          descriptionBody
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
        onPrefetchIssue={onPrefetchLinkedIssue}
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
        onPrefetchIssue={onPrefetchLinkedIssue}
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
            titleBadge={<Badge className="tracking-normal normal-case">{activity.length}</Badge>}
          />
          {showActivityExpandControl ? (
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={toggleActivityExpanded}
            >
              {activityExpanded ? t("issues.collapseActivity") : t("issues.expandActivity")}
            </Button>
          ) : null}
        </div>

        {activityMissing ? (
          <div className="space-y-4" data-testid="issue-activity-skeleton" aria-hidden="true">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : activity.length === 0 ? (
          <div className="px-1 py-2 text-sm text-muted-foreground">{t("issues.activityEmpty")}</div>
        ) : (
          <div className="relative min-h-0">
            <div
              data-testid="activity-scroll-root"
              data-issue-activity-scope
              className={cn(
                "min-h-0 overflow-hidden transition-[max-height,height] duration-300 ease-out",
                activityExpanded && !activityAnimating && "overflow-visible",
              )}
              style={
                activityMaxHeight == null
                  ? undefined
                  : {
                      maxHeight: `${activityMaxHeight}px`,
                      height: `${activityMaxHeight}px`,
                    }
              }
              onTransitionEnd={(event) => {
                if (event.propertyName !== "max-height" && event.propertyName !== "height") {
                  return;
                }
                setActivityAnimating(false);
                if (activityExpanded) {
                  setActivityMaxHeight(null);
                } else {
                  setActivityMaxHeight(ACTIVITY_COLLAPSED_HEIGHT);
                }
              }}
            >
              <ScrollArea
                type="hover"
                className={cn("min-h-0", activityMaxHeight == null ? "w-full" : "h-full")}
                viewportRef={activityScrollRef}
                viewportClassName="pr-1 overscroll-contain scroll-smooth"
                viewportProps={{
                  "data-testid": "activity-scroll-viewport",
                }}
              >
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
                              "tracking-normal normal-case",
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
                            <div className="flex items-center gap-3">
                              {onEditComment ? (
                                <button
                                  type="button"
                                  className="cursor-pointer rounded-md px-1.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted/40 hover:text-foreground hover:underline hover:underline-offset-4 disabled:cursor-not-allowed disabled:opacity-60"
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
                                  className="cursor-pointer rounded-md px-1.5 py-0.5 text-xs font-medium text-destructive/80 transition-colors duration-200 hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
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
                      ) : item.system ? (
                        <IssueActivitySystemBody body={item.body} codeTheme={codeTheme} />
                      ) : (
                        <div className="rounded-[1.25rem] border border-border-subtle/70 bg-field/35 p-4">
                          <IssueMarkdownPreview
                            source={item.body}
                            codeTheme={codeTheme}
                            className="min-h-0 p-0"
                            presentation="plain"
                          />
                        </div>
                      )}
                    </article>
                  );
                })}
                {activityLoadingMore ? (
                  <div className="py-4">
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : null}
                <div ref={activitySentinelRef} className="h-px w-full" aria-hidden />
              </ScrollArea>
            </div>
            {!activityExpanded && activityOverflowing ? <BottomFade className="h-16" /> : null}
          </div>
        )}
      </section>
    </div>
  );
}

function IssueActivitySystemBody({
  body,
  codeTheme,
}: Readonly<{
  body: string;
  codeTheme: IssueCodeTheme;
}>) {
  return (
    <div
      data-issue-activity-system="true"
      className="rounded-xl border border-border-subtle/40 bg-field/20 px-3 py-2"
    >
      <IssueMarkdownPreview
        source={body}
        codeTheme={codeTheme}
        presentation="plain"
        className="min-h-0 p-0 text-sm leading-snug text-muted-foreground"
      />
    </div>
  );
}

function SectionHeading({
  icon,
  title,
  hint,
  titleBadge,
}: Readonly<{
  icon: ReactNode;
  title: string;
  hint?: string;
  titleBadge?: ReactNode;
}>) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
        {titleBadge}
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
  onPrefetchIssue,
}: Readonly<{
  icon: ReactNode;
  title: string;
  t: I18nTranslate;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  emptyMessage: string;
  items: NonNullable<IssueDetailsSnapshot["linkedItems"]>;
  onOpenIssue: (reference: IssueRouteReference) => void;
  onPrefetchIssue?: (reference: IssueRouteReference) => void;
}>) {
  const scrollTestId = relationsScrollTestId(title);

  return (
    <section className={sectionClassName}>
      <div className="flex items-center justify-between gap-3">
        <SectionHeading
          icon={icon}
          title={title}
          titleBadge={<Badge className="tracking-normal normal-case">{items.length}</Badge>}
        />
        <button
          type="button"
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border-subtle bg-field/55 text-muted-foreground transition-colors duration-200 hover:border-border-strong hover:text-foreground"
          aria-expanded={!collapsed}
          aria-controls={scrollTestId}
          aria-label={`${collapsed ? "Expand" : "Collapse"} ${title}`}
          onClick={onToggleCollapsed}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200 ease-out",
              collapsed ? "-rotate-90" : "rotate-0",
            )}
          />
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
          {items.length === 0 ? (
            <div id={scrollTestId} className="min-h-0 px-1 py-2 text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            <div className="relative min-h-0">
              <ScrollArea
                type="hover"
                className="max-h-[27rem] min-h-0 w-full"
                viewportClassName="max-h-[27rem] min-h-0 pr-1 overscroll-contain scroll-smooth"
                viewportProps={{
                  id: scrollTestId,
                  "data-testid": scrollTestId,
                }}
              >
                <div className="space-y-2 pr-2 pb-1">
                  {items.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className="w-full cursor-pointer rounded-[1.15rem] border border-border-subtle bg-field/45 px-4 py-4 text-left transition-colors duration-200 hover:border-border-strong hover:bg-field/60"
                      onMouseEnter={() => onPrefetchIssue?.(item.reference)}
                      onFocus={() => onPrefetchIssue?.(item.reference)}
                      onClick={() => onOpenIssue(item.reference)}
                    >
                      <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                        {item.relationLabel}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{item.title}</p>
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-xs text-muted-foreground">{item.key}</p>
                            <IssueOriginBadge provider={item.reference.provider} />
                          </div>
                        </div>
                        <Badge
                          className={cn(
                            "tracking-normal normal-case",
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
              {items.length > 3 ? <BottomFade className="h-16" /> : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function statusLabel(value: string, t: I18nTranslate) {
  if (value === "opened") {
    return t("common.open");
  }

  if (value === "closed") {
    return t("issues.statusClosed");
  }

  return value;
}

function BottomFade({ className }: Readonly<{ className?: string }>) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-1 bg-linear-to-t from-page-canvas/95 from-10% via-page-canvas/40 via-55% to-transparent",
        className,
      )}
    />
  );
}
