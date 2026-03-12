import Home from "lucide-react/dist/esm/icons/house.js";
import Clock from "lucide-react/dist/esm/icons/clock.js";
import Gamepad2 from "lucide-react/dist/esm/icons/gamepad-2.js";
import Settings2 from "lucide-react/dist/esm/icons/settings-2.js";
import Radar from "lucide-react/dist/esm/icons/radar.js";
import { m } from "motion/react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { springBouncy } from "@/lib/animations";

import type { LucideIcon } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Navigation items                                                   */
/* ------------------------------------------------------------------ */

interface NavItem {
  icon: LucideIcon;
  labelKey: "common.home" | "common.worklog" | "common.play" | "common.settings";
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: Home, labelKey: "common.home", path: "/" },
  { icon: Clock, labelKey: "common.worklog", path: "/worklog" },
  { icon: Gamepad2, labelKey: "common.play", path: "/play" },
  { icon: Settings2, labelKey: "common.settings", path: "/settings" },
];

/* ------------------------------------------------------------------ */
/*  SyncDot                                                            */
/* ------------------------------------------------------------------ */

type SyncStatus = "fresh" | "stale" | "error" | "syncing";

const STATUS_CLASSES: Record<SyncStatus, string> = {
  fresh: "bg-success",
  stale: "bg-secondary",
  error: "bg-destructive",
  syncing: "bg-primary animate-pulse-soft",
};

interface SyncDotProps {
  status: SyncStatus;
}

export function SyncDot({ status }: SyncDotProps) {
  const { t } = useI18n();

  return (
    <span
      className={cn("block h-2.5 w-2.5 rounded-full", STATUS_CLASSES[status])}
      role="status"
      aria-label={t("sync.statusAria", { status })}
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
  const { t } = useI18n();

  return (
    <nav className="flex h-full w-16 shrink-0 flex-col items-center border-r-2 border-border/50 bg-card py-4">
      {/* Logo mark */}
      <m.div
        className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-primary/25 bg-primary/10 shadow-[1px_1px_0_0_var(--color-border)]"
        whileHover={{ scale: 1.08, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
        transition={springBouncy}
      >
        <Radar className="h-4.5 w-4.5 text-primary" />
      </m.div>

      {/* Nav items */}
      <div className="relative mt-6 flex flex-col items-center gap-1">
        {NAV_ITEMS.map(({ icon: Icon, labelKey, path }) => {
          const isActive = currentPath === path;
          const label = t(labelKey);

          return (
            <Tooltip key={path}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={label}
                  onClick={() => onNavigate(path)}
                  className={cn(
                    "relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border-2 transition-colors active:translate-y-[1px] active:shadow-none",
                    isActive
                      ? "border-primary/80 text-primary-foreground"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground hover:shadow-[1px_1px_0_0_var(--color-border)]",
                  )}
                >
                  {/* Animated background indicator */}
                  {isActive && (
                    <m.span
                      layoutId="nav-active-indicator"
                      className="absolute inset-0 rounded-xl bg-primary shadow-[2px_2px_0_0_var(--color-primary-foreground)]"
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 30,
                        mass: 0.8,
                      }}
                    />
                  )}
                  <Icon className="relative z-10 h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom sync indicator */}
      <div className="pb-2">
        <SyncDot status={syncStatus} />
      </div>
    </nav>
  );
}
