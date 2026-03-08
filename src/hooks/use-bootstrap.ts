import { useCallback, useEffect, useState } from "react";
import { listGitLabConnections, loadBootstrapPayload, updateTrayIcon } from "@/lib/tauri";

import type { BootstrapPayload, ProviderConnection } from "@/types/dashboard";

function computeRemainingHours(payload: BootstrapPayload): number {
  const remaining = payload.today.targetHours - payload.today.loggedHours;
  return Math.max(remaining, 0);
}

export function useBootstrap() {
  const [payload, setPayload] = useState<BootstrapPayload | null>(null);
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadBootstrapPayload(), listGitLabConnections()])
      .then(([p, c]) => {
        setPayload(p);
        setConnections(c);
        updateTrayIcon(computeRemainingHours(p));
      })
      .catch((err) => {
        setError(String(err));
      })
      .finally(() => setLoading(false));
  }, []);

  // Update tray icon every 60s
  useEffect(() => {
    if (!payload) return;

    const interval = setInterval(() => {
      updateTrayIcon(computeRemainingHours(payload));
    }, 60_000);

    return () => clearInterval(interval);
  }, [payload]);

  const refreshConnections = useCallback(async () => {
    const next = await listGitLabConnections();
    setConnections(next);
  }, []);

  const refreshPayload = useCallback(async () => {
    const [p, c] = await Promise.all([loadBootstrapPayload(), listGitLabConnections()]);
    setPayload(p);
    setConnections(c);
    updateTrayIcon(computeRemainingHours(p));
  }, []);

  return {
    payload,
    connections,
    loading,
    error,
    refreshConnections,
    refreshPayload,
  };
}
