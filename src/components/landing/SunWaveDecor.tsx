export function SunBurst({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 200 200" className={className} fill="none">
      <circle cx="100" cy="100" r="44" fill="var(--sun)" opacity="0.9" />
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * Math.PI) / 6;
        const x1 = 100 + Math.cos(angle) * 58;
        const y1 = 100 + Math.sin(angle) * 58;
        const x2 = 100 + Math.cos(angle) * 82;
        const y2 = 100 + Math.sin(angle) * 82;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--sun)"
            strokeWidth="6"
            strokeLinecap="round"
            opacity="0.7"
          />
        );
      })}
    </svg>
  );
}

export function Waves({
  className = "",
  color = "var(--sea)",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg aria-hidden viewBox="0 0 1440 120" preserveAspectRatio="none" className={className}>
      <path
        d="M0,64 C240,112 480,16 720,48 C960,80 1200,112 1440,64 L1440,120 L0,120 Z"
        fill={color}
        opacity="0.18"
      />
      <path
        d="M0,80 C240,40 480,120 720,80 C960,40 1200,80 1440,72 L1440,120 L0,120 Z"
        fill={color}
        opacity="0.3"
      />
    </svg>
  );
}
