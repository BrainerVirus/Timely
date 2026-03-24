import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import Target from "lucide-react/dist/esm/icons/target.js";
import Timer from "lucide-react/dist/esm/icons/timer.js";
import { m } from "motion/react";
import { useMotionSettings } from "@/core/services/MotionService/motion";
import { easeOut, springGentle } from "@/shared/utils/animations";

export type SummaryGridIcon = "timer" | "target" | "sparkles";

export interface SummaryGridItem {
  title: string;
  value: string;
  note: string;
  icon: SummaryGridIcon;
}

interface SummaryGridProps {
  items: SummaryGridItem[];
  dataKey: string;
}

function MetricIcon({ icon }: Readonly<{ icon: SummaryGridIcon }>) {
  if (icon === "target") {
    return <Target className="h-3.5 w-3.5" />;
  }
  if (icon === "sparkles") {
    return <Sparkles className="h-3.5 w-3.5" />;
  }
  return <Timer className="h-3.5 w-3.5" />;
}

export function SummaryGrid({ items, dataKey }: Readonly<SummaryGridProps>) {
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();
  const shouldEnter = allowDecorativeAnimation && windowVisibility === "visible";

  return (
    <m.div
      key={dataKey}
      initial={shouldEnter ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldEnter ? { duration: 0.26, ease: easeOut } : { duration: 0 }}
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {items.map((item, index) => (
        <m.div
          key={`${dataKey}:${item.title}`}
          initial={shouldEnter ? { opacity: 0, y: 12 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={
            shouldEnter ? { ...springGentle, delay: 0.08 + index * 0.04 } : { duration: 0 }
          }
          className="rounded-2xl border-2 border-border-subtle bg-panel-elevated p-4 shadow-card"
        >
          <div className="flex items-center gap-2 text-xs tracking-wide text-muted-foreground uppercase">
            <MetricIcon icon={item.icon} />
            <span>{item.title}</span>
          </div>
          <p className="mt-3 font-display text-3xl font-semibold text-foreground">{item.value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
        </m.div>
      ))}
    </m.div>
  );
}
