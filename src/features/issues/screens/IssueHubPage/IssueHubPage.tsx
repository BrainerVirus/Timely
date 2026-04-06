import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left.js";
import ExternalLink from "lucide-react/dist/esm/icons/external-link.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createGitLabIssueNote,
  createGitLabTimelog,
  openExternalUrl,
} from "@/app/desktop/TauriService/tauri";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { IssueMarkdownField } from "@/features/issues/ui/IssueMarkdownField/IssueMarkdownField";
import { shiftDate, toDateInputValue } from "@/shared/lib/date/date";
import { getWeekStartsOnIndex } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/Button/Button";
import { Input } from "@/shared/ui/Input/Input";
import { Label } from "@/shared/ui/Label/Label";
import { PagerControl } from "@/shared/ui/PagerControl/PagerControl";
import {
  type CalendarWeekStartsOn,
  SingleDayPicker,
} from "@/shared/ui/SingleDayPicker/SingleDayPicker";

import type { BootstrapPayload } from "@/shared/types/dashboard";

interface IssueHubPageProps {
  payload: BootstrapPayload;
  issueGid: string;
  onBack: () => void;
  onRefreshBootstrap: () => Promise<void>;
}

export function IssueHubPage({
  payload,
  issueGid,
  onBack,
  onRefreshBootstrap,
}: Readonly<IssueHubPageProps>) {
  const { t, formatDateShort } = useI18n();
  const issue = useMemo(
    () => payload.assignedIssues.find((i) => i.issueGraphqlId === issueGid) ?? null,
    [issueGid, payload.assignedIssues],
  );

  const calendarWeekStartsOn: CalendarWeekStartsOn = getWeekStartsOnIndex(
    payload.schedule.weekStart,
    payload.schedule.timezone,
  );

  const [timeSpent, setTimeSpent] = useState("1h");
  const [spentDate, setSpentDate] = useState(() => new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [summary, setSummary] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!issue) {
      return;
    }
    const now = new Date();
    setTimeSpent("1h");
    setSpentDate(now);
    setVisibleMonth(now);
    setSummary("");
    setNoteBody("");
  }, [issue]);

  const handleSubmitTime = useCallback(async () => {
    if (!issue) return;
    setBusy(true);
    try {
      const ymd = toDateInputValue(spentDate);
      await createGitLabTimelog({
        issueGraphqlId: issue.issueGraphqlId,
        timeSpent: timeSpent.trim(),
        spentAt: `${ymd}T12:00:00Z`,
        summary: summary.trim() || undefined,
      });
      toast.success(t("issues.timeLogged"));
      await onRefreshBootstrap();
    } catch (e) {
      toast.error(t("issues.timeLogFailed"), {
        description: e instanceof Error ? e.message : t("settings.tryAgain"),
      });
    } finally {
      setBusy(false);
    }
  }, [issue, onRefreshBootstrap, spentDate, summary, t, timeSpent]);

  const handleSubmitNote = useCallback(async () => {
    if (!issue || !noteBody.trim()) return;
    setBusy(true);
    try {
      await createGitLabIssueNote({
        issueGraphqlId: issue.issueGraphqlId,
        body: noteBody.trim(),
      });
      toast.success(t("issues.noteAdded"));
      setNoteBody("");
      await onRefreshBootstrap();
    } catch (e) {
      toast.error(t("issues.noteFailed"), {
        description: e instanceof Error ? e.message : t("settings.tryAgain"),
      });
    } finally {
      setBusy(false);
    }
  }, [issue, noteBody, onRefreshBootstrap, t]);

  if (!issue) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <p className="font-display text-lg font-semibold text-foreground">{t("issues.hubNotFound")}</p>
        <p className="text-sm text-muted-foreground">{t("issues.hubNotFoundHint")}</p>
        <Button type="button" variant="soft" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("issues.hubBackToBoard")}
        </Button>
      </div>
    );
  }

  const referenceDate = new Date();

  return (
    <div className="min-h-full space-y-6 bg-page-canvas pb-10">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t("issues.hubBackToBoard")}
        </Button>
      </div>

      <header className="rounded-3xl border-2 border-border-subtle bg-linear-to-br from-panel via-panel-elevated to-panel p-6 shadow-card">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">{issue.title}</h1>
        <p className="mt-2 break-all font-mono text-sm text-muted-foreground">{issue.key}</p>
        {issue.webUrl ? (
          <Button
            type="button"
            variant="soft"
            className="mt-4 gap-2"
            onClick={() => void openExternalUrl(issue.webUrl!)}
          >
            <ExternalLink className="h-4 w-4" />
            {t("issues.openInGitLab")}
          </Button>
        ) : null}
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-4 rounded-3xl border-2 border-border-subtle bg-panel/90 p-5 shadow-clay">
          <h2 className="font-display text-lg font-semibold text-foreground">{t("issues.logTimeSection")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="issue-hub-duration">{t("issues.timeSpent")}</Label>
              <Input
                id="issue-hub-duration"
                value={timeSpent}
                onChange={(e) => setTimeSpent(e.target.value)}
                placeholder="1h30m"
                disabled={busy}
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">{t("issues.spentDate")}</span>
              <div className="flex flex-wrap items-center gap-2">
                <PagerControl
                  label={formatDateShort(spentDate)}
                  scopeLabel={t("common.day")}
                  onPrevious={() => setSpentDate((d) => shiftDate(d, -1))}
                  onCurrent={() => setSpentDate(referenceDate)}
                  onNext={() => setSpentDate((d) => shiftDate(d, 1))}
                  disabled={busy}
                  compact
                />
                <SingleDayPicker
                  open={calendarOpen}
                  onOpenChange={setCalendarOpen}
                  selectedDate={spentDate}
                  visibleMonth={visibleMonth}
                  onSelectDate={(d) => {
                    setSpentDate(d);
                    setVisibleMonth(d);
                  }}
                  onVisibleMonthChange={setVisibleMonth}
                  buttonLabel={t("issues.pickSpentDate")}
                  holidays={[]}
                  weekStartsOn={calendarWeekStartsOn}
                />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="issue-hub-summary">{t("issues.summaryOptional")}</Label>
            <Input
              id="issue-hub-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              disabled={busy}
            />
          </div>
          <Button type="button" className="w-full" disabled={busy} onClick={() => void handleSubmitTime()}>
            {t("issues.submitTime")}
          </Button>
        </section>

        <section className="space-y-3 rounded-3xl border-2 border-border-subtle bg-panel/90 p-5 shadow-clay">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">{t("issues.commentSection")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t("issues.markdownEditorHint")}</p>
          </div>
          <IssueMarkdownField
            value={noteBody}
            onChange={setNoteBody}
            disabled={busy}
            placeholder={t("issues.commentPlaceholder")}
          />
          <Button
            type="button"
            variant="soft"
            className="w-full"
            disabled={busy || !noteBody.trim()}
            onClick={() => void handleSubmitNote()}
          >
            {t("issues.submitComment")}
          </Button>
        </section>
      </div>
    </div>
  );
}
