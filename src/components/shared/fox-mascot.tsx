import { m, type Transition } from "motion/react";

/**
 * Fox mascot for Timely — an energetic, claymorphism-styled orange fox.
 * Supports broader expressions while staying inside the existing clay identity.
 */

export type FoxMood =
  | "idle"
  | "working"
  | "celebrating"
  | "curious"
  | "cozy"
  | "tired"
  | "drained";

interface FoxMascotProps {
  mood?: FoxMood;
  /** Size in px — controls both width and height */
  size?: number;
  className?: string;
}

export function FoxMascot({ mood = "idle", size = 120, className }: FoxMascotProps) {
  const animation =
    mood === "celebrating"
      ? { y: [0, -8, 0], rotate: [0, -3, 3, 0] }
      : mood === "working"
        ? { y: [0, -2, 0] }
        : mood === "curious"
          ? { y: [0, -4, 0], rotate: [0, -2, 2, 0] }
          : mood === "cozy"
            ? { y: [0, -1, 0], scale: [1, 0.99, 1] }
            : mood === "tired"
              ? { y: [0, -1, 0], rotate: [0, -1, 0] }
              : mood === "drained"
                ? { y: [0, 1, 0] }
                : { y: [0, -3, 0] };
  const animationTransition: Transition =
    mood === "celebrating"
      ? { duration: 0.6, repeat: Infinity, ease: "easeInOut" }
      : mood === "drained"
        ? { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
        : mood === "cozy"
          ? { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
          : { duration: 2, repeat: Infinity, ease: "easeInOut" };

  return (
    <m.div
      className={className}
      style={{ width: size, height: size }}
      animate={animation}
      transition={animationTransition}
    >
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        role="img"
        aria-label={`Timely fox mascot — ${mood}`}
      >
        {/* Left ear */}
        <path
          d="M30 52 L22 20 L44 40 Z"
          fill="oklch(0.72 0.18 50)"
          stroke="oklch(0.55 0.12 50)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Left ear inner */}
        <path
          d="M31 46 L27 26 L40 40 Z"
          fill="oklch(0.85 0.10 50)"
        />

        {/* Right ear */}
        <path
          d="M90 52 L98 20 L76 40 Z"
          fill="oklch(0.72 0.18 50)"
          stroke="oklch(0.55 0.12 50)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Right ear inner */}
        <path
          d="M89 46 L93 26 L80 40 Z"
          fill="oklch(0.85 0.10 50)"
        />

        {/* Head — main circle */}
        <circle
          cx="60"
          cy="64"
          r="32"
          fill="oklch(0.72 0.18 50)"
          stroke="oklch(0.55 0.12 50)"
          strokeWidth="2.5"
        />

        {/* White face patch */}
        <ellipse
          cx="60"
          cy="72"
          rx="20"
          ry="18"
          fill="oklch(0.97 0.01 90)"
        />

        {/* Left eye */}
        <FoxEye cx={49} cy={60} mood={mood} />

        {/* Right eye */}
        <FoxEye cx={71} cy={60} mood={mood} />

        {/* Nose */}
        <ellipse
          cx="60"
          cy="72"
          rx="4"
          ry="3"
          fill="oklch(0.30 0.05 50)"
        />

        {mood === "cozy" && (
          <>
            <circle cx="44" cy="71" r="2.4" fill="oklch(0.82 0.09 28 / 0.75)" />
            <circle cx="76" cy="71" r="2.4" fill="oklch(0.82 0.09 28 / 0.75)" />
          </>
        )}

        {/* Mouth — changes with mood */}
        {mood === "celebrating" ? (
          <path
            d="M52 78 Q60 86 68 78"
            stroke="oklch(0.30 0.05 50)"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        ) : mood === "curious" ? (
          <path
            d="M54 78 Q60 83 66 79"
            stroke="oklch(0.30 0.05 50)"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        ) : mood === "working" ? (
          <line
            x1="55"
            y1="78"
            x2="65"
            y2="78"
            stroke="oklch(0.30 0.05 50)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        ) : mood === "cozy" ? (
          <path
            d="M54 78 Q60 81 66 78"
            stroke="oklch(0.30 0.05 50)"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        ) : mood === "tired" ? (
          <path
            d="M54 79 Q60 81 66 79"
            stroke="oklch(0.30 0.05 50)"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        ) : mood === "drained" ? (
          <path
            d="M54 80 Q60 77 66 80"
            stroke="oklch(0.30 0.05 50)"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        ) : (
          <path
            d="M54 77 Q60 82 66 77"
            stroke="oklch(0.30 0.05 50)"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* Tail */}
        <FoxTail mood={mood} />
      </svg>
    </m.div>
  );
}

/** Animated fox eye — round when idle/celebrating, narrow when working */
function FoxEye({ cx, cy, mood }: { cx: number; cy: number; mood: FoxMood }) {
  if (mood === "working") {
    // Focused squint
    return (
      <line
        x1={cx - 3}
        y1={cy}
        x2={cx + 3}
        y2={cy}
        stroke="oklch(0.25 0.05 50)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    );
  }

  if (mood === "celebrating") {
    // Happy ^^ eyes
    return (
      <path
        d={`M${cx - 3} ${cy + 1} Q${cx} ${cy - 4} ${cx + 3} ${cy + 1}`}
        stroke="oklch(0.25 0.05 50)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    );
  }

  if (mood === "curious") {
    return (
      <g>
        <circle cx={cx} cy={cy} r="4.2" fill="oklch(0.25 0.05 50)" />
        <circle cx={cx + 1.5} cy={cy - 1.5} r="1.5" fill="white" />
        <circle cx={cx - 5.5} cy={cy - 6} r="1.1" fill="oklch(0.30 0.05 50)" />
      </g>
    );
  }

  if (mood === "cozy") {
    return (
      <path
        d={`M${cx - 3} ${cy + 1} Q${cx} ${cy - 1} ${cx + 3} ${cy + 1}`}
        stroke="oklch(0.25 0.05 50)"
        strokeWidth="2.3"
        strokeLinecap="round"
        fill="none"
      />
    );
  }

  if (mood === "tired") {
    return (
      <g>
        <line
          x1={cx - 3}
          y1={cy + 1}
          x2={cx + 3}
          y2={cy + 1}
          stroke="oklch(0.25 0.05 50)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <line
          x1={cx - 4}
          y1={cy - 3}
          x2={cx + 3}
          y2={cy - 4.5}
          stroke="oklch(0.30 0.05 50 / 0.65)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </g>
    );
  }

  if (mood === "drained") {
    return (
      <g>
        <line
          x1={cx - 3.2}
          y1={cy + 1.5}
          x2={cx + 3.2}
          y2={cy + 1.5}
          stroke="oklch(0.25 0.05 50)"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <line
          x1={cx - 3.8}
          y1={cy - 2.5}
          x2={cx + 3.8}
          y2={cy - 3}
          stroke="oklch(0.30 0.05 50 / 0.45)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
    );
  }

  // Idle — round eyes with shine
  return (
    <g>
      <circle cx={cx} cy={cy} r="4" fill="oklch(0.25 0.05 50)" />
      <circle cx={cx + 1.5} cy={cy - 1.5} r="1.5" fill="white" />
    </g>
  );
}

/** Animated fox tail that wags with different energy per mood */
function FoxTail({ mood }: { mood: FoxMood }) {
  return (
    <m.path
      d="M92 82 Q108 70 104 52 Q102 44 96 48"
      stroke="oklch(0.72 0.18 50)"
      strokeWidth="8"
      strokeLinecap="round"
      fill="none"
      animate={
        mood === "celebrating"
          ? { rotate: [0, 15, -15, 0] }
          : mood === "working"
            ? { rotate: [0, 3, -3, 0] }
            : mood === "curious"
              ? { rotate: [0, 10, -6, 0] }
              : mood === "cozy"
                ? { rotate: [0, 4, -2, 0] }
                : mood === "tired"
                  ? { rotate: [0, 2, -2, 0] }
                  : mood === "drained"
                    ? { rotate: [0, 1, -1, 0] }
            : { rotate: [0, 8, -8, 0] }
      }
      transition={
        mood === "celebrating"
          ? { duration: 0.4, repeat: Infinity, ease: "easeInOut" }
          : mood === "working"
            ? { duration: 3, repeat: Infinity, ease: "easeInOut" }
            : mood === "drained"
              ? { duration: 4.2, repeat: Infinity, ease: "easeInOut" }
              : mood === "cozy"
                ? { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
            : { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
      }
      style={{ transformOrigin: "92px 82px" }}
    />
  );
}
