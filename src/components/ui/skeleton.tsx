import { cn } from "@/lib/utils";
import { useMotionSettings } from "@/lib/motion";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  const { allowLoopingAnimation } = useMotionSettings();

  return (
    <div
      data-slot="skeleton"
      className={cn(
        allowLoopingAnimation ? "animate-pulse rounded-xl bg-muted" : "rounded-xl bg-muted",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
