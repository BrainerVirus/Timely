import { useMemo } from "react";
import { useI18n } from "@/app/providers/I18nService/i18n";

export function useNormalizedSnapshotError(rawErrorMessage: string | null): string | null {
  const { t } = useI18n();

  return useMemo(() => {
    if (!rawErrorMessage) {
      return null;
    }

    if (/No primary GitLab connection found\.?/i.test(rawErrorMessage)) {
      return t("worklog.gitlabConnectionRequired");
    }

    return rawErrorMessage;
  }, [rawErrorMessage, t]);
}
