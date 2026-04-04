import { useI18n } from "@/app/providers/I18nService/i18n";
import { useTranslatedQuests } from "@/features/play/lib/play-route-data/play-route-data";
import { usePlayContext } from "@/features/play/screens/PlayLayout/PlayLayout";
import { PlaySectionPage } from "@/features/play/ui/PlayRouteScaffold/PlayRouteScaffold";
import { PlayStatusState } from "@/features/play/ui/PlayStatusState/PlayStatusState";
import { QuestPanel } from "@/features/play/ui/QuestPanel/QuestPanel";

export function PlayMissionsPage() {
  const { t } = useI18n();
  const {
    activatingQuestKey,
    claimingQuestKey,
    activateQuestKey,
    claimQuestKey,
    error,
    loading,
    snapshot,
  } = usePlayContext();
  const quests = useTranslatedQuests();

  if (loading) {
    return <PlayStatusState title={t("app.loadingPlayCenter")} description={t("common.loading")} />;
  }

  if (!snapshot) {
    return (
      <PlayStatusState
        title={t("play.failedToLoadTitle")}
        description={error ?? t("play.failedToLoadDescription")}
        mood="tired"
      />
    );
  }

  return (
    <PlaySectionPage title={t("play.missionsNav")} description={t("play.missionsRouteDescription")}>
      <QuestPanel
        quests={quests.filter((quest) => quest.cadence !== "achievement")}
        activatingQuestKey={activatingQuestKey}
        claimingQuestKey={claimingQuestKey}
        onActivateQuest={activateQuestKey}
        onClaimQuest={claimQuestKey}
      />
    </PlaySectionPage>
  );
}
