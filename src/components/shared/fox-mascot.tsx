import { m, type Transition } from "motion/react";

/**
 * Fox mascot for Timely — an energetic, claymorphism-styled orange fox.
 * Supports broader expressions while staying inside the existing clay identity.
 */

export type FoxMood = "idle" | "working" | "celebrating" | "curious" | "cozy" | "tired" | "drained";

export type FoxAccessorySlot = "headwear" | "eyewear" | "neckwear" | "charm";

export interface FoxAccessory {
  slot: FoxAccessorySlot;
  variant: string;
}

export type FoxVariant = "aurora" | "arctic" | "kitsune";

interface FoxMascotProps {
  mood?: FoxMood;
  /** Size in px — controls both width and height */
  size?: number;
  className?: string;
  accessories?: FoxAccessory[];
  variant?: FoxVariant;
}

export function FoxMascot({
  mood = "idle",
  size = 120,
  className,
  accessories = [],
  variant = "aurora",
}: FoxMascotProps) {
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

  const headwear = accessories.find((accessory) => accessory.slot === "headwear")?.variant;
  const eyewear = accessories.find((accessory) => accessory.slot === "eyewear")?.variant;
  const neckwear = accessories.find((accessory) => accessory.slot === "neckwear")?.variant;
  const charm = accessories.find((accessory) => accessory.slot === "charm")?.variant;
  const palette = getFoxPalette(variant);

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
        aria-label={`Timely fox mascot — ${variant} ${mood}`}
      >
        {/* Left ear */}
        <path
          d="M30 52 L22 20 L44 40 Z"
          fill={palette.fur}
          stroke={palette.outline}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Left ear inner */}
        <path d="M31 46 L27 26 L40 40 Z" fill={palette.innerEar} />

        {/* Right ear */}
        <path
          d="M90 52 L98 20 L76 40 Z"
          fill={palette.fur}
          stroke={palette.outline}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Right ear inner */}
        <path d="M89 46 L93 26 L80 40 Z" fill={palette.innerEar} />

        {/* Head — main circle */}
        <circle
          cx="60"
          cy="64"
          r="32"
          fill={palette.fur}
          stroke={palette.outline}
          strokeWidth="2.5"
        />

        {/* White face patch */}
        <ellipse cx="60" cy="72" rx="20" ry="18" fill="oklch(0.97 0.01 90)" />

        {/* Left eye */}
        <FoxEye cx={49} cy={60} mood={mood} />

        {/* Right eye */}
        <FoxEye cx={71} cy={60} mood={mood} />

        {/* Nose */}
        <ellipse cx="60" cy="72" rx="4" ry="3" fill="oklch(0.30 0.05 50)" />

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
        <FoxTail mood={mood} fur={palette.fur} />

        {eyewear === "frame-signal" ? <SignalGlasses /> : null}
        {charm === "desk-constellation" ? <ConstellationCharm /> : null}
        {neckwear === "aurora-scarf" ? <AuroraScarf /> : null}
        {headwear === "comet-cap" ? <CometCap /> : null}
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
function FoxTail({ mood, fur }: { mood: FoxMood; fur: string }) {
  return (
    <m.path
      d="M92 82 Q108 70 104 52 Q102 44 96 48"
      stroke={fur}
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

function getFoxPalette(variant: FoxVariant) {
  if (variant === "kitsune") {
    return {
      fur: "oklch(0.94 0.02 80)",
      outline: "oklch(0.22 0.02 260)",
      innerEar: "oklch(0.18 0.01 260)",
    };
  }

  if (variant === "arctic") {
    return {
      fur: "oklch(0.95 0.02 240)",
      outline: "oklch(0.56 0.05 240)",
      innerEar: "oklch(0.86 0.03 250)",
    };
  }

  return {
    fur: "oklch(0.72 0.18 50)",
    outline: "oklch(0.55 0.12 50)",
    innerEar: "oklch(0.85 0.10 50)",
  };
}

function SignalGlasses() {
  return (
    <g>
      <rect
        x="40"
        y="54"
        width="18"
        height="11"
        rx="4"
        fill="oklch(0.23 0.03 40 / 0.18)"
        stroke="oklch(0.55 0.09 55)"
        strokeWidth="2"
      />
      <rect
        x="62"
        y="54"
        width="18"
        height="11"
        rx="4"
        fill="oklch(0.23 0.03 40 / 0.18)"
        stroke="oklch(0.55 0.09 55)"
        strokeWidth="2"
      />
      <path d="M58 59 H62" stroke="oklch(0.55 0.09 55)" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

function ConstellationCharm() {
  return (
    <g>
      <path d="M60 95 L64 88" stroke="oklch(0.67 0.11 70)" strokeWidth="2" strokeLinecap="round" />
      <path d="M60 95 L56 88" stroke="oklch(0.67 0.11 70)" strokeWidth="2" strokeLinecap="round" />
      <circle
        cx="60"
        cy="97"
        r="4.2"
        fill="oklch(0.74 0.15 75)"
        stroke="oklch(0.58 0.10 65)"
        strokeWidth="1.6"
      />
    </g>
  );
}

function AuroraScarf() {
  return (
    <g>
      <path
        d="M42 86 C48 80 72 80 78 86"
        fill="none"
        stroke="oklch(0.72 0.16 15)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path d="M72 85 L78 98" stroke="oklch(0.72 0.16 15)" strokeWidth="5" strokeLinecap="round" />
    </g>
  );
}

function CometCap() {
  return (
    <g>
      <path
        d="M42 44 C48 34 72 32 82 42 L76 49 C67 44 52 44 44 48 Z"
        fill="oklch(0.63 0.12 255)"
        stroke="oklch(0.45 0.08 250)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="77" cy="39" r="3" fill="oklch(0.83 0.17 92)" />
    </g>
  );
}
