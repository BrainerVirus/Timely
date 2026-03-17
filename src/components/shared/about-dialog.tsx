import Info from "lucide-react/dist/esm/icons/info.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildInfo } from "@/lib/build-info";
import { useI18n } from "@/lib/i18n";

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <DialogHeader className="gap-3 border-b-2 border-[color:var(--color-border-subtle)] px-6 py-5 pr-16 text-left">
          <div className="flex items-start gap-3">
            <div className="grid size-11 place-items-center rounded-2xl border-2 border-primary/20 bg-primary/10 text-primary shadow-[var(--shadow-clay)]">
              <Info className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="font-display text-xl font-semibold text-foreground">
                About Timely
              </DialogTitle>
              <DialogDescription>Build details for your installed desktop app.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-2xl border-2 border-[color:var(--color-border-subtle)] bg-[color:var(--color-panel)] p-4 shadow-[var(--shadow-clay)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg font-semibold text-foreground">{t("app.name")}</p>
                <p className="text-xs text-muted-foreground">Version</p>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-semibold text-foreground">
                  v{buildInfo.appVersion}
                </p>
                <p className="text-xs text-muted-foreground">Desktop build</p>
              </div>
            </div>
          </div>

          {buildInfo.prereleaseLabel ? (
            <div className="flex items-start gap-3 rounded-2xl border-2 border-primary/20 bg-primary/8 p-4 shadow-[var(--shadow-clay)]">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Prerelease channel</p>
                <p className="text-xs text-muted-foreground">
                  {`You are running prerelease build ${buildInfo.prereleaseLabel}.`} 
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t-2 border-[color:var(--color-border-subtle)] px-6 py-4" showCloseButton>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("ui.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
