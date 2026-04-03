interface FoxAccessoriesProps {
  headwear?: string;
  eyewear?: string;
  neckwear?: string;
  charm?: string;
}

export function FoxAccessories({
  headwear,
  eyewear,
  neckwear,
  charm,
}: Readonly<FoxAccessoriesProps>) {
  return (
    <>
      {eyewear === "frame-signal" ? (
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
      ) : null}

      {charm === "desk-constellation" ? (
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
      ) : null}

      {neckwear === "aurora-scarf" ? (
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
      ) : null}

      {headwear === "comet-cap" ? (
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
      ) : null}
    </>
  );
}
