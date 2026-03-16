import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import Archive from "lucide-react/dist/esm/icons/archive.js";
import Award from "lucide-react/dist/esm/icons/award.js";
import Crosshair from "lucide-react/dist/esm/icons/crosshair.js";
import ShoppingBag from "lucide-react/dist/esm/icons/shopping-bag.js";
import { createContext, useContext, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { type PlayContextValue, usePlayProviderValue } from "@/features/play/play-provider-state";
import { buildInfo } from "@/lib/build-info";
import { useI18n } from "@/lib/i18n";

import type { BootstrapPayload } from "@/types/dashboard";

const PlayContext = createContext<PlayContextValue | null>(null);

export function PlayProvider({
  payload,
  children,
}: {
  payload: BootstrapPayload;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const contextValue = usePlayProviderValue(payload, t);

  return <PlayContext.Provider value={contextValue}>{children}</PlayContext.Provider>;
}

export function PlayLayout({ payload }: { payload: BootstrapPayload }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location.pathname });

  if (!buildInfo.playEnabled) {
    return null;
  }

  const tabs = [
    { to: "/play", label: t("common.play"), icon: Award },
    { to: "/play/shop", label: t("play.shopNav"), icon: ShoppingBag },
    { to: "/play/collection", label: t("play.collectionNav"), icon: Archive },
    { to: "/play/missions", label: t("play.missionsNav"), icon: Crosshair },
    { to: "/play/achievements", label: t("play.achievementsNav"), icon: Award },
  ] as const;

  return (
    <PlayProvider payload={payload}>
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {tabs.map(({ to, label, icon: Icon }) => {
            const active = to === "/play" ? location === "/play" : location.startsWith(to);
            return (
              <Button
                key={to}
                type="button"
                variant={active ? "primary" : "ghost"}
                size="sm"
                className="gap-2"
                onClick={() => navigate({ to })}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Button>
            );
          })}
        </div>
        <Outlet />
      </div>
    </PlayProvider>
  );
}

export function usePlayContext() {
  const context = useContext(PlayContext);
  if (!context) {
    throw new Error("usePlayContext must be used within PlayLayout");
  }

  return context;
}
