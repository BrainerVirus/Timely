import { useMemo } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";
import { withTranslatedQuest, withTranslatedReward } from "@/features/play/lib/play-i18n";
import { usePlayContext } from "@/features/play/screens/PlayLayout/PlayLayout";

export function useTranslatedQuests() {
  const { t } = useI18n();
  const { snapshot } = usePlayContext();

  return useMemo(
    () =>
      (snapshot?.quests ?? []).map((quest) =>
        withTranslatedQuest(quest, t as (key: string) => string),
      ),
    [snapshot?.quests, t],
  );
}

export function useTranslatedInventory() {
  const { t } = useI18n();
  const { snapshot } = usePlayContext();

  return useMemo(
    () =>
      (snapshot?.inventory ?? []).map((reward) =>
        withTranslatedReward(reward, t as (key: string) => string),
      ),
    [snapshot?.inventory, t],
  );
}

export function useTranslatedCatalog() {
  const { t } = useI18n();
  const { snapshot } = usePlayContext();

  return useMemo(
    () =>
      (snapshot?.storeCatalog ?? []).map((reward) =>
        withTranslatedReward(reward, t as (key: string) => string),
      ),
    [snapshot?.storeCatalog, t],
  );
}
