import { loadPlaySnapshot } from "@/lib/tauri";

import type { PlaySnapshot } from "@/types/dashboard";

let cachedSnapshot: PlaySnapshot | null = null;
let cachedError: string | null = null;
let inflightSnapshot: Promise<PlaySnapshot | null> | null = null;

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return String(error);
}

export function getCachedPlaySnapshot() {
  return cachedSnapshot;
}

export function getCachedPlaySnapshotError() {
  return cachedError;
}

export function primePlaySnapshot(snapshot: PlaySnapshot) {
  cachedSnapshot = snapshot;
  cachedError = null;
}

export function resetPlaySnapshotCache() {
  cachedSnapshot = null;
  cachedError = null;
  inflightSnapshot = null;
}

export function prefetchPlaySnapshot(): Promise<PlaySnapshot | null> {
  if (cachedSnapshot) {
    return Promise.resolve(cachedSnapshot);
  }

  if (inflightSnapshot) {
    return inflightSnapshot;
  }

  inflightSnapshot = loadPlaySnapshot()
    .then((snapshot) => {
      primePlaySnapshot(snapshot);
      return snapshot;
    })
    .catch((error) => {
      cachedSnapshot = null;
      cachedError = toErrorMessage(error);
      return null;
    })
    .finally(() => {
      inflightSnapshot = null;
    });

  return inflightSnapshot;
}
