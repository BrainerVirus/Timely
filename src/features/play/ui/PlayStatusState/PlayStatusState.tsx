import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";

export function PlayStatusState({
  title,
  description,
  mood = "idle",
}: Readonly<{
  title: string;
  description: string;
  mood?: React.ComponentProps<typeof EmptyState>["mood"];
}>) {
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();

  return (
    <EmptyState
      title={title}
      description={description}
      mood={mood}
      allowDecorativeAnimation={allowDecorativeAnimation}
      windowVisibility={windowVisibility}
    />
  );
}
