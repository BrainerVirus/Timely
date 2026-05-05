import { useEffect, useMemo, useState } from "react";
import { listProviderConnections } from "@/app/desktop/TauriService/tauri";
import { createProviderFilterOptions } from "@/features/issues/ui/AssignedIssuesBoard/internal/use-assigned-issues-board-controller.lib";

import type { ProviderConnection } from "@/shared/types/dashboard";

export function useProviderFilterOptions(
  listProviders: () => Promise<ProviderConnection[]> = listProviderConnections,
) {
  const [configuredProviders, setConfiguredProviders] = useState<ProviderConnection[]>([]);

  useEffect(() => {
    let cancelled = false;
    void listProviders()
      .then((providers) => {
        if (!cancelled) setConfiguredProviders(providers);
      })
      .catch(() => {
        if (!cancelled) setConfiguredProviders([]);
      });
    return () => {
      cancelled = true;
    };
  }, [listProviders]);

  return useMemo(() => createProviderFilterOptions(configuredProviders), [configuredProviders]);
}
