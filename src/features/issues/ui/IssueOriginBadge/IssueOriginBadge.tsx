import { cn } from "@/shared/lib/utils";

interface IssueOriginBadgeProps {
  provider: string;
  className?: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  gitlab: "GitLab",
  youtrack: "YouTrack",
};

export function IssueOriginBadge({ provider, className }: Readonly<IssueOriginBadgeProps>) {
  const key = provider.toLowerCase();
  const label = PROVIDER_LABELS[key] ?? provider;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border-subtle bg-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}
