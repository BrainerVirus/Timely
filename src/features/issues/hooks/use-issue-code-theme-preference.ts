import { useEffect, useState } from "react";
import { getAppPreferencesCached } from "@/app/bootstrap/PreferencesCache/preferences-cache";
import { listenAppPreferencesChanged } from "@/app/desktop/TauriService/tauri";
import {
  DEFAULT_ISSUE_CODE_THEME,
  normalizeIssueCodeTheme,
} from "@/features/issues/lib/issue-code-theme";

import type { IssueCodeTheme } from "@/shared/types/dashboard";

export function useIssueCodeThemePreference() {
  const [issueCodeTheme, setIssueCodeTheme] = useState<IssueCodeTheme>(DEFAULT_ISSUE_CODE_THEME);

  useEffect(() => {
    let active = true;
    let unlisten: (() => void) | undefined;

    void getAppPreferencesCached()
      .then((preferences) => {
        if (active) {
          setIssueCodeTheme(normalizeIssueCodeTheme(preferences.issueCodeTheme));
        }
      })
      .catch(() => {});

    void listenAppPreferencesChanged((preferences) => {
      if (active) {
        setIssueCodeTheme(normalizeIssueCodeTheme(preferences.issueCodeTheme));
      }
    })
      .then((cleanup) => {
        if (!active) {
          cleanup();
          return;
        }

        unlisten = cleanup;
      })
      .catch(() => {});

    return () => {
      active = false;
      unlisten?.();
    };
  }, []);

  return issueCodeTheme;
}
