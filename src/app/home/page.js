"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

export default function HomePage() {
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === "undefined") return;
      setDims({ w: window.innerWidth, h: window.innerHeight });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { backCount, frontCount } = useMemo(() => {
    const base = Math.max(24, Math.floor(dims.w / 60));
    return {
      backCount: Math.min(40, Math.floor(base * 0.7)),
      frontCount: Math.min(70, Math.floor(base * 1.3)),
    };
  }, [dims.w]);

  const makeFlakes = (count, depth) =>
    Array.from({ length: count }).map((_, i) => {
      const left = Math.random() * 100; // vw
      const size =
        depth === "back" ? 8 + Math.random() * 9 : 11 + Math.random() * 14;
      const dur =
        depth === "back" ? 14 + Math.random() * 6 : 9 + Math.random() * 6;
      const delay = Math.random() * dur;
      const drift =
        (Math.random() * 60 - 30) * (depth === "back" ? 0.6 : 1.1);
      const startDrift = drift * -0.35;
      const variant = Math.random() < 0.55 ? "1" : "2";
      const sway = Math.random() < 0.4;

      return (
        <span
          key={`${depth}-${i}`}
          className={`snow-flake ${sway ? "sway" : ""}`}
          data-variant={variant}
          style={{
            left: `${left}vw`,
            "--size": `${size}px`,
            "--dur": `${dur}s`,
            "--delay": `${delay}s`,
            "--drift-start": `${startDrift}px`,
            "--drift-end": `${drift}px`,
            "--snow-opacity": depth === "back" ? 0.6 : 1,
          }}
        />
      );
    });

  const backFlakes = useMemo(
    () => makeFlakes(backCount, "back"),
    [backCount, dims.w]
  );
  const frontFlakes = useMemo(
    () => makeFlakes(frontCount, "front"),
    [frontCount, dims.w]
  );

  const apps = [
    { name: "Doodle Maker", icon: "✏️", href: "/meme-maker" },
    { name: "Drawing Pad", icon: "📓", href: "/drawing" },
    { name: "Doodlefall", icon: "⭐", href: "/doodlefall" },
    { name: "Doodle Snake", icon: "🐍", href: "/snake" },
    { name: "Doodle Ski", icon: "⛷️", href: "/ski" },
    { name: "Flappy", icon: "🐦", href: "/flappy" },
    { name: "Pong", icon: "🏓", href: "/pong" },
    { name: "Tempest", icon: "⚡", href: "/tempest" },
    { name: "Breakout", icon: "📦", href: "/breakout" },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText("Coming soon…");
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-transparent">
      {/* background notebook + purple wash */}
      <div className="absolute inset-0 -z-20">
        <Image
          src="/bg/bg.png"
          alt=""
          fill
          className="object-cover opacity-70"
          priority
        />
        <div className="absolute inset-0 bg-[#7A3FFF]/20 mix-blend-screen" />
      </div>

      {/* top scribble bar */}
      <div className="pointer-events-none absolute top-3 left-0 right-0 z-20 flex justify-between px-4 text-[10px] text-[#4b3a78] sm:text-xs">
        <span className="rotate-[-12deg] font-semibold">10k TPS?</span>
        <span className="font-medium">Buffering copium…</span>
      </div>

      {/* bottom scribble: press any key to vibe */}
      <div className="pointer-events-none absolute bottom-20 left-0 right-0 z-40 text-center text-xs text-[#4b3a78] sm:text-sm">
        <span className="inline-block rotate-[-2deg] rounded-full border border-black/5 bg-white/70 px-4 py-1 shadow-sm">
          Press any key to vibe.
        </span>
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-10 pt-20 sm:px-6 lg:px-8">
        {/* boot title */}
        <header className="mb-6 text-center sm:mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#4b2bbf] sm:text-4xl md:text-5xl">
            Booting Monad Doodle OS…
          </h1>
          <p className="mt-2 text-xs text-[#27213f]/80 sm:text-sm">
            Please wait while the copium warms up. A low-IQ, high-vibes
            operating system.
          </p>
        </header>

        {/* main layout: hero + OS window */}
        <section className="grid flex-1 grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* hero doodle – FIRST on mobile, second on desktop */}
          <div className="order-1 mx-auto flex max-w-xs flex-col items-center justify-start md:order-2 md:max-w-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#4b3a78]">
              MONADS &gt; BLOCKS
            </p>
            <Image
              src="/hero/hero2.png"
              alt="Monad doodle hero running"
              width={600}
              height={600}
              className="doodle-wiggle w-full max-w-[320px] sm:max-w-[380px] md:max-w-[420px]"
              priority
            />
            <p className="mt-3 text-center text-[10px] text-[#494067] sm:text-xs">
              Patch notes: added more vibes. Press any key to vibe.
            </p>
          </div>

          {/* OS window – SECOND on mobile, first on desktop */}
          <div
            className="
              order-2 md:order-1
              subtle-float doodle-wiggle
              mx-auto w-full max-w-5xl
              rounded-[32px]
              border-[3px] border-black/80
              bg-white/95
              p-4 sm:p-6
              shadow-[6px_6px_0_rgba(0,0,0,0.85)]
            "
          >
            {/* title bar – with thick bottom line */}
            <div
              className="
                mb-4 flex items-center justify-between
                border-b-[3px] border-black/80
                pb-3
              "
            >
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400/80" />
                <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
                <span className="h-3 w-3 rounded-full bg-green-400/80" />
                <span className="ml-3 text-xs font-semibold tracking-wide text-[#312547]">
                  Monad Doodle OS
                </span>
              </div>
              <span className="text-[10px] text-[#6b5a96]">
                copium: 10k TPS
              </span>
            </div>

            {/* icon grid */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {apps.map((app) => (
                <a
                  key={app.name}
                  href={app.href}
                  className="group flex flex-col items-center gap-1 rounded-2xl border border-black/10 bg-white/70 px-2 py-3 text-center shadow-sm backdrop-blur transition-transform duration-150 hover:-translate-y-[2px]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#2c2848]/20 bg-[#f5f3ff] text-lg shadow-[0_2px_0_rgba(0,0,0,0.25)] sm:h-14 sm:w-14 sm:text-xl">
                    {app.icon}
                  </div>
                  <span className="text-[10px] font-medium text-[#27213f] sm:text-xs">
                    {app.name}
                  </span>
                </a>
              ))}
            </div>

            {/* status text */}
            <div className="mt-4 space-y-1 text-[10px] text-[#27213f] sm:text-xs">
              <p>Press any key to vibe.</p>
              <p>System stable… kinda.</p>
              <p className="text-red-500">
                Warning: doodle OS may lower IQ.
              </p>
            </div>

            {/* CA section */}
            <div className="mt-4 flex items-center gap-2 text-[10px] sm:text-xs">
              <span className="font-semibold text-[#27213f]">CA:</span>
              <div className="flex flex-1 items-center gap-2">
                <span className="flex-1 truncate rounded-xl border border-black/10 bg-white/80 px-2 py-1 text-[10px] text-[#555]">
                  Coming soon…
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-xl bg-[#111827] px-3 py-1 text-[10px] font-semibold text-white shadow-sm hover:brightness-110"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* footer */}
        <footer className="mt-4 text-center text-[10px] text-[#27213f]/80 sm:text-xs">
          You&apos;ve entered the Monad doodle frequency — IQ down, vibes up,
          copium at 10k TPS.
        </footer>
      </div>

      {/* snow overlay – on top of everything */}
      <div className="snow-wrap" style={{ zIndex: 50 }}>
        <div className="snow-layer" data-depth="back" aria-hidden>
          {backFlakes}
        </div>
        <div className="snow-layer" data-depth="front" aria-hidden>
          {frontFlakes}
        </div>
      </div>
    </main>
  );
}
