import Home from "lucide-react/dist/esm/icons/house.js";
import Clock from "lucide-react/dist/esm/icons/clock.js";
import Gamepad2 from "lucide-react/dist/esm/icons/gamepad-2.js";
import Settings2 from "lucide-react/dist/esm/icons/settings-2.js";
import Radar from "lucide-react/dist/esm/icons/radar.js";
import { cn } from "@/lib/utils";

import type { LucideIcon } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Navigation items                                                   */
/* ------------------------------------------------------------------ */

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Clock, label: "Worklog", path: "/worklog" },
  { icon: Gamepad2, label: "Play", path: "/play" },
  { icon: Settings2, label: "Settings", path: "/settings" },
];

/* ------------------------------------------------------------------ */
/*  SyncDot                                                            */
/* ------------------------------------------------------------------ */

type SyncStatus = "fresh" | "stale" | "error" | "syncing";

const STATUS_CLASSES: Record<SyncStatus, string> = {
  fresh: "bg-accent",
  stale: "bg-secondary",
  error: "bg-destructive",
  syncing: "bg-primary animate-pulse-soft",
};

interface SyncDotProps {
  status: SyncStatus;
}

export function SyncDot({ status }: SyncDotProps) {
  return (
    <span
      className={cn("block h-2.5 w-2.5 rounded-full", STATUS_CLASSES[status])}
      role="status"
      aria-label={`Sync status: ${status}`}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  NavRail                                                            */
/* ------------------------------------------------------------------ */

interface NavRailProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  syncStatus?: SyncStatus;
}

export function NavRail({ currentPath, onNavigate, syncStatus = "fresh" }: NavRailProps) {
  return (
    <nav className="flex h-full w-16 shrink-0 flex-col items-center border-r border-border/50 bg-card py-4">
      {/* Logo mark */}
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
        <Radar className="h-4.5 w-4.5 text-primary" />
      </div>

      {/* Nav items */}
      <div className="mt-6 flex flex-col items-center gap-1">
        {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
          const isActive = currentPath === path;

          return (
            <button
              key={path}
              type="button"
              title={label}
              onClick={() => onNavigate(path)}
              className={cn(
                "group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />

              {/* CSS-only tooltip */}
              <span className="pointer-events-none absolute left-full ml-2 hidden rounded-md bg-foreground px-2 py-1 font-body text-xs text-background shadow-card group-hover:block">
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom sync indicator — consumers pass status via context or props */}
      <div className="pb-2">
        <SyncDot status={syncStatus} />
      </div>
    </nav>
  );
}
