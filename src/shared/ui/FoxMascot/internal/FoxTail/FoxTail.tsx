import { m } from "motion/react";
import {
  getTailRotateAnimation,
  getTailTransition,
} from "@/shared/ui/FoxMascot/internal/fox-mascot-helpers";

import type { FoxMood } from "@/shared/ui/FoxMascot/internal/fox-mascot-types";

interface FoxTailProps {
  mood: FoxMood;
  fur: string;
  animated: boolean;
}

export function FoxTail({ mood, fur, animated }: Readonly<FoxTailProps>) {
  return (
    <m.path
      d="M92 82 Q108 70 104 52 Q102 44 96 48"
      stroke={fur}
      strokeWidth="8"
      strokeLinecap="round"
      fill="none"
      animate={animated ? getTailRotateAnimation(mood) : { rotate: 0 }}
      transition={animated ? getTailTransition(mood) : { duration: 0 }}
      style={{ transformOrigin: "92px 82px" }}
    />
  );
}
