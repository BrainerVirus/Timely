import { getCachedPreferences } from "@/app/bootstrap/PreferencesCache/preferences-cache";
import messagePools from "@/app/state/AppStore/internal/sync-progress-messages.json";

type SyncProvider = "gitlab" | "youtrack";
type SyncLocale = "en" | "es" | "pt";
type SyncMessage = { en: string; es: string; pt: string };

type SyncMessagePools = {
  youtrack: SyncMessage[];
  gitlab: SyncMessage[];
  general: SyncMessage[];
};

export interface SyncToastUsage {
  youtrack: Set<number>;
  gitlab: Set<number>;
  general: Set<number>;
}

const POOLS = messagePools as SyncMessagePools;

export const SYNC_BACKOFF_MS = [30_000, 60_000, 120_000];

export function createSyncToastUsage(): SyncToastUsage {
  return {
    youtrack: new Set<number>(),
    gitlab: new Set<number>(),
    general: new Set<number>(),
  };
}

export function getAutoSyncDelayMessage(provider: SyncProvider | null): string {
  const locale = getLocale();
  if (provider === "youtrack") {
    if (locale === "es")
      return "GitLab listo — YouTrack sigue, el servidor parece estar lento de nuevo...";
    if (locale === "pt")
      return "GitLab concluído — YouTrack continua, o servidor parece estar lento de novo...";
    return "GitLab done — YouTrack still going, server looks slow again...";
  }
  if (provider === "gitlab") {
    if (locale === "es") return "GitLab está siendo lento — son muchos datos, paciencia...";
    if (locale === "pt") return "GitLab está sendo lento — são muitos dados, paciência...";
    return "GitLab is being slow — lots of data, hang in there...";
  }
  if (locale === "es") return "La sincronización está tardando mucho — lo siento por esto...";
  if (locale === "pt") return "A sincronização está demorando muito — desculpa por isso...";
  return "Sync is taking a long time — sorry about this...";
}

export function getSyncDelayMessage(provider: SyncProvider | null, usage: SyncToastUsage): string {
  const locale = getLocale();
  const key = provider ?? "general";
  return pickMessage(POOLS[key], usage[key])[locale];
}

function pickMessage(pool: SyncMessage[], used: Set<number>): SyncMessage {
  const available = pool.map((_, index) => index).filter((index) => !used.has(index));
  const indices = available.length > 0 ? available : pool.map((_, index) => index);
  const index = indices[Math.floor(Math.random() * indices.length)]!;
  used.add(index);
  return pool[index]!;
}

function getLocale(): SyncLocale {
  const prefs = getCachedPreferences();
  if (prefs?.language === "es") return "es";
  if (prefs?.language === "pt") return "pt";
  return "en";
}
