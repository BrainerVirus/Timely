import * as TabsPrimitive from "@radix-ui/react-tabs";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { IssueMarkdownField } from "@/features/issues/ui/IssueMarkdownField/IssueMarkdownField";
import { IssueMarkdownPreview } from "@/features/issues/ui/IssueMarkdownPreview/IssueMarkdownPreview";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/Badge/Badge";
import { Button } from "@/shared/ui/Button/Button";
import { ScrollArea } from "@/shared/ui/ScrollArea/ScrollArea";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/Tabs/Tabs";

import type { IssueComposerMode } from "@/features/issues/types/issue-details";
import type { IssueDetailsSnapshot } from "@/shared/types/dashboard";

interface IssueDetailsMainSectionProps {
  details: IssueDetailsSnapshot;
  composerMode: IssueComposerMode;
  commentBody: string;
  busy: boolean;
  onComposerModeChange: (mode: IssueComposerMode) => void;
  onCommentBodyChange: (value: string) => void;
  onSubmitComment: () => Promise<void>;
}

export function IssueDetailsMainSection({
  details,
  composerMode,
  commentBody,
  busy,
  onComposerModeChange,
  onCommentBodyChange,
  onSubmitComment,
}: Readonly<IssueDetailsMainSectionProps>) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border-2 border-border-subtle bg-linear-to-br from-panel via-panel-elevated to-panel p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              {details.title}
            </h1>
            <p className="font-mono text-sm break-all text-muted-foreground">{details.key}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{details.state}</Badge>
            {details.labels.map((label) => (
              <Badge key={label.id}>{label.label}</Badge>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-3xl border-2 border-border-subtle bg-panel/90 p-5 shadow-clay">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">
            {t("issues.descriptionSection")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("issues.descriptionSectionHint")}</p>
        </div>
        <IssueMarkdownPreview source={details.description ?? ""} />
      </section>

      <section className="space-y-3 rounded-3xl border-2 border-border-subtle bg-panel/90 p-5 shadow-clay">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              {t("issues.activitySection")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("issues.activitySectionHint")}</p>
          </div>
          <Badge>{details.activity.length}</Badge>
        </div>

        {details.activity.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border-subtle bg-field/60 p-6 text-sm text-muted-foreground">
            {t("issues.activityEmpty")}
          </div>
        ) : (
          <ScrollArea className="h-[320px] rounded-2xl border-2 border-border-subtle bg-field/40">
            <div className="space-y-4 p-4">
              {details.activity.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border-2 border-border-subtle bg-panel p-4 shadow-clay"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {item.author?.name ?? t("issues.systemAuthor")}
                      </span>
                      <Badge>
                        {item.system ? t("issues.activitySystem") : t("issues.activityComment")}
                      </Badge>
                    </div>
                    <time className="text-xs text-muted-foreground">{item.createdAt}</time>
                  </div>
                  <IssueMarkdownPreview
                    source={item.body}
                    className="min-h-0 border-transparent bg-transparent p-0"
                  />
                </article>
              ))}
            </div>
          </ScrollArea>
        )}
      </section>

      <section className="space-y-3 rounded-3xl border-2 border-border-subtle bg-panel/90 p-5 shadow-clay">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              {t("issues.commentSection")}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">{t("issues.markdownEditorHint")}</p>
          </div>
          <Badge>{t("issues.quickActionsBadge")}</Badge>
        </div>

        <Tabs
          value={composerMode}
          onValueChange={(value) => onComposerModeChange(value as IssueComposerMode)}
        >
          <TabsList>
            <TabsTrigger value="write">{t("issues.composerModeWrite")}</TabsTrigger>
            <TabsTrigger value="preview">{t("issues.composerModePreview")}</TabsTrigger>
            <TabsTrigger value="split">{t("issues.composerModeSplit")}</TabsTrigger>
          </TabsList>
          <TabsPrimitive.Content value={composerMode} className={cn("mt-3")}>
            <IssueMarkdownField
              value={commentBody}
              onChange={onCommentBodyChange}
              mode={composerMode}
              disabled={busy}
              placeholder={t("issues.commentPlaceholder")}
              height={composerMode === "split" ? 520 : 440}
            />
          </TabsPrimitive.Content>
        </Tabs>

        <p className="text-xs text-muted-foreground">{t("issues.quickActionHint")}</p>
        <Button
          type="button"
          variant="soft"
          className="w-full"
          disabled={busy || !commentBody.trim()}
          onClick={() => void onSubmitComment()}
        >
          {t("issues.submitComment")}
        </Button>
      </section>
    </div>
  );
}
