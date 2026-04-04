import { m } from "motion/react";
import { useMotionSettings } from "@/app/providers/MotionService/motion";
import { HomeHeroSection } from "@/features/home/sections/HomeHeroSection/HomeHeroSection";
import { StreakSection } from "@/features/home/sections/StreakSection/StreakSection";
import { WeeklyProgressSection } from "@/features/home/sections/WeeklyProgressSection/WeeklyProgressSection";
import { staggerItem } from "@/shared/lib/animations/animations";
import { StaggerGroup } from "@/shared/ui/PageTransition/PageTransition";

import type { BootstrapPayload } from "@/shared/types/dashboard";

interface HomePageProps {
  payload: BootstrapPayload;
  needsSetup: boolean;
  onOpenSetup: () => void;
  onOpenWorklog?: (mode: "day" | "week" | "period") => void;
}

export function HomePage({
  payload,
  needsSetup,
  onOpenSetup,
  onOpenWorklog,
}: Readonly<HomePageProps>) {
  const { allowDecorativeAnimation, windowVisibility } = useMotionSettings();

  return (
    <StaggerGroup
      allowDecorativeAnimation={allowDecorativeAnimation}
      windowVisibility={windowVisibility}
    >
      <div className="min-h-full space-y-8 bg-page-canvas">
        <m.div variants={staggerItem}>
          <HomeHeroSection
            payload={payload}
            needsSetup={needsSetup}
            onOpenSetup={onOpenSetup}
            onOpenWorklog={onOpenWorklog}
          />
        </m.div>

        <m.section variants={staggerItem} className="grid gap-6 xl:grid-cols-2">
          <WeeklyProgressSection weekDays={payload.week} />
          <StreakSection streak={payload.streak} />
        </m.section>
      </div>
    </StaggerGroup>
  );
}
