// src/app/flappy/page.js
// src/app/flappy/page.js
"use client";

import { useEffect, useRef, useState } from "react";
import DoodleWindow from "@/components/DoodleWindow";

export default function DoodleFlappyPage() {
  const canvasRef = useRef(null);

  // UI state
  const [isRunning, setIsRunning] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  // Game internals (with tuned physics)
  const gameRef = useRef({
    logicalWidth: 480,
    logicalHeight: 640,
    playerX: 120,
    playerY: 320,
    playerRadius: 20,
    velocity: 0,
    gravity: 0.0014, // LIGHTER (was 0.0018)
    flapImpulse: -0.7, // STRONGER BOUNCE (was -0.55)
    pipes: [],
    pipeSpawnInterval: 1800, // MORE SPACE (was 1600)
    timeSinceLastPipe: 0,
    pipeSpeed: 0.18, // SLOWER (was 0.2)
    lastTime: 0,
    particles: [],
  });

  const animRef = useRef(null);
  const isRunningRef = useRef(false);
  const isGameOverRef = useRef(false);
  const scoreRef = useRef(0);
  const bestScoreRef = useRef(0);

  // Sync refs to state
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);
  useEffect(() => {
    isGameOverRef.current = isGameOver;
  }, [isGameOver]);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  useEffect(() => {
    bestScoreRef.current = bestScore;
  }, [bestScore]);

  // Load best score
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("doodleFlappyBestScore");
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val)) {
          setBestScore(val);
          bestScoreRef.current = val;
        }
      }
    } catch {}
  }, []);

  // Canvas init + responsive sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { logicalWidth, logicalHeight } = gameRef.current;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const { width } = parent.getBoundingClientRect();
      const height = (logicalHeight / logicalWidth) * width;

      canvas.width = logicalWidth;
      canvas.height = logicalHeight;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";

      if (!isRunningRef.current) {
        const ctx = canvas.getContext("2d");
        drawBackground(ctx, logicalWidth, logicalHeight);
        drawPlayer(ctx, logicalWidth * 0.25, logicalHeight * 0.5, 20);
        ctx.font = "20px system-ui";
        ctx.fillStyle = "#52525b";
        ctx.textAlign = "center";
        ctx.fillText(
          "Tap / click / space to flap",
          logicalWidth / 2,
          logicalHeight - 40
        );
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { logicalWidth, logicalHeight } = gameRef.current;

    const flap = () => {
      if (!isRunningRef.current || isGameOverRef.current) return;
      const g = gameRef.current;
      g.velocity = g.flapImpulse;
      spawnParticles(g, 6);
    };

    const onKeyDown = (e) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        flap();
      }
    };

    const onPointerDown = (e) => {
      e.preventDefault();
      flap();
    };

    if (isRunning) {
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("mousedown", onPointerDown);
      window.addEventListener("touchstart", onPointerDown, { passive: false });

      initGameState(gameRef, logicalWidth, logicalHeight);

      const endGame = () => {
        if (isGameOverRef.current) return;
        isGameOverRef.current = true;
        setIsRunning(false);
        setIsGameOver(true);
        drawGameOver(ctx, logicalWidth, logicalHeight, scoreRef.current);
      };

      const addScore = (newScore) => {
        setScore(newScore);
        scoreRef.current = newScore;

        if (newScore > bestScoreRef.current) {
          setBestScore(newScore);
          bestScoreRef.current = newScore;
          localStorage.setItem("doodleFlappyBestScore", newScore);
        }
      };

      const loop = (timestamp) => {
        if (!isRunningRef.current) return;

        const g = gameRef.current;

        if (!g.lastTime) g.lastTime = timestamp;
        let dt = timestamp - g.lastTime;
        g.lastTime = timestamp;

        dt = Math.min(dt, 40); // safety clamp

        updateGame(gameRef, dt, scoreRef.current, endGame, addScore);
        renderGame(ctx, g, scoreRef.current, bestScoreRef.current);

        if (!isGameOverRef.current) {
          animRef.current = requestAnimationFrame(loop);
        } else {
          drawGameOver(ctx, logicalWidth, logicalHeight, scoreRef.current);
        }
      };

      animRef.current = requestAnimationFrame(loop);
    }

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("touchstart", onPointerDown);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isRunning]);

  const handleStart = () => {
    setScore(0);
    scoreRef.current = 0;
    setIsGameOver(false);
    isGameOverRef.current = false;
    setIsRunning(true);
    isRunningRef.current = true;
  };

  const handleRestart = () => handleStart();

  /* ------------------ UI ------------------ */

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-cover bg-center relative"
      style={{ backgroundImage: "url('/bg/bg4.png')" }}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 w-full max-w-3xl px-4 py-8 sm:py-12">
        <DoodleWindow
          title="Doodle Flappy"
          subtitle="Tap, flap, cope. Avoid pipes and bad life choices."
          modeLabel="Game"
          backHref="/home"
          backLabel="Back to Doodleverse"
        >
          {/* Flavour text under subtitle */}
          <p className="text-xs text-purple-700 mb-3">
            Running on pure copium at 10k TPS.
          </p>

          {/* Scoreboard */}
          <div className="flex justify-between mb-3 text-xs sm:text-sm font-mono">
            <div>SCORE: {score}</div>
            <div>BEST: {bestScore}</div>
          </div>

          {/* Canvas */}
          <div className="w-full max-w-md mx-auto mb-4">
            <div className="relative w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-zinc-700 bg-white shadow-[4px_4px_0_rgba(0,0,0,0.45)] overflow-hidden">
              <canvas
                ref={canvasRef}
                className="block w-full h-full touch-none"
              />
            </div>
          </div>

          {/* Buttons row */}
          <div className="flex justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              {!isRunning && !isGameOver && (
                <button
                  onClick={handleStart}
                  className="px-4 py-2 bg-lime-300 border border-black rounded-xl shadow-[3px_3px_0_rgba(0,0,0,0.6)] text-xs sm:text-sm"
                >
                  START FLAPPING
                </button>
              )}

              {isGameOver && (
                <button
                  onClick={handleRestart}
                  className="px-4 py-2 bg-amber-300 border border-black rounded-xl shadow-[3px_3px_0_rgba(0,0,0,0.6)] text-xs sm:text-sm"
                >
                  RETRY
                </button>
              )}
            </div>
          </div>

          {isGameOver && (
            <div className="mt-3 text-center text-red-600 text-sm font-semibold">
              You bonked the pipes, bro.
            </div>
          )}
        </DoodleWindow>
      </div>
    </div>
  );
}

