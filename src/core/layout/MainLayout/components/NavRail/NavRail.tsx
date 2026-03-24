import Clock from "lucide-react/dist/esm/icons/clock.js";
import Gamepad2 from "lucide-react/dist/esm/icons/gamepad-2.js";
import Home from "lucide-react/dist/esm/icons/house.js";
import Settings2 from "lucide-react/dist/esm/icons/settings-2.js";
import { m } from "motion/react";
import { buildInfo } from "@/core/services/BuildInfo/build-info";
import { useI18n } from "@/core/services/I18nService/i18n";
import { FoxMark } from "@/shared/components/FoxMark/FoxMark";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/Tooltip/Tooltip";
import { springBouncy } from "@/shared/utils/animations";
import { cn } from "@/shared/utils/utils";

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
  { icon: Settings2, labelKey: "common.settings", path: "/settings" },
];

const PLAY_NAV_ITEM: NavItem = { icon: Gamepad2, labelKey: "common.play", path: "/play" };

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

function SyncDot({ status }: Readonly<SyncDotProps>) {
  const { t } = useI18n();

  return (
    <output
      className={cn("block h-2.5 w-2.5 rounded-full", STATUS_CLASSES[status])}
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

export function NavRail({ currentPath, onNavigate, syncStatus = "fresh" }: Readonly<NavRailProps>) {
  const { t } = useI18n();
  const navItems = buildInfo.playEnabled
    ? [...NAV_ITEMS.slice(0, 2), PLAY_NAV_ITEM, NAV_ITEMS[2]]
    : NAV_ITEMS;

  return (
    <nav className="flex h-full w-16 shrink-0 flex-col items-center border-r-2 border-border-subtle bg-linear-to-b from-nav-rail via-panel-elevated to-panel py-4 shadow-shell-nav-rail">
      {/* Logo mark */}
      <m.div
        className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-primary/20 bg-panel-elevated shadow-clay"
        whileHover={{ scale: 1.08, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
        transition={springBouncy}
      >
        <FoxMark className="h-4.5 w-4.5 text-primary" />
      </m.div>

      {/* Nav items */}
      <div className="relative mt-6 flex flex-col items-center gap-1">
        {navItems.map(({ icon: Icon, labelKey, path }) => {
          const isActive = currentPath === path;
          const label = t(labelKey);

          return (
            <Tooltip key={path}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={label}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => onNavigate(path)}
                  className={cn(
                    "relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border-2 transition-colors active:translate-y-px active:shadow-none",
                    isActive
                      ? "border-primary/45 text-primary-foreground"
                      : "border-transparent text-muted-foreground hover:border-border-strong hover:bg-panel-elevated hover:text-foreground hover:shadow-clay",
                  )}
                >
                  {/* Animated background indicator */}
                  {isActive && (
                    <m.span
                      layoutId="nav-active-indicator"
                      className="absolute inset-0 rounded-xl bg-primary shadow-button-primary"
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
