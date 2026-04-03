import { useI18n } from "@/app/providers/I18nService/i18n";
import {
  RewardArtPreview,
  getRarityBadgeClasses,
  getRewardSlotLabelKey,
  getThemeTagClasses,
  getThemeTagLabelKey,
} from "@/features/play/ui/PlayScene/PlayScene";
import {
  resolveUnlockHint,
  translateRewardDescription,
  translateRewardName,
} from "@/features/play/lib/play-i18n";
import { Button } from "@/shared/ui/Button/Button";

import type { FoxAccessory, FoxMood, FoxVariant } from "@/shared/ui/FoxMascot/FoxMascot";
import type { PlaySnapshot } from "@/shared/types/dashboard";

type RewardCardProps = {
  reward: PlaySnapshot["storeCatalog"][number] | PlaySnapshot["inventory"][number];
  tokens: number;
  previewSelected?: boolean;
  onPreview?: () => void;
  onPurchase?: () => void;
  onEquip?: () => void;
  onUnequip?: () => void;
  pending?: boolean;
  hideRewardNameOnArt?: boolean;
  companionVariant: FoxVariant;
  mood: FoxMood;
  accessories: FoxAccessory[];
};

export function RewardCard({
  reward,
  tokens,
  previewSelected = false,
  onPreview,
  onPurchase,
  onEquip,
  onUnequip,
  pending = false,
  hideRewardNameOnArt = false,
  companionVariant,
  mood,
  accessories,
}: Readonly<RewardCardProps>) {
  const { t } = useI18n();
  const rarity = "rarity" in reward ? reward.rarity : undefined;
  const showEquipAction = Boolean(onEquip);
  const showUnequipAction = Boolean(onUnequip);
  const isLocked = "unlocked" in reward && reward.unlocked === false;
  const translate = t as (key: string) => string;
  const unlockHint = resolveUnlockHint(
    reward as { unlockHintKey?: string; unlockHint?: string },
    translate,
  );
  const description = translateRewardDescription(reward, translate);

  const actionButton = reward.owned ? (
    reward.equipped ? (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending || !showUnequipAction}
        onClick={onUnequip}
      >
        {t("play.unequip")}
      </Button>
    ) : (
      <Button
        type="button"
        size="sm"
        variant="soft"
        disabled={pending || !showEquipAction}
        onClick={onEquip}
      >
        {t("play.equip")}
      </Button>
    )
  ) : (
    <Button
      type="button"
      size="sm"
      disabled={pending || tokens < reward.costTokens || isLocked}
      onClick={onPurchase}
    >
      {isLocked ? t("play.locked") : `${t("play.buy")} - ${reward.costTokens}`}
    </Button>
  );

  return (
    <div className="space-y-3 rounded-[1.5rem] border-2 border-border-subtle bg-panel-elevated p-3 shadow-card">
      <RewardArtPreview
        reward={reward}
        companionVariant={companionVariant}
        mood={mood}
        accessories={accessories}
        showRewardLabel={!hideRewardNameOnArt}
        t={t}
      />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">
            {translateRewardName(reward, translate)}
          </p>
          {rarity ? (
            <span className={getRarityBadgeClasses(rarity)}>
              {t(`play.rarity.${rarity}` as const)}
            </span>
          ) : null}
          {reward.themeTag ? (
            <span className={getThemeTagClasses(reward.themeTag)}>
              {t(getThemeTagLabelKey(reward.themeTag))}
            </span>
          ) : null}
          {reward.owned ? (
            <span className="rounded-full border border-border-subtle bg-field px-2 py-0.5 text-[0.65rem] font-bold text-muted-foreground">
              {reward.equipped ? t("gamification.activeNow") : t("play.owned")}
            </span>
          ) : null}
          {isLocked ? (
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[0.65rem] font-bold text-amber-700">
              {t("play.locked")}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {t(getRewardSlotLabelKey(reward.accessorySlot))}
        </p>
        {description ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {onPreview ? (
          <Button
            type="button"
            size="sm"
            variant={previewSelected ? "primary" : "ghost"}
            onClick={onPreview}
          >
            {previewSelected ? t("play.previewing") : t("play.preview")}
          </Button>
        ) : null}

        {actionButton}
      </div>

      {unlockHint ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{unlockHint}</p>
      ) : null}
    </div>
  );
}