/* ------------------ DRAW HELPERS ------------------ */

function drawBackground(ctx, w, h) {
  ctx.fillStyle = "#fdfaf2";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "#3f3f46";
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.setLineDash([]);

  ctx.strokeStyle = "#e4e4e7";
  for (let y = 60; y < h - 40; y += 32) {
    const wobble = Math.sin(y / 18) * 4;
    ctx.beginPath();
    ctx.moveTo(20 + wobble, y);
    ctx.lineTo(w - 20 - wobble, y);
    ctx.stroke();
  }
}

function drawPlayer(ctx, x, y, r) {
  ctx.fillStyle = "#7c3aed";
  ctx.beginPath();
  ctx.roundRect(x - r, y - r, r * 2, r * 2, 10);
  ctx.fill();

  ctx.strokeStyle = "#18181b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x - r, y - r, r * 2, r * 2, 10);
  ctx.stroke();
}

function drawPipes(ctx, pipes, w, h, copiumMode) {
  pipes.forEach((pipe) => {
    const { x, width, gapY, gapHeight } = pipe;

    const color = copiumMode ? "#a855f7" : "#22c55e";
    ctx.fillStyle = color;
    ctx.strokeStyle = "#18181b";
    ctx.lineWidth = 2;

    // Top pipe
    ctx.beginPath();
    ctx.roundRect(x, 0, width, gapY, 8);
    ctx.fill();
    ctx.stroke();

    // Bottom pipe
    ctx.beginPath();
    ctx.roundRect(x, gapY + gapHeight, width, h - (gapY + gapHeight), 8);
    ctx.fill();
    ctx.stroke();
  });
}

