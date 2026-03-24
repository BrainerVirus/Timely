import { useMotionSettings } from "@/core/services/MotionService/motion";
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
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();
  const emptyProps = {
    title,
    description,
    mood,
    variant,
    allowDecorativeAnimation,
    windowVisibility,
  };

  if (centered) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <EmptyState {...emptyProps} />
      </div>
    );
  }

  return <EmptyState {...emptyProps} />;
}
