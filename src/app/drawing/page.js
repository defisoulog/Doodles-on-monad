"use client";

import React, { useEffect, useRef, useState } from "react";
import DoodleWindow from "../../components/DoodleWindow";

const CANVAS_SIZE = 512;

// Emoji stamps – no assets needed
const EMOJIS = ["😀", "😈", "🤡", "💀", "🧠", "💫", "🎨", "⚡", "🐸", "🥲"];

export default function DoodleDrawingPadPage() {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const imagesRef = useRef({});

  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // tool: "brush" | "eraser" | "emoji"
  const [tool, setTool] = useState("brush");
  const [currentEmoji, setCurrentEmoji] = useState(null);

  // templates: "none" | "base1" | "base2"
  const [selectedTemplate, setSelectedTemplate] = useState("none");
  const [showBgOverlay, setShowBgOverlay] = useState(true);

  // brush controls
  const [brushColor, setBrushColor] = useState("#111111");
  const [brushSize, setBrushSize] = useState(3);
  const [wobblyLines, setWobblyLines] = useState(true);
  const [glowEffect, setGlowEffect] = useState(false);

  const COLORS = [
    "#111111",
    "#444444",
    "#7A3FFF",
    "#FF3EDB",
    "#00E0FF",
    "#00C27A",
    "#FFD93B",
    "#FF7A3F",
    "#FF4B4B",
    "#FFFFFF",
  ];

  const SIZES = [
    { label: "XS", value: 2 },
    { label: "S", value: 3 },
    { label: "M", value: 5 },
    { label: "L", value: 8 },
  ];

  /* -----------------------------
     LOAD TEMPLATE IMAGES
  ----------------------------- */
  useEffect(() => {
    const loadImage = (key, src) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          imagesRef.current[key] = img;
          resolve();
        };
        img.onerror = reject;
      });

    Promise.all([
      loadImage("base1", "/draw/base1.png"),
      loadImage("base2", "/draw/base2.png"),
    ])
      .then(() => setImagesLoaded(true))
      .catch(() => setImagesLoaded(true));
  }, []);

  /* -----------------------------
     INIT CANVAS
  ----------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = brushColor;

    saveHistory(ctx);
    setIsReady(true);
  }, []);

  /* -----------------------------
     HISTORY HELPERS
  ----------------------------- */
  const saveHistory = (ctx) => {
    try {
      const snapshot = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      if (historyIndexRef.current < historyRef.current.length - 1) {
        historyRef.current = historyRef.current.slice(
          0,
          historyIndexRef.current + 1
        );
      }

      historyRef.current.push(snapshot);
      historyIndexRef.current = historyRef.current.length - 1;

      const MAX_HISTORY = 40;
      if (historyRef.current.length > MAX_HISTORY) {
        historyRef.current.shift();
        historyIndexRef.current = historyRef.current.length - 1;
      }
    } catch {
      // ignore
    }
  };

  const restoreFromHistory = (index) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const snapshot = historyRef.current[index];
    if (!snapshot) return;

    ctx.putImageData(snapshot, 0, 0);
  };

  /* -----------------------------
     TEMPLATE HANDLING
  ----------------------------- */
  const applyTemplate = (template) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    if (template === "base1" || template === "base2") {
      const img = imagesRef.current[template];
      if (img) ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }

    historyRef.current = [];
    historyIndexRef.current = -1;
    saveHistory(ctx);
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    applyTemplate(template);
  };

  /* -----------------------------
     TOOL / DRAW HELPERS
  ----------------------------- */
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    return {
      x: ((e.clientX - rect.left) * CANVAS_SIZE) / rect.width,
      y: ((e.clientY - rect.top) * CANVAS_SIZE) / rect.height,
    };
  };

  const setToolOnContext = (ctx) => {
    if (tool === "brush") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      if (glowEffect) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = brushColor;
      } else {
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
      }
    } else if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 18;
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
    }
  };

  /* -----------------------------
     POINTER EVENTS
  ----------------------------- */
  const handlePointerDown = (e) => {
    if (!isReady) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e.nativeEvent || e);

    // Emoji stamping mode
    if (tool === "emoji" && currentEmoji) {
      ctx.globalCompositeOperation = "source-over";
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
      const fontSize = CANVAS_SIZE / 8;
      ctx.font = `${fontSize}px system-ui, Apple Color Emoji, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(currentEmoji, x, y);
      saveHistory(ctx);
      return;
    }

    // Brush / eraser
    setToolOnContext(ctx);

    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);

    try {
      e.currentTarget?.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e) => {
    if (!isReady || !isDrawingRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e.nativeEvent || e);

    let jx = x;
    let jy = y;

    if (wobblyLines && tool === "brush") {
      const jitter = () => (Math.random() - 0.5) * 0.8;
      jx = x + jitter();
      jy = y + jitter();
    }

    ctx.lineTo(jx, jy);
    ctx.stroke();
  };

  const endStroke = (e) => {
    if (!isDrawingRef.current) return;

    isDrawingRef.current = false;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.closePath();
    saveHistory(ctx);

    try {
      e.currentTarget?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  /* -----------------------------
     BUTTON ACTIONS
  ----------------------------- */
  const handleUndo = () => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    restoreFromHistory(historyIndexRef.current);
  };

  const handleRedo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    restoreFromHistory(historyIndexRef.current);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    if (selectedTemplate === "base1" || selectedTemplate === "base2") {
      const img = imagesRef.current[selectedTemplate];
      if (img) ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }

    historyRef.current = [];
    historyIndexRef.current = -1;
    saveHistory(ctx);
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsExporting(true);

    try {
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "monad-doodle-512.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setIsExporting(false), 800);
    }
  };

  /* -----------------------------
     RENDER
  ----------------------------- */
  return (
    <main className="min-h-screen w-full bg-[url('/bg/bg3.png')] bg-cover bg-center flex items-center justify-center px-3 py-6 md:px-6 md:py-10">
      <div className="w-full max-w-5xl">
        <DoodleWindow
          title="Doodle Drawing Pad"
          subtitle="Where tiny pencil strokes turn into big degen art."
          modeLabel="sketch ops"
          backHref="/home"
          backLabel="Back to Doodleverse"
          footerText="Doodle responsibly. Copium levels may spike."
        >
          {/* Header text inside window */}
          <header className="space-y-1.5 text-center mb-4">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Doodle Drawing Pad
            </h1>
            <p className="text-sm md:text-base text-neutral-700">
              Where tiny pencil strokes turn into big degen art.
            </p>
            <p className="text-xs md:text-sm text-neutral-500">
              Choose a template, grab your digital pencil, and start doodling.
              Rewrite reality one sketch at a time — or ruin it completely. Both
              are valid.
            </p>
          </header>

          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* RIGHT on desktop, TOP on mobile: canvas */}
            <section className="order-1 lg:order-2 w-full lg:w-2/3 space-y-3">
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 shadow-inner p-3 flex flex-col items-center gap-2">
                <div className="flex items-center justify-between w-full text-xs text-neutral-500 px-1">
                  <span>Sketch buffer: ready.</span>
                  <span>Draw responsibly (or not).</span>
                </div>

                <div className="flex items-center justify-center w-full">
                  <canvas
                    ref={canvasRef}
                    width={CANVAS_SIZE}
                    height={CANVAS_SIZE}
                    className={
                      "block rounded-xl touch-none border border-neutral-300 bg-white " +
                      (showBgOverlay
                        ? "bg-[url('/draw/bg.png')] bg-cover bg-center"
                        : "")
                    }
                    style={{
                      width: "100%",
                      maxWidth: CANVAS_SIZE,
                      height: "auto",
                    }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={endStroke}
                    onPointerLeave={endStroke}
                  />
                </div>
              </div>
            </section>

            {/* LEFT on desktop, BOTTOM on mobile: templates + tools + emojis */}
            <section className="order-2 lg:order-1 w-full lg:w-1/3 space-y-4 text-xs">
              {/* Templates */}
              <div className="space-y-2">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-700">
                    Pick your doodle template
                  </h2>
                  <p className="text-[11px] text-neutral-500">
                    Templates optimized for doodling at 10k TPS.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Blank */}
                  <button
                    type="button"
                    onClick={() => handleSelectTemplate("none")}
                    className={
                      "rounded-xl border p-3 text-left transition " +
                      (selectedTemplate === "none"
                        ? "border-purple-500 bg-purple-50/80 shadow-sm"
                        : "border-neutral-200 bg-white hover:border-purple-300 hover:bg-purple-50/50")
                    }
                  >
                    <span className="font-semibold">Blank canvas</span>
                    <span className="mt-1 block text-[11px] text-neutral-500">
                      Smooth brain mode enabled.
                    </span>
                  </button>

                  {/* Template 1 */}
                  <button
                    type="button"
                    onClick={() => handleSelectTemplate("base1")}
                    className={
                      "rounded-xl border p-3 text-left transition " +
                      (selectedTemplate === "base1"
                        ? "border-purple-500 bg-purple-50/80 shadow-sm"
                        : "border-neutral-200 bg-white hover:border-purple-300 hover:bg-purple-50/50")
                    }
                  >
                    <span className="font-semibold">Template 1</span>
                    <span className="mt-1 block text-[11px] text-neutral-500">
                      Select your battlefield.
                    </span>
                  </button>

                  {/* Template 2 */}
                  <button
                    type="button"
                    onClick={() => handleSelectTemplate("base2")}
                    className={
                      "rounded-xl border p-3 text-left transition " +
                      (selectedTemplate === "base2"
                        ? "border-purple-500 bg-purple-50/80 shadow-sm"
                        : "border-neutral-200 bg-white hover:border-purple-300 hover:bg-purple-50/50")
                    }
                  >
                    <span className="font-semibold">Template 2</span>
                    <span className="mt-1 block text-[11px] text-neutral-500">
                      Crayon engine online.
                    </span>
                  </button>

                  {/* BG toggle */}
                  <button
                    type="button"
                    onClick={() => setShowBgOverlay((prev) => !prev)}
                    className={
                      "rounded-xl border p-3 text-left transition " +
                      (showBgOverlay
                        ? "border-purple-500 bg-purple-50/80 shadow-sm"
                        : "border-neutral-200 bg-white hover:border-purple-300 hover:bg-purple-50/50")
                    }
                  >
                    <span className="font-semibold">
                      {showBgOverlay
                        ? "Hide doodle background"
                        : "Show doodle background"}
                    </span>
                    <span className="mt-1 block text-[11px] text-neutral-500">
                      Toggle notebook vibes on/off.
                    </span>
                  </button>
                </div>
              </div>

              {/* Tools */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setTool("brush")}
                    className={
                      "px-3 py-2 rounded-lg border " +
                      (tool === "brush"
                        ? "border-purple-500 bg-purple-50 font-semibold"
                        : "border-neutral-300 bg-white hover:bg-purple-50/70")
                    }
                  >
                    Brush
                  </button>

                  <button
                    type="button"
                    onClick={() => setTool("eraser")}
                    className={
                      "px-3 py-2 rounded-lg border " +
                      (tool === "eraser"
                        ? "border-purple-500 bg-purple-50 font-semibold"
                        : "border-neutral-300 bg-white hover:bg-purple-50/70")
                    }
                  >
                    Eraser
                  </button>

                  <button
                    type="button"
                    onClick={handleUndo}
                    className="px-3 py-2 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50"
                  >
                    Undo
                  </button>

                  <button
                    type="button"
                    onClick={handleRedo}
                    className="px-3 py-2 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50"
                  >
                    Redo
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-3 py-2 rounded-lg border border-neutral-300 bg-white hover:bg-red-50"
                  >
                    CLEAR
                  </button>

                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={isExporting}
                    className={
                      "px-3 py-2 rounded-lg border text-white " +
                      (isExporting
                        ? "border-neutral-300 bg-neutral-400 cursor-wait"
                        : "border-purple-600 bg-purple-600 hover:bg-purple-700")
                    }
                  >
                    {isExporting ? "Exporting…" : "EXPORT PNG"}
                  </button>
                </div>
              </div>

              {/* Brush controls */}
              <div className="space-y-2">
                {/* Colors */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="uppercase tracking-wide text-[11px] text-neutral-600">
                    Color
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setBrushColor(c);
                          setTool("brush");
                        }}
                        className={
                          "w-6 h-6 rounded-full border transition " +
                          (brushColor === c
                            ? "border-black scale-110"
                            : "border-neutral-300 hover:scale-105")
                        }
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Sizes */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="uppercase tracking-wide text-[11px] text-neutral-600">
                    Size
                  </span>
                  <div className="flex gap-1.5">
                    {SIZES.map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => setBrushSize(s.value)}
                        className={
                          "px-2 py-1 rounded-md border text-[11px] " +
                          (brushSize === s.value
                            ? "border-purple-500 bg-purple-50 font-semibold"
                            : "border-neutral-300 bg-white hover:bg-neutral-50")
                        }
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wobbly + Glow */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWobblyLines((prev) => !prev)}
                    className={
                      "px-3 py-1.5 rounded-lg border text-[11px] " +
                      (wobblyLines
                        ? "border-purple-500 bg-purple-50"
                        : "border-neutral-300 bg-white hover:bg-neutral-50")
                    }
                  >
                    {wobblyLines ? "Wobbly lines ON" : "Wobbly lines OFF"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setGlowEffect((prev) => !prev)}
                    className={
                      "px-3 py-1.5 rounded-lg border text-[11px] " +
                      (glowEffect
                        ? "border-pink-500 bg-pink-50"
                        : "border-neutral-300 bg-white hover:bg-pink-50/60")
                    }
                  >
                    {glowEffect ? "Glow effect ON" : "Glow effect OFF"}
                  </button>
                </div>
              </div>

              {/* Emoji tool */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-700">
                    Emoji stamps
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    pick one, then click canvas
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {EMOJIS.map((emoji) => {
                    const active = tool === "emoji" && currentEmoji === emoji;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setTool("emoji");
                          setCurrentEmoji(emoji);
                        }}
                        className={
                          "min-w-[32px] h-8 px-2 rounded-lg border text-base flex items-center justify-center " +
                          (active
                            ? "border-purple-500 bg-purple-50"
                            : "border-neutral-300 bg-white hover:bg-purple-50/60")
                        }
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        </DoodleWindow>
      </div>
    </main>
  );
}
