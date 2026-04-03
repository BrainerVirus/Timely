import { useI18n } from "@/app/providers/I18nService/i18n";
import { usePlayContext } from "@/features/play/screens/PlayLayout/PlayLayout";
import { HabitatPreviewSurface } from "@/features/play/ui/PlayScene/PlayScene";
import { translateRewardName } from "@/features/play/lib/play-i18n";
import { Button } from "@/shared/ui/Button/Button";

export function PlayPreviewPanel({
  onClearAllPreview,
}: Readonly<{ onClearAllPreview?: () => void }>) {
  const { t } = useI18n();
  const {
    spotlightCompanion,
    activeEnvironmentReward,
    activeHabitatScene,
    foxMood,
    previewAccessories,
  } = usePlayContext();

  return (
    <section className="space-y-3 rounded-[1.5rem] border-2 border-border-subtle bg-panel-elevated p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold text-foreground">
            {t("play.previewPanelTitle")}
          </p>
          <p className="text-sm text-muted-foreground">{t("play.previewPanelDescription")}</p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={onClearAllPreview}>
          {t("play.clearPreview")}
        </Button>
      </div>

      <HabitatPreviewSurface
        scene={activeHabitatScene}
        mood={foxMood}
        companionVariant={spotlightCompanion.companionVariant}
        accessories={previewAccessories}
        rewardLabel={
          activeEnvironmentReward
            ? translateRewardName(activeEnvironmentReward, t as (key: string) => string)
            : undefined
        }
        badgeLabel={t("play.previewPanelBadge")}
        mascotAnimationMode="none"
        t={t}
      />
    </section>
  );
}
