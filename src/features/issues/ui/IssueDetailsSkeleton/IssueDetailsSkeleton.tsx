import { Skeleton, SkeletonText } from "@/shared/ui/Skeleton/Skeleton";

/** Matches `sectionClassName` in IssueDetailsMainSection. */
const borderedSectionClassName = "space-y-4 border-t border-border-subtle/70 pt-6";

/**
 * Matches `inspectorSectionClassName` in IssueDetailsSidebarSection (single Details panel).
 */
const inspectorSectionClassName =
  "rounded-[1.75rem] border-2 border-border-subtle bg-panel/85 p-5 shadow-clay";

/** Matches `inspectorRowClassName` in IssueDetailsSidebarSection. */
const inspectorRowClassName =
  "space-y-2 border-t border-border-subtle/70 pt-4 first:border-t-0 first:pt-0";

function RelationsSectionSkeleton() {
  return (
    <section className={borderedSectionClassName}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
          <Skeleton className="h-7 w-40 max-w-[60%] rounded-md" />
        </div>
        <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
      </div>
      <Skeleton className="h-4 w-[min(100%,20rem)] rounded-md" />
    </section>
  );
}

/**
 * Fallback layout for issue hub loading (boneyard uses this until bones are captured).
 * Mirrors IssueHubPage: full-width header (title + actions), then two-column body.
 */
export function IssueDetailsSkeleton() {
  return (
    <div data-testid="issue-hub-skeleton" role="status" aria-live="polite">
      <div className="space-y-4">
        <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0 space-y-3">
            <Skeleton className="h-10 w-full max-w-2xl rounded-lg" />
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>
            <Skeleton className="h-4 w-72 max-w-full rounded-md" />
          </div>
          <div className="flex items-center justify-self-start gap-3 pt-1 md:justify-self-end">
            <Skeleton className="h-10 min-w-42 rounded-xl" />
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_20.5rem] xl:items-start">
        <div className="space-y-8">
          <section className="space-y-4">
            <Skeleton className="h-7 w-48 max-w-[70%] rounded-md" />
            <SkeletonText lines={4} className="space-y-3" lineClassName="h-3" />
          </section>

          <RelationsSectionSkeleton />
          <RelationsSectionSkeleton />

          <section className={borderedSectionClassName}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
                <Skeleton className="h-7 w-32 rounded-md" />
              </div>
              <Skeleton className="h-4 w-full max-w-xl rounded-md" />
            </div>
            <Skeleton className="h-44 w-full rounded-xl border border-border-subtle/80 bg-field/20" />
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-10 min-w-39 rounded-xl" />
              <Skeleton className="h-10 min-w-39 rounded-xl" />
            </div>
          </section>

          <section className={borderedSectionClassName}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
                  <Skeleton className="h-7 w-28 rounded-md" />
                  <Skeleton className="h-6 w-9 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full max-w-md rounded-md" />
              </div>
              <Skeleton className="h-8 w-24 shrink-0 rounded-md" />
            </div>
            <div className="space-y-4 pt-2">
              <div className="flex gap-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                  <Skeleton className="h-3 w-[75%] max-w-md rounded-md" />
                  <Skeleton className="h-3 w-full max-w-lg rounded-md" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                  <Skeleton className="h-3 w-[66%] max-w-sm rounded-md" />
                  <Skeleton className="h-3 w-full max-w-lg rounded-md" />
                  <Skeleton className="h-14 w-full rounded-lg" />
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className={inspectorSectionClassName}>
          <Skeleton className="h-6 w-24 rounded-md" />
          {/* Row stack spacing mirrors IssueDetailsSidebarSection (mt-5 space-y-4). */}
          <div className="mt-5 space-y-4">
            <div className={inspectorRowClassName}>
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-14 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
            <div className={inspectorRowClassName}>
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
              <Skeleton className="h-4 w-full max-w-56 rounded-md" />
            </div>
            <div className={inspectorRowClassName}>
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
              <Skeleton className="h-4 w-full max-w-[16rem] rounded-md" />
            </div>
            <div className={inspectorRowClassName}>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              </div>
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