function drawParticles(ctx, particles) {
  particles.forEach((p) => {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = "#a855f7";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function drawHUD(ctx, w, score, bestScore, copiumMode) {
  ctx.font = "bold 28px system-ui";
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  ctx.fillText(score, w / 2, 50);
}

function drawGameOver(ctx, w, h, score) {
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "white";
  ctx.strokeStyle = "black";
  ctx.lineWidth = 3;

  const bw = 260;
  const bh = 140;
  const bx = (w - bw) / 2;
  const by = (h - bh) / 2;

  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 16);
  ctx.fill();
  ctx.stroke();

  ctx.font = "24px system-ui";
  ctx.fillStyle = "#111";
  ctx.textAlign = "center";
  ctx.fillText("COPIUM RUGGED", w / 2, by + 40);

  ctx.font = "16px system-ui";
  ctx.fillStyle = "#555";
  ctx.fillText(`Score: ${score}`, w / 2, by + 80);
}

/* ------------------ GAME LOGIC ------------------ */

function initGameState(gameRef, w, h) {
  const g = gameRef.current;
  g.playerX = 120;
  g.playerY = h / 2;
  g.velocity = 0;
  g.gravity = 0.0014;
  g.flapImpulse = -0.7;
  g.pipes = [];
  g.pipeSpawnInterval = 1800;
  g.timeSinceLastPipe = 0;
  g.pipeSpeed = 0.18;
  g.lastTime = 0;
  g.particles = [];
}

function spawnPipe(gameRef, w, h, score) {
  const g = gameRef.current;

  const pipeWidth = 90;

  const minGap = 150;
  const maxGap = 220;
  const gapShrink = Math.min(score * 2, 40);
  const gapHeight = Math.max(minGap, maxGap - gapShrink);

  const topMargin = 80;
  const bottomMargin = 120;
  const maxGapTop = h - bottomMargin - gapHeight;
  const gapY = topMargin + Math.random() * (maxGapTop - topMargin);

  g.pipes.push({
    x: w + pipeWidth,
    width: pipeWidth,
    gapY,
    gapHeight,
    passed: false,
  });
}

function spawnParticles(g, count) {
  for (let i = 0; i < count; i++) {
    g.particles.push({
      x: g.playerX - 8 + Math.random() * 6,
      y: g.playerY + Math.random() * 8 - 4,
      vx: -0.2 - Math.random() * 0.1,
      vy: (Math.random() - 0.5) * 0.2,
      alpha: 0.9,
      decay: 0.005 + Math.random() * 0.004,
      size: 2 + Math.random() * 2,
    });
  }
}

function updateGame(gameRef, dt, score, onGameOver, onScoreChange) {
  const g = gameRef.current;
  const w = g.logicalWidth;
  const h = g.logicalHeight;

  // Gravity
  g.velocity += g.gravity * dt;
  g.playerY += g.velocity * dt;

  // Move pipes
  g.timeSinceLastPipe += dt;
  if (g.timeSinceLastPipe > g.pipeSpawnInterval) {
    spawnPipe(gameRef, w, h, score);
    g.timeSinceLastPipe = 0;
  }

  g.pipes.forEach((p) => {
    p.x -= g.pipeSpeed * dt;
  });

  g.pipes = g.pipes.filter((p) => p.x + p.width > -50);

  // Score
  g.pipes.forEach((p) => {
    if (!p.passed && p.x + p.width < g.playerX - g.playerRadius) {
      p.passed = true;
      onScoreChange(score + 1);
      score = score + 1;
    }
  });

  // Particles
  g.particles.forEach((p) => {
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.alpha -= p.decay * dt;
  });
  g.particles = g.particles.filter((p) => p.alpha > 0);

  // Collision with top/bottom
  if (g.playerY - g.playerRadius < 10 || g.playerY + g.playerRadius > h - 10) {
    onGameOver();
    return;
  }

  // Collision with pipes
  for (const p of g.pipes) {
    const hitX =
      g.playerX + g.playerRadius > p.x &&
      g.playerX - g.playerRadius < p.x + p.width;

    if (hitX) {
      const insideGap =
        g.playerY - g.playerRadius > p.gapY &&
        g.playerY + g.playerRadius < p.gapY + p.gapHeight;

      if (!insideGap) {
        onGameOver();
        return;
      }
    }
  }
}

function renderGame(ctx, g, score, bestScore) {
  const w = g.logicalWidth;
  const h = g.logicalHeight;

  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, w, h);

  const copiumMode = score >= 20;

  if (copiumMode) {
    ctx.fillStyle = "rgba(124,58,237,0.05)";
    ctx.fillRect(0, 0, w, h);
  }

  drawPipes(ctx, g.pipes, w, h, copiumMode);
  drawParticles(ctx, g.particles);
  drawPlayer(ctx, g.playerX, g.playerY, g.playerRadius);
  drawHUD(ctx, w, score, bestScore, copiumMode);
}
