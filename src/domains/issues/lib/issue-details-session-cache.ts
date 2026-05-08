import { findOptimisticIssueDetails } from "@/domains/issues/lib/issue-details-optimistic";

import type {
  AssignedIssueSnapshot,
  IssueActivityPage,
  IssueDetailsSnapshot,
  IssueRouteReference,
  LoadIssueActivityPageInput,
} from "@/shared/types/dashboard";

type IssueDetailsCacheSource = "prefetch" | "hub";
type IssueDetailsSeedSource = "cache" | "optimistic" | "none";

interface CachedIssueDetailsEntry {
  snapshot: IssueDetailsSnapshot;
  syncVersionAtFetch: number;
  source: IssueDetailsCacheSource;
}

interface IssueDetailsCacheContext {
  syncVersion: number;
  assignedIssues?: readonly AssignedIssueSnapshot[];
  source?: IssueDetailsCacheSource;
  loaders: IssueDetailsLoaders;
}

interface LoadIssueDetailsResult {
  snapshot: IssueDetailsSnapshot;
  source: IssueDetailsCacheSource;
}

interface LoadIssueDetailsOptions {
  ifNoneMatch?: string | null;
  mergeWith?: IssueDetailsSnapshot | null;
}

interface IssueDetailsLoaders {
  loadIssueDetails: (
    provider: string,
    issueId: string,
    options?: LoadIssueDetailsOptions,
  ) => Promise<IssueDetailsSnapshot>;
  loadIssueActivityPage: (input: LoadIssueActivityPageInput) => Promise<IssueActivityPage>;
}

interface IssueDetailsSeed {
  snapshot?: IssueDetailsSnapshot;
  source: IssueDetailsSeedSource;
}

const cache = new Map<string, CachedIssueDetailsEntry>();
const inflight = new Map<string, Promise<LoadIssueDetailsResult>>();
const hoverTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function issueDetailsCacheKey(ref: IssueRouteReference): string {
  return `${ref.provider}:${ref.issueId}`;
}

function isFullDetailsSnapshot(snapshot: IssueDetailsSnapshot): boolean {
  return snapshot.capabilities.composer.modes.includes("preview");
}

function findAssignedIssue(
  assignedIssues: readonly AssignedIssueSnapshot[] | undefined,
  ref: IssueRouteReference,
): AssignedIssueSnapshot | undefined {
  return assignedIssues?.find(
    (issue) => issue.provider === ref.provider && issue.issueId === ref.issueId,
  );
}

function getFullCachedEntry(
  ref: IssueRouteReference,
  syncVersion: number,
): CachedIssueDetailsEntry | undefined {
  const entry = cache.get(issueDetailsCacheKey(ref));
  if (!entry || entry.syncVersionAtFetch !== syncVersion) {
    return undefined;
  }
  if (!isFullDetailsSnapshot(entry.snapshot)) {
    return undefined;
  }
  return entry;
}

function mergeActivityIntoSnapshot(
  snapshot: IssueDetailsSnapshot,
  activityPage: IssueActivityPage,
): IssueDetailsSnapshot {
  return {
    ...snapshot,
    activity: activityPage.items,
    activityHasNextPage: activityPage.hasNextPage,
    activityNextPage: activityPage.nextPage ?? undefined,
  };
}

async function refreshActivityOnly(
  snapshot: IssueDetailsSnapshot,
  loaders: IssueDetailsLoaders,
): Promise<IssueDetailsSnapshot> {
  // `updatedAt` parity only tells us the issue resource metadata matches the
  // assigned-issues cache. Notes can still change independently, so we always
  // refresh the first activity page even when we skip the primary issue GET.
  const activityPage = await loaders.loadIssueActivityPage({
    reference: snapshot.reference,
    page: 1,
  });

  return mergeActivityIntoSnapshot(snapshot, activityPage);
}

function shouldSkipPrimaryIssueReload(
  cachedSnapshot: IssueDetailsSnapshot,
  assignedIssue: AssignedIssueSnapshot | undefined,
): boolean {
  const cachedUpdatedAt = cachedSnapshot.updatedAt?.trim();
  const assignedUpdatedAt = assignedIssue?.updatedAt?.trim();
  return Boolean(cachedUpdatedAt && assignedUpdatedAt && cachedUpdatedAt === assignedUpdatedAt);
}

export function getIssueDetailsSeed(
  ref: IssueRouteReference,
  context: Pick<IssueDetailsCacheContext, "syncVersion" | "assignedIssues">,
): IssueDetailsSeed {
  const cached = getFullCachedEntry(ref, context.syncVersion);
  if (cached) {
    return {
      snapshot: cached.snapshot,
      source: "cache",
    };
  }

  const optimistic = findOptimisticIssueDetails(
    context.assignedIssues ?? [],
    ref.provider,
    ref.issueId,
  );
  if (optimistic) {
    return {
      snapshot: optimistic,
      source: "optimistic",
    };
  }

  return { source: "none" };
}

export function getCachedIssueDetails(
  ref: IssueRouteReference,
  syncVersion: number,
): IssueDetailsSnapshot | undefined {
  return getFullCachedEntry(ref, syncVersion)?.snapshot;
}

export function setCachedIssueDetails(
  ref: IssueRouteReference,
  snapshot: IssueDetailsSnapshot,
  syncVersion: number,
  source: IssueDetailsCacheSource = "hub",
): void {
  cache.set(issueDetailsCacheKey(ref), {
    snapshot,
    syncVersionAtFetch: syncVersion,
    source,
  });
}

export function invalidateIssueDetailsSessionCache(): void {
  cache.clear();
  inflight.clear();
  for (const timer of hoverTimers.values()) {
    clearTimeout(timer);
  }
  hoverTimers.clear();
}

export async function loadOrRevalidateIssueDetails(
  ref: IssueRouteReference,
  context: IssueDetailsCacheContext,
): Promise<LoadIssueDetailsResult> {
  const key = issueDetailsCacheKey(ref);
  const existingInflight = inflight.get(key);
  if (existingInflight) {
    return existingInflight;
  }

  const promise = (async () => {
    const source = context.source ?? "hub";
    const cached = getFullCachedEntry(ref, context.syncVersion);
    const assignedIssue = findAssignedIssue(context.assignedIssues, ref);

    const snapshot =
      cached && shouldSkipPrimaryIssueReload(cached.snapshot, assignedIssue)
        ? await refreshActivityOnly(cached.snapshot, context.loaders)
        : await context.loaders.loadIssueDetails(ref.provider, ref.issueId, {
            ifNoneMatch: cached?.snapshot.issueEtag ?? null,
            mergeWith: cached?.snapshot ?? null,
          });

    setCachedIssueDetails(ref, snapshot, context.syncVersion, source);
    return { snapshot, source };
  })();

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}

export async function prefetchIssueDetailsIntent(
  ref: IssueRouteReference,
  context: Omit<IssueDetailsCacheContext, "source">,
): Promise<void> {
  await loadOrRevalidateIssueDetails(ref, {
    ...context,
    source: "prefetch",
  });
}

export function schedulePrefetchIssueDetailsOnHover(
  ref: IssueRouteReference,
  context: Omit<IssueDetailsCacheContext, "source">,
): () => void {
  const key = issueDetailsCacheKey(ref);
  const prev = hoverTimers.get(key);
  if (prev) {
    clearTimeout(prev);
  }
  const timer = setTimeout(() => {
    hoverTimers.delete(key);
    void prefetchIssueDetailsIntent(ref, context);
  }, 220);
  hoverTimers.set(key, timer);
  return () => {
    clearTimeout(timer);
    hoverTimers.delete(key);
  };
}
