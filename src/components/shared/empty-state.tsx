import { FoxMascot, type FoxMood } from "@/components/shared/fox-mascot";

interface EmptyStateProps {
  title: string;
  description?: string;
  mood?: FoxMood;
  foxSize?: number;
  action?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  mood = "idle",
  foxSize = 100,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <FoxMascot mood={mood} size={foxSize} />
      <div className="text-center">
        <p className="font-display text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
