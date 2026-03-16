import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.js";
import { Button } from "@/components/ui/button";
import { buildInfo } from "@/lib/build-info";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  TopBar                                                             */
/* ------------------------------------------------------------------ */

interface TopBarProps {
  title: string;
  lastSyncedAt: Date | null;
  syncing: boolean;
  onSync: () => void;
}

export function TopBar({ title, lastSyncedAt, syncing, onSync }: TopBarProps) {
  const { formatRelativeTime, t } = useI18n();

  return (
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between border-b-2 border-[color:var(--color-border-subtle)] bg-linear-to-b from-[color:var(--color-app-bar)]/96 to-[color:var(--color-page-header)]/94 px-6 shadow-[var(--shadow-shell)] backdrop-blur-md">
      {/* Page title */}
      <h1 className="font-display text-lg font-semibold text-foreground">{title}</h1>

      {/* Sync cluster */}
      <div className="flex items-center gap-3">
        {buildInfo.prereleaseLabel ? (
          <span className="rounded-full border border-primary/30 bg-primary/12 px-2.5 py-1 text-[0.65rem] font-bold tracking-[0.16em] text-primary uppercase">
            Beta {buildInfo.prereleaseLabel}
          </span>
        ) : null}
        <span className="text-xs text-muted-foreground">
          {t("topBar.lastSynced", { value: formatRelativeTime(lastSyncedAt) })}
        </span>

        <Button variant="ghost" size="sm" onClick={onSync} disabled={syncing} className="gap-1.5">
          <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
          <span>{t("topBar.sync")}</span>
        </Button>
      </div>
    </header>
  );
}
