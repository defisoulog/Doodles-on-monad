"use client";

import { useEffect, useRef, useState } from "react";
import DoodleWindow from "../../components/DoodleWindow";

/* -------------------------------------------------
   TRAIT CONFIG
--------------------------------------------------*/

const TRAIT_META = [
  { id: "base", label: "Base" },
  { id: "eyes", label: "Eyes" },
  { id: "hat", label: "Hat" },
  { id: "mouth", label: "Mouth" },
  { id: "misc", label: "Props" },
  { id: "fren", label: "Frens" },
];

// NOTE: base = only notebook now
const TRAIT_OPTIONS = {
  base: [
    { id: "base2", label: "Notebook base", src: "/maker/base/maker-base2.png" },
  ],

  eyes: Array.from({ length: 16 }, (_, i) => ({
    id: `eyes-${i + 1}`,
    label: `Eyes ${i + 1}`,
    src: `/maker/eyes/eyes-${i + 1}.png`,
  })),

  hat: Array.from({ length: 16 }, (_, i) => ({
    id: `hat-${i + 1}`,
    label: `Hat ${i + 1}`,
    src: `/maker/hat/hat-${i + 1}.png`,
  })),

  mouth: Array.from({ length: 15 }, (_, i) => ({
    id: `mouth-${i + 1}`,
    label: `Mouth ${i + 1}`,
    src: `/maker/mouth/mouth-${i + 1}.png`,
  })),

  misc: Array.from({ length: 11 }, (_, i) => ({
    id: `misc-${i + 1}`,
    label: `Prop ${i + 1}`,
    src: `/maker/misc/misc-${i + 1}.png`,
  })),

  fren: Array.from({ length: 10 }, (_, i) => ({
    id: `fren-${i + 1}`,
    label: `Fren ${i + 1}`,
    src: `/maker/fren/fren${i + 1}.png`,
  })),
};

// draw order: back -> front
const DRAW_ORDER = ["base", "fren", "misc", "hat", "eyes", "mouth"];

/* -------------------------------------------------
   SCRIBBLE PHRASES
--------------------------------------------------*/

const SCRIBBLES = [
  "wen monad?",
  "copium rising…",
  "10k tps?? skill issue",
  "is this real life?",
  "brb compiling vibes",
  "monado powered",
  "low IQ. high TPS.",
  "doodle mode enabled",
  "faster than ur internet",
  "someone ping keone",
];

/* -------------------------------------------------
   PAGE
--------------------------------------------------*/

