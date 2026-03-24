import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import { Button } from "@/shared/components/Button/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/Dialog/Dialog";
import { buildInfo } from "@/core/services/BuildInfo/build-info";
import { useI18n } from "@/core/services/I18nService/i18n";
import { cn } from "@/shared/utils/utils";

import type { ReleaseHighlightsContent } from "@/core/services/ReleaseHighlights/release-highlights";

interface ReleaseHighlightsDialogProps {
  open: boolean;
  content: ReleaseHighlightsContent;
  onOpenChange: (open: boolean) => void;
  onAcknowledge: () => void;
}

export function ReleaseHighlightsDialog({
  open,
  content,
  onOpenChange,
  onAcknowledge,
}: Readonly<ReleaseHighlightsDialogProps>) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby="release-highlights-description"
        className="max-w-xl gap-0 overflow-hidden p-0"
        closeButtonClassName="top-2.5 right-5"
      >
        <DialogHeader className="border-b-2 border-border-subtle px-5 py-3.5 pr-16 text-left">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <DialogTitle className="font-display text-base font-semibold text-foreground">
              {t("releaseHighlights.dialogTitle")}
            </DialogTitle>
          </div>
          <DialogDescription id="release-highlights-description" className="sr-only">
            {t("releaseHighlights.dialogDescription", { version: buildInfo.appVersion })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 bg-field px-5 py-4">
          <div className="flex items-end justify-between gap-4 border-b-2 border-border-subtle pb-4">
            <div className="min-w-0">
              <p className="text-[0.68rem] font-bold tracking-[0.18em] text-foreground/68 uppercase">
                {content.badge}
              </p>
              <p className="mt-2 font-display text-xl font-semibold text-foreground">
                {content.title}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-lg font-semibold text-foreground">
                v{buildInfo.appVersion}
              </p>
            </div>
          </div>

          <div className={cn("rounded-xl border-2 p-4", "border-primary/20 bg-primary/8")}>
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{content.accent}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{content.intro}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {content.bullets.map((bullet) => (
              <div key={bullet} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <p className="text-sm leading-relaxed text-foreground/88">{bullet}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-end border-t-2 border-border-subtle pt-4">
            <Button onClick={onAcknowledge}>{t("releaseHighlights.gotIt")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
