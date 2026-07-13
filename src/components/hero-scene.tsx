export function HeroScene() {
  const particles = Array.from({ length: 18 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-hero-glow" />
      {/* floating document layers */}
      <div className="absolute left-[8%] top-[18%] h-40 w-32 rounded-lg glass shadow-elevated animate-float-slow opacity-70" style={{ animationDelay: "0s" }}>
        <div className="p-3 space-y-1.5">
          <div className="h-1 w-16 rounded bg-muted-foreground/30" />
          <div className="h-1 w-20 rounded bg-muted-foreground/20" />
          <div className="h-1 w-14 rounded bg-muted-foreground/20" />
          <div className="mt-3 h-1 w-24 rounded bg-muted-foreground/25" />
          <div className="h-1 w-18 rounded bg-muted-foreground/20" />
        </div>
      </div>
      <div className="absolute right-[10%] top-[26%] h-32 w-28 rounded-lg glass shadow-elevated animate-float-slow opacity-60" style={{ animationDelay: "1.5s" }}>
        <div className="p-3 space-y-1.5">
          <div className="h-1 w-14 rounded bg-accent-purple/40" />
          <div className="h-1 w-20 rounded bg-muted-foreground/20" />
          <div className="h-1 w-16 rounded bg-muted-foreground/20" />
        </div>
      </div>
      <div className="absolute left-[18%] bottom-[14%] h-24 w-24 rounded-lg glass shadow-elevated animate-float-slow opacity-50" style={{ animationDelay: "3s" }} />

      {/* particles */}
      {particles.map((_, i) => (
        <span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-accent-purple"
          style={{
            left: `${20 + ((i * 37) % 60)}%`,
            top: `${30 + ((i * 53) % 40)}%`,
            // @ts-expect-error css var
            "--tx": `${(i % 3) * 40 - 40}px`,
            "--ty": `${-40 - (i % 4) * 20}px`,
            animation: `particle ${5 + (i % 4)}s ease-out ${i * 0.25}s infinite`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}
