import { useEffect, useState } from "react";

export function Mascot({ size = 96, mood = "awake" }: { size?: number; mood?: "awake" | "point" | "sleep" }) {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    const id = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
    }, 3800);
    return () => clearInterval(id);
  }, []);

  const asleep = mood === "sleep";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={{ imageRendering: "pixelated" }}
      className="drop-shadow-[0_8px_20px_oklch(0.58_0.18_295/0.35)]"
      aria-hidden
    >
      {/* body */}
      <rect x="16" y="20" width="32" height="28" rx="3" fill="var(--color-surface-elevated)" stroke="var(--color-accent-purple)" strokeWidth="1.5" />
      {/* antenna */}
      <line x1="32" y1="20" x2="32" y2="14" stroke="var(--color-accent-purple)" strokeWidth="1.5" />
      <circle cx="32" cy="12" r="2.5" fill="var(--color-accent-purple)">
        {!asleep && <animate attributeName="opacity" values="1;0.4;1" dur="2.4s" repeatCount="indefinite" />}
      </circle>
      {/* screen face */}
      <rect x="20" y="24" width="24" height="16" rx="2" fill="oklch(0.14 0.02 270)" />
      {/* eyes */}
      {asleep ? (
        <>
          <path d="M24 32 h5" stroke="var(--color-accent-purple)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M35 32 h5" stroke="var(--color-accent-purple)" strokeWidth="1.5" strokeLinecap="round" />
          <text x="42" y="20" fill="var(--color-muted-foreground)" fontSize="8" fontFamily="serif">z</text>
        </>
      ) : (
        <>
          <rect x="24" y={blink ? 32 : 30} width="4" height={blink ? 1 : 4} fill="var(--color-accent-purple)" />
          <rect x="36" y={blink ? 32 : 30} width="4" height={blink ? 1 : 4} fill="var(--color-accent-purple)" />
        </>
      )}
      {/* mouth */}
      <rect x="28" y="36" width="8" height="1.5" fill="var(--color-accent-purple)" opacity="0.6" />
      {/* arm point */}
      {mood === "point" && (
        <g>
          <rect x="46" y="30" width="8" height="3" fill="var(--color-surface-elevated)" stroke="var(--color-accent-purple)" strokeWidth="1" />
          <rect x="54" y="30" width="3" height="3" fill="var(--color-accent-purple)" />
        </g>
      )}
      {/* legs */}
      <rect x="22" y="48" width="6" height="6" fill="var(--color-surface-elevated)" stroke="var(--color-accent-purple)" strokeWidth="1.5" />
      <rect x="36" y="48" width="6" height="6" fill="var(--color-surface-elevated)" stroke="var(--color-accent-purple)" strokeWidth="1.5" />
    </svg>
  );
}
