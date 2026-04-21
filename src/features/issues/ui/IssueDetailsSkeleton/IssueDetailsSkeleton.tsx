import { Skeleton, SkeletonText } from "@/shared/ui/Skeleton/Skeleton";

const sectionClassName =
  "rounded-[1.75rem] border-2 border-border-subtle bg-panel/85 p-6 shadow-clay";

export function IssueDetailsSkeleton() {
  return (
    <div
      className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20.5rem] xl:items-start"
      data-testid="issue-hub-skeleton"
      role="status"
      aria-live="polite"
    >
      <div className="space-y-6">
        <div className={sectionClassName}>
          <SkeletonText lines={4} className="space-y-3" lineClassName="h-3" />
        </div>
        <div className={sectionClassName}>
          <Skeleton className="h-5 w-40" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </div>
        <div className={sectionClassName}>
          <Skeleton className="h-5 w-36" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </div>
        <div className={sectionClassName}>
          <Skeleton className="h-5 w-32" />
          <div className="mt-4 space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
        <div className={sectionClassName}>
          <Skeleton className="h-5 w-24" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
      <div className="space-y-5">
        <div className={sectionClassName}>
          <Skeleton className="h-5 w-32" />
          <div className="mt-5 space-y-4">
            <Skeleton className="h-4 w-20" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-14" />
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
        <div className={sectionClassName}>
          <Skeleton className="h-5 w-28" />
          <div className="mt-5 space-y-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
