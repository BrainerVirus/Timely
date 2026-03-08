import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useId } from "react";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ProgressRing({
  value,
  max,
  size = 120,
  strokeWidth = 8,
  className,
}: ProgressRingProps) {
  const gradientId = useId();
  const ratio = Math.min(value / max, 1);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const motionValue = useMotionValue(0);
  const offset = useTransform(motionValue, (v) => circumference - circumference * v);

  const displayValue = useMotionValue(0);
  const displayText = useTransform(displayValue, (v) => v.toFixed(1));

  useEffect(() => {
    const c1 = animate(motionValue, ratio, {
      type: "spring",
      stiffness: 60,
      damping: 20,
    });
    const c2 = animate(displayValue, value, {
      type: "spring",
      stiffness: 60,
      damping: 20,
    });
    return () => {
      c1.stop();
      c2.stop();
    };
  }, [ratio, value, motionValue, displayValue]);

  return (
    <div className={cn("relative grid place-items-center", className)}>
      <svg
        className="-rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          className="fill-none stroke-muted"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          className="fill-none"
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          style={{ strokeDashoffset: offset }}
        />
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="var(--color-accent)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <motion.div className="font-display text-3xl font-bold text-foreground">
            {displayText}
          </motion.div>
          <div className="mt-0.5 text-xs tracking-wide text-muted-foreground uppercase">hours</div>
        </div>
      </div>
    </div>
  );
}
