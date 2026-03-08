import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.js";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Relative time formatter                                            */
/* ------------------------------------------------------------------ */

function formatRelativeTime(date: Date | null): string {
  if (!date) return "never";

  const now = Date.now();
  const diffMs = now - date.getTime();

  if (diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

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
  return (
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between border-b-2 border-border/50 bg-background/80 px-6 backdrop-blur-sm">
      {/* Page title */}
      <h1 className="font-display text-lg font-semibold text-foreground">
        {title}
      </h1>

      {/* Sync cluster */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          Last synced: {formatRelativeTime(lastSyncedAt)}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={onSync}
          disabled={syncing}
          className="gap-1.5"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", syncing && "animate-spin")}
          />
          <span>Sync</span>
        </Button>
      </div>
    </header>
  );
}
