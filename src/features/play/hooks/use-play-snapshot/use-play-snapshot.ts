import { useCallback, useEffect, useState } from "react";
import {
  getCachedPlaySnapshot,
  getCachedPlaySnapshotError,
  prefetchPlaySnapshot,
  primePlaySnapshot,
} from "@/features/play/services/play-snapshot-cache/play-snapshot-cache";

import type { SetStateAction } from "react";
import type { PlaySnapshot } from "@/shared/types/dashboard";

export function usePlaySnapshot() {
  const [snapshot, setSnapshot] = useState<PlaySnapshot | null>(() => getCachedPlaySnapshot());
  const [error, setError] = useState<string | null>(() => getCachedPlaySnapshotError());

  useEffect(() => {
    if (snapshot !== null) {
      return;
    }

    let cancelled = false;

    void prefetchPlaySnapshot()
      .then((value) => {
        if (cancelled) {
          return;
        }

        if (value == null) {
          setError(getCachedPlaySnapshotError());
          return;
        }

        setSnapshot(value);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setSnapshot(null);
          setError(getCachedPlaySnapshotError());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [snapshot]);

  const updateSnapshot = useCallback((next: SetStateAction<PlaySnapshot | null>) => {
    setSnapshot((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      if (resolved) {
        primePlaySnapshot(resolved);
      }
      return resolved;
    });
    setError(null);
  }, []);

  return { snapshot, error, setSnapshot: updateSnapshot };
}