export default function MemeMakerPage() {
  const canvasRef = useRef(null);
  const imageCache = useRef({});

  const [selectedTraits, setSelectedTraits] = useState({
    base: TRAIT_OPTIONS.base[0], // only notebook
    eyes: null,
    hat: null,
    mouth: null,
    misc: null,
    fren: null,
  });

  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");

  /* -----------------------------
     IMAGE LOADER WITH CACHE
  -----------------------------*/

  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      if (!src) return reject(new Error("Empty src"));

      if (imageCache.current[src] && imageCache.current[src].complete) {
        return resolve(imageCache.current[src]);
      }

      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);

      img.src = src;
      imageCache.current[src] = img;
    });

  /* -----------------------------
     REDRAW CANVAS WHENEVER STATE CHANGES
  -----------------------------*/

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    const drawCanvas = async () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "#222";
      ctx.lineWidth = 4;
      ctx.strokeRect(6, 6, w - 12, h - 12);

      for (const cat of DRAW_ORDER) {
        const trait = selectedTraits[cat];
        if (!trait) continue;

        try {
          const img = await loadImage(trait.src);
          ctx.drawImage(img, 0, 0, w, h);
        } catch (err) {
          console.warn("Failed to load:", trait.src);
        }
      }

      const drawText = (text, y) => {
        if (!text) return;

        // BIGGER FONT (~3x): was 32 → now 90
        ctx.font = "bold 90px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.lineWidth = 10;
        ctx.strokeStyle = "#000";
        ctx.strokeText(text, w / 2, y);

        ctx.fillStyle = "#fff";
        ctx.fillText(text, w / 2, y);
      };

      drawText(topText.toUpperCase(), 100);
      drawText(bottomText.toUpperCase(), h - 100);
    };

    drawCanvas();
  }, [selectedTraits, topText, bottomText]);

  /* -----------------------------
     CONTROLS
  -----------------------------*/

  const handleSelectTrait = (cat, opt) =>
    setSelectedTraits((prev) => ({ ...prev, [cat]: opt }));

  const handleRandomize = () => {
    const next = { ...selectedTraits };

    TRAIT_META.forEach(({ id }) => {
      const opts = TRAIT_OPTIONS[id];
      if (!opts || !opts.length) return;

      if (id === "base") {
        next[id] = opts[0];
      } else if (id === "eyes" || id === "hat" || id === "mouth") {
        // always one
        next[id] = opts[Math.floor(Math.random() * opts.length)];
      } else if (id === "misc" || id === "fren") {
        // optional: 40% chance none
        if (Math.random() < 0.4) next[id] = null;
        else next[id] = opts[Math.floor(Math.random() * opts.length)];
      }
    });

    setSelectedTraits(next);
  };

  const handleClearTraits = () => {
    setSelectedTraits({
      base: TRAIT_OPTIONS.base[0],
      eyes: null,
      hat: null,
      mouth: null,
      misc: null,
      fren: null,
    });
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "monad-doodle.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  /* -------------------------------------------------
     UI
  --------------------------------------------------*/

  return (
    <main className="relative min-h-screen w-full px-4 py-10 text-[#1f1230] overflow-hidden">
      {/* FULL PAGE BACKGROUND - bg2.png */}
      <div className="fixed inset-0 -z-10">
        <img
          src="/bg/bg2.png"
          className="h-full w-full object-cover"
          alt="Background"
        />
      </div>

      {/* scribbles – scatter phrases */}
      <span className="absolute left-4 top-6 rotate-[-14deg] text-[10px] md:text-xs font-bold text-[#f5e1ff] opacity-90">
        {SCRIBBLES[0]}
      </span>
      <span className="absolute right-6 top-10 rotate-[8deg] text-[10px] md:text-xs font-semibold text-[#e9d1ff] opacity-90">
        {SCRIBBLES[1]}
      </span>
      <span className="absolute left-10 top-1/2 -translate-y-1/2 rotate-[-6deg] text-[10px] md:text-xs font-semibold text-[#fbe6ff] opacity-90">
        {SCRIBBLES[2]}
      </span>
      <span className="absolute right-8 top-1/2 -translate-y-1/2 rotate-[10deg] text-[10px] md:text-xs font-semibold text-[#f2d3ff] opacity-90">
        {SCRIBBLES[3]}
      </span>
      <span className="absolute left-10 bottom-20 rotate-[-10deg] text-[10px] md:text-xs font-semibold text-[#fbe0ff] opacity-90">
        {SCRIBBLES[4]}
      </span>
      <span className="absolute right-10 bottom-24 rotate-[5deg] text-[10px] md:text-xs font-semibold text-[#f1d2ff] opacity-90">
        {SCRIBBLES[5]}
      </span>
      <span className="absolute left-1/2 -translate-x-1/2 top-4 rotate-[2deg] text-[10px] md:text-xs font-semibold text-[#ffe5ff] opacity-90">
        {SCRIBBLES[6]}
      </span>
      <span className="absolute left-3 bottom-3 rotate-[-5deg] text-[9px] md:text-[10px] font-semibold text-[#f4d5ff] opacity-90">
        {SCRIBBLES[7]}
      </span>
      <span className="absolute right-4 bottom-8 rotate-[8deg] text-[9px] md:text-[10px] font-semibold text-[#f8ddff] opacity-90">
        {SCRIBBLES[8]}
      </span>
      <span className="absolute left-1/2 -translate-x-1/2 bottom-10 rotate-[-3deg] text-[10px] md:text-xs font-semibold text-[#f0d0ff] opacity-90">
        {SCRIBBLES[9]}
      </span>

      {/* MAIN WINDOW */}
      <div className="max-w-6xl mx-auto">
        <DoodleWindow
          title="Monad Doodle Meme Maker"
          modeLabel="meme ops"
          backHref="/home"
          backLabel="Back to Doodleverse"
        >
          <div className="flex flex-col gap-6">
            {/* HEADER BOX (inside window) */}
            <header className="rounded-3xl border border-[#3b2460]/25 bg-[#fffaf4]/90 p-5 shadow-[0_6px_0_rgba(0,0,0,0.4)] backdrop-blur-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-[#3b2460]">
                  Monad Doodle Meme Maker
                </h1>
                <p className="text-[#6b4da8] text-sm mt-1">
                  Sketch it. Stack it. Meme it. Send it.
                </p>
                <p className="text-[#8e76c8] text-xs mt-1">
                  Pick your doodle, add traits, drop text, export greatness.{" "}
                  <br />
                  Certified low-IQ, high-vibe meme factory.
                </p>
              </div>
            </header>

            {/* MAIN CONTENT */}
            <div className="flex flex-col md:flex-row gap-6">
              {/* CANVAS – FIRST on mobile, second on desktop */}
              <section className="order-1 md:order-2 flex-1 flex justify-center items-center">
                <div className="rounded-[32px] border border-[#3b2460]/30 bg-white/90 p-4 shadow-[0_10px_0_rgba(0,0,0,0.5)] backdrop-blur-sm">
                  <canvas
                    ref={canvasRef}
                    width={512}
                    height={512}
                    className="rounded-3xl bg-white w-full h-auto max-w-[512px]"
                  />
                </div>
              </section>

              {/* LEFT PANEL (menu) – SECOND on mobile, first on desktop */}
              <aside className="order-2 md:order-1 w-full md:w-80 rounded-3xl border border-[#3b2460]/25 bg-[#f7f3ff]/95 p-4 shadow-[0_6px_0_rgba(0,0,0,0.35)] backdrop-blur-sm space-y-4">
                {/* MEME TEXT */}
                <section>
                  <h2 className="text-xs font-bold uppercase tracking-wide text-[#7b5ed1] mb-2">
                    MEME TEXT
                  </h2>
                  <input
                    value={topText}
                    onChange={(e) => setTopText(e.target.value)}
                    placeholder="Top text"
                    className="w-full border border-[#c9b8ff] bg-white rounded-lg px-2 py-1 text-xs mb-2"
                  />
                  <input
                    value={bottomText}
                    onChange={(e) => setBottomText(e.target.value)}
                    placeholder="Bottom text"
                    className="w-full border border-[#c9b8ff] bg-white rounded-lg px-2 py-1 text-xs"
                  />
                </section>

                {/* BUTTONS */}
                <section className="flex flex-wrap gap-2">
                  <button
                    onClick={handleRandomize}
                    className="flex-1 bg-[#7a3fff] text-white rounded-lg text-xs px-3 py-1.5 shadow-[0_3px_0_rgba(0,0,0,0.6)]"
                  >
                    Randomize
                  </button>

                  <button
                    onClick={handleClearTraits}
                    className="bg-white text-[#7a3fff] border border-[#7a3fff] rounded-lg text-xs px-3 py-1.5 shadow-[0_3px_0_rgba(0,0,0,0.4)]"
                  >
                    Clear
                  </button>

                  <button
                    onClick={handleExport}
                    className="w-full bg-black text-white rounded-lg text-xs px-3 py-1.5 shadow-[0_3px_0_rgba(0,0,0,0.7)]"
                  >
                    Export 512×512 PNG
                  </button>
                </section>

                {/* TRAITS */}
                <section className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {TRAIT_META.map(({ id, label }) => {
                    const options = TRAIT_OPTIONS[id];
                    const selected = selectedTraits[id];

                    return (
                      <div
                        key={id}
                        className="border border-[#d4c7ff] rounded-xl p-2 bg-white/95"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-semibold uppercase text-[#7b5ed1]">
                            {label}
                          </span>

                          {id !== "base" && (
                            <button
                              onClick={() => handleSelectTrait(id, null)}
                              className="text-[10px] text-[#b19be9]"
                            >
                              None
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {options.map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => handleSelectTrait(id, opt)}
                              className={`px-2 py-1 rounded-lg text-[10px] border ${
                                selected && selected.id === opt.id
                                  ? "bg-[#7a3fff] text-white border-[#7a3fff]"
                                  : "bg-[#f5f1ff] text-[#4b376f] border-[#d4c7ff]"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </section>
              </aside>
            </div>
          </div>
        </DoodleWindow>
      </div>
    </main>
  );
}
