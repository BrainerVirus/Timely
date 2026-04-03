import type { FoxMood } from "@/shared/ui/FoxMascot/internal/fox-mascot-types";

interface FoxFaceProps {
  mood: FoxMood;
}

export function FoxFace({ mood }: Readonly<FoxFaceProps>) {
  return (
    <>
      <FoxEye cx={49} cy={60} mood={mood} />
      <FoxEye cx={71} cy={60} mood={mood} />
      <ellipse cx="60" cy="72" rx="4" ry="3" fill="oklch(0.30 0.05 50)" />

      {mood === "cozy" ? (
        <>
          <circle cx="44" cy="71" r="2.4" fill="oklch(0.82 0.09 28 / 0.75)" />
          <circle cx="76" cy="71" r="2.4" fill="oklch(0.82 0.09 28 / 0.75)" />
        </>
      ) : null}

      <FoxMouth mood={mood} />
    </>
  );
}

function FoxEye({ cx, cy, mood }: Readonly<{ cx: number; cy: number; mood: FoxMood }>) {
  if (mood === "working") {
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

  if (mood === "tired" || mood === "drained") {
    return (
      <g>
        <line
          x1={cx - 3.2}
          y1={cy + 1.5}
          x2={cx + 3.2}
          y2={cy + 1.5}
          stroke="oklch(0.25 0.05 50)"
          strokeWidth={mood === "tired" ? "2.2" : "2.1"}
          strokeLinecap="round"
        />
        <line
          x1={cx - (mood === "tired" ? 4 : 3.8)}
          y1={cy - (mood === "tired" ? 3 : 2.5)}
          x2={cx + (mood === "tired" ? 3 : 3.8)}
          y2={cy - (mood === "tired" ? 4.5 : 3)}
          stroke={`oklch(0.30 0.05 50 / ${mood === "tired" ? "0.65" : "0.45"})`}
          strokeWidth={mood === "tired" ? "1.8" : "1.5"}
          strokeLinecap="round"
        />
      </g>
    );
  }

  return (
    <g>
      <circle cx={cx} cy={cy} r="4" fill="oklch(0.25 0.05 50)" />
      <circle cx={cx + 1.5} cy={cy - 1.5} r="1.5" fill="white" />
    </g>
  );
}

function FoxMouth({ mood }: Readonly<{ mood: FoxMood }>) {
  const mouthPathByMood: Record<FoxMood, string> = {
    idle: "M54 77 Q60 82 66 77",
    celebrating: "M52 78 Q60 86 68 78",
    curious: "M54 78 Q60 83 66 79",
    cozy: "M54 78 Q60 81 66 78",
    tired: "M54 79 Q60 81 66 79",
    drained: "M54 80 Q60 77 66 80",
    working: "",
  };

  if (mood === "working") {
    return (
      <line
        x1="55"
        y1="78"
        x2="65"
        y2="78"
        stroke="oklch(0.30 0.05 50)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    );
  }

  return (
    <path
      d={mouthPathByMood[mood]}
      stroke="oklch(0.30 0.05 50)"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
  );
}
