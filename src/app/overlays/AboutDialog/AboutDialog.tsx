import Info from "lucide-react/dist/esm/icons/info.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import { buildInfo } from "@/app/bootstrap/BuildInfo/build-info";
import { useI18n } from "@/app/providers/I18nService/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/Dialog/Dialog";

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutDialog({ open, onOpenChange }: Readonly<AboutDialogProps>) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md gap-0 overflow-hidden p-0"
        closeButtonClassName="top-2.5 right-5"
        closeButtonAriaLabel={t("ui.close")}
      >
        <DialogHeader className="border-b-2 border-border-subtle px-5 py-3.5 pr-16 text-left">
          <div className="flex items-center gap-2.5">
            <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
            <DialogTitle className="font-display text-base font-semibold text-foreground">
              {t("about.title")}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 bg-field px-5 py-4">
          <div className="flex items-end justify-between gap-4 border-b-2 border-border-subtle pb-4">
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold text-foreground">{t("app.name")}</p>
              <p className="text-xs text-muted-foreground">{t("about.versionLabel")}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-lg font-semibold text-foreground">
                v{buildInfo.appVersion}
              </p>
              <p className="text-xs text-muted-foreground">{t("about.desktopBuild")}</p>
            </div>
          </div>

          {buildInfo.prereleaseLabel ? (
            <div className="flex items-start gap-3 rounded-xl border-2 border-primary/20 bg-primary/8 p-4">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {t("about.prereleaseTitle")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("about.prereleaseDescription", { label: buildInfo.prereleaseLabel })}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
