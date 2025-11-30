"use client";

import React, { useEffect, useRef } from "react";
import DoodleWindow from "@/components/DoodleWindow";

export default function SkiGamePage() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // --------- SIZING (responsive) ----------
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const width = parent.clientWidth;
      const height = Math.min(window.innerHeight * 0.7, width * 1.4);
      canvas.width = width;
      canvas.height = height;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // --------- GAME STATE ----------
    const skierImg = new Image();
    skierImg.src = "/games/skihero.png";

    const state = {
      ready: false,
      skierX: 0,
      skierY: 0,
      skierWidth: 60,
      skierHeight: 60,
      speed: 180,
      offsetY: 0,
      lastTime: 0,
      status: "menu", // "menu" | "playing" | "gameover"
      distance: 0,
      crashes: 0,
      bestDistance: 0,
      deathReason: null, // "tree" | "rock" | "yeti"
      obstacles: [],
      spawnTimer: 0,
      // snow
      snowflakes: [],
      snowTimer: 0,
      // yeti
      yeti: {
        active: false,
        x: 0,
        y: 0,
        speed: 0,
      },
      keys: { left: false, right: false },
    };

    const initSkierPosition = () => {
      const { width, height } = canvas;
      state.skierX = width / 2;
      state.skierY = height * 0.35;
    };

    const resetRun = () => {
      initSkierPosition();
      state.speed = 180;
      state.offsetY = 0;
      state.distance = 0;
      state.obstacles = [];
      state.spawnTimer = 0;
      state.lastTime = 0;
      state.deathReason = null;
      state.snowflakes = [];
      state.snowTimer = 0;
      state.yeti.active = false;
    };

    const startGame = () => {
      resetRun();
      state.status = "playing";
    };

    const triggerCrash = (reason = "tree") => {
      if (state.status !== "playing") return;
      state.status = "gameover";
      state.deathReason = reason;
      state.crashes += 1;
      if (state.distance > state.bestDistance) {
        state.bestDistance = state.distance;
      }
    };

    skierImg.onload = () => {
      state.ready = true;
    };

    // --------- INPUT: KEYBOARD ----------
    const handleKeyDown = (e) => {
      if (e.key === " " || e.code === "Space") {
        if (state.status !== "playing") {
          startGame();
          return;
        }
      }
      if (state.status !== "playing") return;

      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        state.keys.left = true;
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        state.keys.right = true;
      }
    };

    const handleKeyUp = (e) => {
      if (state.status !== "playing") return;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        state.keys.left = false;
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        state.keys.right = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // --------- INPUT: MOUSE / TOUCH ----------
    const startOrRetryIfNeeded = () => {
      if (state.status !== "playing") {
        startGame();
        return true;
      }
      return false;
    };

    const handlePointerDown = (clientX) => {
      if (!canvas) return;
      // menu / gameover → start
      if (startOrRetryIfNeeded()) return;

      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;

      if (x < rect.width / 2) {
        state.keys.left = true;
        state.keys.right = false;
      } else {
        state.keys.right = true;
        state.keys.left = false;
      }
    };

    const handlePointerUp = () => {
      state.keys.left = false;
      state.keys.right = false;
    };

    const handleMouseDown = (e) => handlePointerDown(e.clientX);
    const handleMouseUp = () => handlePointerUp();

    const handleTouchStart = (e) => {
      if (!canvas) return;
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      handlePointerDown(touch.clientX);
    };
    const handleTouchEnd = () => handlePointerUp();

    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("touchstart", handleTouchStart);
    canvas.addEventListener("touchend", handleTouchEnd);
    canvas.addEventListener("touchcancel", handleTouchEnd);

    // --------- OBSTACLES ----------
    const spawnObstacle = () => {
      const { width, height } = canvas;

      // difficulty-based lane narrowing for spawn
      const diffLane = Math.min(state.distance / 600, 0.6); // 0 → easy, 0.6 → harder
      const spawnMinX = width * (0.25 + diffLane * 0.08);
      const spawnMaxX = width * (0.75 - diffLane * 0.08);

      let x = spawnMinX + Math.random() * (spawnMaxX - spawnMinX);
      let type = Math.random() < 0.7 ? "tree" : "rock";

      // slightly more rocks late-game
      if (state.distance > 450 && Math.random() < 0.15) {
        type = "rock";
      }

      if (type === "tree") {
        state.obstacles.push({
          type: "tree",
          x,
          y: height + 60,
          width: 26,
          height: 60,
        });
      } else {
        state.obstacles.push({
          type: "rock",
          x,
          y: height + 30,
          radius: 14,
        });
      }
    };

    const updateObstacles = (dt, worldSpeed) => {
      const { height } = canvas;
      // move up
      state.obstacles.forEach((ob) => {
        ob.y -= worldSpeed * dt;
      });
      // remove off-screen
      state.obstacles = state.obstacles.filter((ob) => ob.y > -80);

      // spawn with distance-based density
      state.spawnTimer += dt;
      const distFactor = Math.min(state.distance / 400, 1.2); // caps density boost
      const baseInterval = 0.6 / (1 + distFactor);
      const interval = Math.max(0.2, baseInterval - state.speed * 0.0012);

      while (state.spawnTimer >= interval) {
        state.spawnTimer -= interval;
        spawnObstacle();
      }
    };

    const drawObstacles = () => {
      state.obstacles.forEach((ob) => {
        if (ob.type === "tree") {
          // trunk (pencil brown)
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = "#4a2b1a";
          ctx.beginPath();
          ctx.moveTo(ob.x, ob.y - ob.height);
          ctx.lineTo(ob.x, ob.y);
          ctx.stroke();

          // foliage (light green fill + black outline)
          ctx.beginPath();
          ctx.moveTo(ob.x, ob.y - ob.height - 8);
          ctx.lineTo(ob.x - ob.width / 2, ob.y - ob.height / 2);
          ctx.lineTo(ob.x + ob.width / 2, ob.y - ob.height / 2);
          ctx.closePath();
          ctx.fillStyle = "#c4f5b0";
          ctx.fill();
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (ob.type === "rock") {
          ctx.beginPath();
          ctx.ellipse(
            ob.x,
            ob.y,
            ob.radius + 2,
            ob.radius - 2,
            0.2,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = "#ddd9ff"; // lilac rock
          ctx.fill();
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    };

    const checkCollisions = () => {
      const sx = state.skierX;
      const sy = state.skierY;
      const sr = 14;

      for (const ob of state.obstacles) {
        if (ob.type === "rock") {
          const dx = sx - ob.x;
          const dy = sy - ob.y;
          const r = sr + ob.radius - 3;
          if (dx * dx + dy * dy < r * r) {
            triggerCrash("rock");
            return;
          }
        } else if (ob.type === "tree") {
          const centerX = ob.x;
          const centerY = ob.y - ob.height / 2;
          const dx = sx - centerX;
          const dy = sy - centerY;
          const treeRadius = 16;
          const r = sr + treeRadius;
          if (dx * dx + dy * dy < r * r) {
            triggerCrash("tree");
            return;
          }
        }
      }
    };

    // --------- SNOW ----------
    const updateSnow = (dt) => {
      const { width, height } = canvas;
      state.snowTimer += dt;

      while (state.snowTimer >= 0.05) {
        state.snowTimer -= 0.05;
        if (Math.random() < 0.4) {
          state.snowflakes.push({
            x: Math.random() * width,
            y: -10,
            radius: 1 + Math.random() * 1.5,
            speed: 40 + Math.random() * 60,
          });
        }
      }

      state.snowflakes.forEach((f) => {
        f.y += f.speed * dt;
      });

      state.snowflakes = state.snowflakes.filter((f) => f.y < height + 12);
    };

    const drawSnow = () => {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      state.snowflakes.forEach((f) => {
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    // --------- YETI ----------
    const updateYeti = (dt, worldSpeed) => {
      const { height } = canvas;

      // spawn after some distance
      if (!state.yeti.active && state.distance > 350) {
        state.yeti.active = true;
        state.yeti.x = state.skierX;
        state.yeti.y = height + 80;
        state.yeti.speed = worldSpeed * 0.9 + 60;
      }

      if (!state.yeti.active) return;

      // move up slope
      state.yeti.y -= state.yeti.speed * dt;

      // chase horizontally
      const chaseSpeedX = 90;
      if (state.yeti.x < state.skierX - 5) {
        state.yeti.x += chaseSpeedX * dt;
      } else if (state.yeti.x > state.skierX + 5) {
        state.yeti.x -= chaseSpeedX * dt;
      }

      // collision
      const dx = state.skierX - state.yeti.x;
      const dy = state.skierY - state.yeti.y;
      const r = 18 + 18; // radii
      if (dx * dx + dy * dy < r * r) {
        triggerCrash("yeti");
      }

      // if off top for some reason, reset
      if (state.yeti.y < -60) {
        state.yeti.active = false;
      }
    };

    const drawYeti = () => {
      if (!state.yeti.active) return;
      const { x, y } = state.yeti;

      ctx.save();
      ctx.lineWidth = 2;
      // body
      ctx.fillStyle = "#f5f5ff";
      ctx.strokeStyle = "#000000";
      ctx.beginPath();
      ctx.ellipse(x, y, 18, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // horns
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 16);
      ctx.lineTo(x - 4, y - 22);
      ctx.lineTo(x - 1, y - 14);
      ctx.moveTo(x + 10, y - 16);
      ctx.lineTo(x + 4, y - 22);
      ctx.lineTo(x + 1, y - 14);
      ctx.stroke();

      // eyes
      ctx.beginPath();
      ctx.arc(x - 5, y - 4, 2, 0, Math.PI * 2);
      ctx.arc(x + 5, y - 4, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#000000";
      ctx.fill();

      // mouth
      ctx.beginPath();
      ctx.moveTo(x - 8, y + 6);
      ctx.lineTo(x + 8, y + 6);
      ctx.stroke();
      ctx.restore();
    };

    // --------- DRAW HELPERS ----------
    const drawDoodleBackground = () => {
      const { width, height } = canvas;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // slope borders
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(width * 0.2, 0);
      ctx.lineTo(width * 0.15, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(width * 0.8, 0);
      ctx.lineTo(width * 0.85, height);
      ctx.stroke();

      // notebook vertical lines
      ctx.strokeStyle = "rgba(0,0,255,0.15)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 32) {
        const wobble = Math.sin((x + state.offsetY * 0.02) * 0.1) * 2;
        ctx.beginPath();
        ctx.moveTo(x + wobble, 0);
        ctx.lineTo(x + wobble, height);
        ctx.stroke();
      }

      // doodle bumps
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      const h = height;
      const scroll = state.offsetY % (h + 120);

      for (let i = 0; i < 12; i++) {
        const yCycle = (i * 120 + scroll) % (h + 120);
        const baseY = h + 60 - yCycle;
        const x = width * 0.2 + (i % 5) * (width * 0.12) + (i * 7) % 25;

        ctx.beginPath();
        ctx.moveTo(x - 10, baseY);
        ctx.lineTo(x + 10, baseY + 4);
        ctx.stroke();
      }
    };

    const drawSkier = () => {
      const { skierX, skierY, skierWidth, skierHeight } = state;
      if (state.ready) {
        ctx.save();
        ctx.translate(skierX, skierY);
        ctx.drawImage(
          skierImg,
          -skierWidth / 2,
          -skierHeight / 2,
          skierWidth,
          skierHeight
        );
        ctx.restore();
      } else {
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.moveTo(skierX, skierY - 20);
        ctx.lineTo(skierX - 14, skierY + 20);
        ctx.lineTo(skierX + 14, skierY + 20);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(skierX - 18, skierY + 24);
        ctx.lineTo(skierX + 18, skierY + 14);
        ctx.stroke();
      }
    };

    const drawHUD = () => {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(8, 8, 210, 70);

      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.strokeRect(8, 8, 210, 70);

      ctx.fillStyle = "#000000";
      ctx.font = "12px monospace";
      ctx.textAlign = "left";

      ctx.fillText("MONAD SKI", 16, 22);
      ctx.fillText(`Distance: ${Math.floor(state.distance)}m`, 16, 36);
      ctx.fillText(`Crashes: ${state.crashes}`, 16, 50);
      ctx.fillText(`Best: ${Math.floor(state.bestDistance)}m`, 16, 64);
    };

    const drawStatusOverlay = () => {
      const { width, height } = canvas;
      if (state.status === "playing") return;

      ctx.save();
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;

      const boxW = Math.min(360, width - 40);
      const boxH = state.status === "menu" ? 110 : 130;
      const boxX = width / 2 - boxW / 2;
      const boxY = height / 2 - boxH / 2;

      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.fillStyle = "#000000";

      if (state.status === "menu") {
        ctx.font = "20px monospace";
        ctx.fillText("DOODLE SKI", width / 2, boxY + 32);
        ctx.font = "12px monospace";
        ctx.fillText("Press SPACE / CLICK / TAP", width / 2, boxY + 56);
        ctx.fillText("to START SKIING", width / 2, boxY + 72);
      } else if (state.status === "gameover") {
        let title = "TREED.";
        let line1 = "You became one with the doodle tree.";
        if (state.deathReason === "rock") {
          title = "STONED.";
          line1 = "Notebook physics yeeted you into a rock.";
        } else if (state.deathReason === "yeti") {
          title = "EATEN.";
          line1 = "The doodle yeti finally caught you.";
        }

        ctx.font = "24px monospace";
        ctx.fillText(title, width / 2, boxY + 30);

        ctx.font = "12px monospace";
        ctx.fillText(line1, width / 2, boxY + 52);
        ctx.fillText(
          `Run: ${Math.floor(state.distance)}m · Best: ${Math.floor(
            state.bestDistance
          )}m`,
          width / 2,
          boxY + 70
        );
        ctx.fillText("Press SPACE / CLICK / TAP", width / 2, boxY + 92);
        ctx.fillText(
          "to RETRY (mountain forgives no one)",
          width / 2,
          boxY + 108
        );
      }

      ctx.restore();
    };

    // --------- MAIN LOOP ----------
    let animationFrameId;

    const loop = (timestamp) => {
      if (!state.lastTime) state.lastTime = timestamp;
      const dt = (timestamp - state.lastTime) / 1000;
      state.lastTime = timestamp;

      const moveSpeed = 220;
      const worldSpeed = state.speed;

      // snow always animates
      updateSnow(dt);

      if (state.status === "playing") {
        state.distance += worldSpeed * dt * 0.05;
        state.offsetY += worldSpeed * dt;

        // accelerate a bit
        state.speed = Math.min(state.speed + 5 * dt, 480);

        // difficulty-based lane narrowing
        const difficulty = Math.min(state.distance / 600, 0.6);
        const minX = canvas.width * (0.22 + difficulty * 0.1);
        const maxX = canvas.width * (0.78 - difficulty * 0.1);

        // lateral
        if (state.keys.left) state.skierX -= moveSpeed * dt;
        if (state.keys.right) state.skierX += moveSpeed * dt;

        if (state.skierX < minX) state.skierX = minX;
        if (state.skierX > maxX) state.skierX = maxX;

        updateObstacles(dt, worldSpeed);
        checkCollisions();
        updateYeti(dt, worldSpeed);
      } else {
        // slow background scroll when idle
        state.offsetY += worldSpeed * dt * 0.2;
      }

      // draw
      drawDoodleBackground();
      drawSnow();
      drawObstacles();
      drawYeti();
      drawSkier();
      drawHUD();
      drawStatusOverlay();

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    // --------- CLEANUP ----------
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("touchcancel", handleTouchEnd);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // START / RETRY button → reuse Space key logic
  const handleStartRetryClick = () => {
    if (typeof window === "undefined") return;
    const event = new KeyboardEvent("keydown", { key: " ", code: "Space" });
    window.dispatchEvent(event);
  };

  return (
    <main
      className="min-h-screen w-full flex items-center justify-center px-4 py-6 sm:py-10"
      style={{
        backgroundImage: "url('/bg/bg4.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        cursor: "url(/cursors/pencil.png) 0 24, auto",
      }}
    >
      <div className="w-full max-w-4xl">
        <DoodleWindow
          title="Doodle Ski"
          modeLabel="Arcade"
          backHref="/"
          backLabel="Back to Doodleverse"
        >
          <div className="space-y-4 sm:space-y-6">
            {/* Description + Start/Retry button */}
            <section className="bg-white/95 border-[3px] border-black rounded-2xl shadow-[4px_4px_0_rgba(0,0,0,1)] px-4 sm:px-6 py-4 sm:py-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold">Doodle Ski</h1>
                  <p className="text-sm sm:text-base font-semibold text-purple-700 mt-1">
                    Speed is temporary. Trees are forever.
                  </p>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed max-w-2xl text-neutral-800">
                    Welcome to Doodle Ski, the world’s jankiest downhill
                    simulator where your hand-drawn skier slips, slides, and
                    crashes through a cursed notebook mountain.
                  </p>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed max-w-2xl text-neutral-900">
                    Avoid trees. <br />
                    Avoid rocks. <br />
                    Avoid shame. <br />
                    <span className="italic">Good luck, bro.</span>
                  </p>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-1">
                  <button
                    onClick={handleStartRetryClick}
                    className="px-4 py-1.5 border-[2px] border-black bg-pink-200 rounded-full shadow-[3px_3px_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_rgba(0,0,0,1)] transition-transform text-xs sm:text-sm font-semibold"
                  >
                    START / RETRY
                  </button>
                  <span className="text-[10px] sm:text-xs text-neutral-700 italic">
                    Space, tap, click, or button — mountain doesn&apos;t care.
                  </span>
                </div>
              </div>
            </section>

            {/* Game window */}
            <section className="rounded-2xl border-[3px] border-black bg-white/95 shadow-[6px_6px_0_rgba(0,0,0,1)] overflow-hidden">
              <div className="p-2 sm:p-3 bg-slate-100">
                <div className="relative w-full mx-auto max-w-xl">
                  <canvas
                    ref={canvasRef}
                    className="w-full rounded-xl border-2 border-black bg-white touch-none"
                  />
                </div>
              </div>
            </section>

            {/* How to play */}
            <section className="bg-white text-black border-[3px] border-black rounded-2xl shadow-[3px_3px_0_rgba(0,0,0,1)] px-4 py-3 text-[11px] sm:text-sm">
              <span className="font-semibold">How to play:</span>{" "}
              Move with <span className="font-mono">◀ ▶</span> arrow keys or tap /
              click left and right on the slope. Press{" "}
              <span className="font-mono">Space</span> or the{" "}
              <span className="font-mono">START / RETRY</span> button to start or
              retry. Avoid trees, rocks, random disasters, and the doodle yeti.
              Survive longer than your last run.
            </section>
          </div>
        </DoodleWindow>
      </div>
    </main>
  );
}
