import { EmptyState } from "@/shared/components/EmptyState/EmptyState";

interface WorklogStatusStateProps {
  title: string;
  description: string;
  mood?: React.ComponentProps<typeof EmptyState>["mood"];
  centered?: boolean;
  variant?: React.ComponentProps<typeof EmptyState>["variant"];
}

export function WorklogStatusState({
  title,
  description,
  mood = "idle",
  centered = false,
  variant = "card",
}: Readonly<WorklogStatusStateProps>) {
  if (centered) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <EmptyState title={title} description={description} mood={mood} variant={variant} />
      </div>
    );
  }

  return <EmptyState title={title} description={description} mood={mood} variant={variant} />;
}
