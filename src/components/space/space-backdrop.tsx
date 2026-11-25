const STARS = makeStars(56);

function makeStars(count: number) {
  let seed = 42;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  return Array.from({ length: count }, () => ({
    top: `${rand() * 100}%`,
    left: `${rand() * 100}%`,
    size: rand() * 1.7 + 0.6,
    opacity: rand() * 0.5 + 0.2,
  }));
}

export function SpaceBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#07060f]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#2a1748_0%,#140c24_38%,#07060f_72%)]" />
      <div className="absolute -right-10 top-[-6%] size-72 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.2),transparent_68%)] blur-2xl" />
      <div className="absolute right-[16%] top-[9%] size-1.5 rounded-full bg-white shadow-[0_0_18px_6px_rgba(255,255,255,0.7)]" />
      <div className="absolute right-[18%] top-[11%] size-8 rounded-full bg-white/10 blur-md" />
      {STARS.map((star, index) => (
        <span
          key={index}
          className="absolute block rounded-full bg-white"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
          }}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-[32%] bg-gradient-to-t from-[#120818] to-transparent" />
    </div>
  );
}
