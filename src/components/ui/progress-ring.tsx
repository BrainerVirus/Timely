import { animate, m, useMotionValue, useTransform } from "motion/react";
import { useEffect, useId } from "react";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

function formatAnimatedValue(v: number, format: string): string {
  if (format === "decimal") {
    return v.toFixed(1);
  }
  const totalMinutes = Math.round(v * 60);
  const h = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (mins === 0) return `${h}h`;
  return `${h}h${mins}m`;
}

export function ProgressRing({
  value,
  max,
  size = 120,
  strokeWidth = 10,
  className,
}: ProgressRingProps) {
  const gradientId = useId();
  const timeFormat = useAppStore((s) => s.timeFormat);
  const ratio = Math.min(value / max, 1);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const motionValue = useMotionValue(0);
  const offset = useTransform(motionValue, (v) => circumference - circumference * v);

  const displayValue = useMotionValue(0);
  const displayText = useTransform(displayValue, (v) => formatAnimatedValue(v, timeFormat));

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
      {/* Clay container circle behind the SVG */}
      <div
        className="absolute rounded-full border-2 border-border bg-card shadow-[var(--shadow-clay)]"
        style={{ width: size + 8, height: size + 8 }}
      />
      <svg
        className="relative -rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        {/* Track ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          className="fill-none stroke-muted"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress ring */}
        <m.circle
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
            <stop offset="100%" stopColor="var(--color-secondary)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <m.div className="font-display text-3xl font-bold text-foreground">{displayText}</m.div>
        </div>
      </div>
    </div>
  );
}
