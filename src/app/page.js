import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      {/* Background video */}
      <video
        src="/bg/bg.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Slight overlay to keep content readable */}
      <div className="absolute inset-0 bg-white/50" />

      {/* Main content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-5xl space-y-10 text-center">
          {/* Title */}
          <div className="space-y-3">
            <h1
              className="
                text-4xl sm:text-5xl md:text-6xl lg:text-7xl
                font-bold tracking-tight
                text-[#7A3FFF]
              "
            >
              MONAD DOODLES
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-slate-700">
              Very doodle. Much Monad.
            </p>
          </div>

          {/* Video placeholder (this will be your future hero/intro video, different from bg.mp4) */}
          <div className="mx-auto w-full max-w-3xl">
            <div className="aspect-video w-full rounded-2xl border border-slate-400 bg-white/80 shadow-md flex items-center justify-center px-4">
              <p className="text-sm sm:text-base md:text-lg text-slate-600">
                Landing video coming soon 🎬
              </p>
            </div>
          </div>

          {/* CTA button */}
          <div>
            <Link
              href="/home"
              className="
                inline-flex items-center justify-center
                rounded-full border border-slate-900 bg-slate-900
                px-7 py-3 text-base sm:text-lg font-semibold
                text-white shadow-md transition
                hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0
              "
            >
              Enter Doodleverse →
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full pb-4 px-4">
        <p className="mx-auto max-w-3xl text-center text-sm sm:text-base text-slate-700">
          You’ve entered the Monad doodle frequency — IQ down, vibes up, copium at 10k TPS.
        </p>
      </footer>
    </main>
  );
}



