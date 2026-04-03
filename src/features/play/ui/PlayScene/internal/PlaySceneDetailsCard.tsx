import { useI18n } from "@/app/providers/I18nService/i18n";
import {
  getHabitatDescriptionKey,
  getHabitatTitleKey,
  type HabitatSceneKey,
} from "@/features/play/lib/play-scene-helpers/play-scene-helpers";
import { cn } from "@/shared/lib/utils";

import type { ReactNode } from "react";

interface PlaySceneDetailsCardProps {
  compact: boolean;
  badgeLabel?: string;
  rewardLabel?: string;
  title?: string;
  description?: string;
  detailsContent?: ReactNode;
  scene: HabitatSceneKey;
  t: ReturnType<typeof useI18n>["t"];
}

export function PlaySceneDetailsCard({
  compact,
  badgeLabel,
  rewardLabel,
  title,
  description,
  detailsContent,
  scene,
  t,
}: Readonly<PlaySceneDetailsCardProps>) {
  return (
    <div
      className="max-w-sm rounded-[1.35rem] border-2 border-white/35 p-3 text-foreground shadow-card backdrop-blur-md"
      style={{
        backgroundColor: "color-mix(in oklab, var(--color-panel-elevated) 84%, transparent)",
      }}
    >
      {detailsContent ?? (
        <div className="space-y-2">
          {badgeLabel || rewardLabel ? (
            <div className="flex flex-wrap items-center gap-2">
              {badgeLabel ? (
                <span className="rounded-full border border-white/35 bg-white/30 px-2 py-1 text-[0.65rem] font-bold text-foreground/80">
                  {badgeLabel}
                </span>
              ) : null}
              {rewardLabel ? (
                <span className="rounded-full border border-primary/20 bg-primary/14 px-2 py-1 text-[0.65rem] font-bold text-primary">
                  {rewardLabel}
                </span>
              ) : null}
            </div>
          ) : null}
          <p
            className={cn(
              "font-display font-semibold text-foreground",
              compact ? "text-base" : "text-xl",
            )}
          >
            {title ?? t(getHabitatTitleKey(scene))}
          </p>
          <p
            className={cn(
              "text-foreground/80",
              compact ? "text-xs leading-relaxed" : "text-sm leading-relaxed",
            )}
          >
            {description ?? t(getHabitatDescriptionKey(scene))}
          </p>
        </div>
      )}
    </div>
  );
}
