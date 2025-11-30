"use client";

import React, { useRef, useEffect, useState } from "react";
import DoodleWindow from "@/components/DoodleWindow";

// ------------------------------------------------------
//  GAME CONSTANTS (easier mode tuned for gameplay feel)
// ------------------------------------------------------
const LANE_COUNT = 12;

// Enemy movement
const ENEMY_BASE_SPEED = 0.16;
const ENEMY_SPEED_PER_WAVE = 0.02;

// Spawn timing
const ENEMY_BASE_SPAWN = 1.4;
const ENEMY_SPAWN_MIN = 0.5;
const ENEMY_SPAWN_PER_WAVE = 0.04;

// Bullets
const BULLET_SPEED = 1.4;
const COLLISION_THRESHOLD = 0.09;

// Scoring
const SCORE_PER_KILL = 10;
const KILLS_PER_WAVE = 14;

// ------------------------------------------------------
//  FUNNEL GEOMETRY
// ------------------------------------------------------
function buildFunnelGeometry(cx, cy, outerR, innerR) {
  const outer = [];
  const inner = [];

  for (let i = 0; i < LANE_COUNT; i++) {
    const ang = (i / LANE_COUNT) * Math.PI * 2 - Math.PI / 2;

    // Outer ring (standard polygon)
    outer.push({
      x: cx + Math.cos(ang) * outerR,
      y: cy + Math.sin(ang) * outerR,
    });

    // Inner ring (perspective squished)
    inner.push({
      x: cx + Math.cos(ang) * innerR * 0.65,
      y: cy + Math.sin(ang) * innerR * 0.25,
    });
  }
  return { outer, inner };
}

// linear interpolation between inner ↔ outer
function lerpPoint(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

// ------------------------------------------------------
//  DRAW FUNNEL + LANES + ENEMIES + PLAYER
// ------------------------------------------------------
function drawArena(ctx, width, height, options = {}) {
  const {
    playerLane = 0,
    showPlayer = true,
    enemies = [],
    bullets = [],
  } = options;

  const cx = width / 2;
  const cy = height / 2;
  const outerRadius = Math.min(width, height) * 0.46;
  const innerRadius = outerRadius * 0.4;

  const { outer, inner } = buildFunnelGeometry(cx, cy, outerRadius, innerRadius);

  // --- BACKGROUND
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  // space glow
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerRadius * 1.2);
  grad.addColorStop(0, "rgba(37,99,235,0.35)");
  grad.addColorStop(0.5, "rgba(15,23,42,0.95)");
  grad.addColorStop(1, "rgba(0,0,0,1)");

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(outer[0].x, outer[0].y);
  for (let i = 1; i < outer.length; i++) ctx.lineTo(outer[i].x, outer[i].y);
  ctx.closePath();
  ctx.clip();

  ctx.fillStyle = grad;
  ctx.fillRect(
    cx - outerRadius * 1.3,
    cy - outerRadius * 1.3,
    outerRadius * 2.6,
    outerRadius * 2.6
  );
  ctx.restore();

  // --- OUTER POLYGON
  ctx.beginPath();
  ctx.moveTo(outer[0].x, outer[0].y);
  for (let i = 1; i < outer.length; i++) ctx.lineTo(outer[i].x, outer[i].y);
  ctx.closePath();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#22d3ee"; // bright cyan
  ctx.stroke();

  // --- INNER POLYGON
  ctx.beginPath();
  ctx.moveTo(inner[0].x, inner[0].y);
  for (let i = 1; i < inner.length; i++) ctx.lineTo(inner[i].x, inner[i].y);
  ctx.closePath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#38bdf8";
  ctx.stroke();

  // --- LANES
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#1d4ed8";
  for (let i = 0; i < LANE_COUNT; i++) {
    ctx.beginPath();
    ctx.moveTo(inner[i].x, inner[i].y);
    ctx.lineTo(outer[i].x, outer[i].y);
    ctx.stroke();
  }

  // --- CENTER
  ctx.beginPath();
  ctx.fillStyle = "#020617";
  ctx.arc(cx, cy, innerRadius * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#38bdf8";
  ctx.stroke();

  // --- ENEMIES (pink/red rhombus)
  enemies.forEach((enemy) => {
    const lane = enemy.lane % LANE_COUNT;
    const pInner = inner[lane];
    const pOuter = outer[lane];
    const pos = lerpPoint(pInner, pOuter, enemy.progress);

    const size = 10 + enemy.progress * 6;
    const half = size / 2;

    const angle = Math.atan2(pOuter.y - pInner.y, pOuter.x - pInner.x);

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle + Math.PI / 4);

    ctx.beginPath();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#fb7185";
    ctx.fillStyle = "rgba(248,113,113,0.95)";
    ctx.moveTo(-half, 0);
    ctx.lineTo(0, -half);
    ctx.lineTo(half, 0);
    ctx.lineTo(0, half);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  });

  // --- BULLETS (yellow streaks)
  bullets.forEach((bullet) => {
    const lane = bullet.lane % LANE_COUNT;
    const pInner = inner[lane];
    const pOuter = outer[lane];
    const pos = lerpPoint(pInner, pOuter, bullet.progress);

    const angle = Math.atan2(pOuter.y - pInner.y, pOuter.x - pInner.x);
    const len = 18;
    const x2 = pos.x - Math.cos(angle) * len;
    const y2 = pos.y - Math.sin(angle) * len;

    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#facc15";
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });

  // --- PLAYER SHIP (Tempest yellow claw)
  if (showPlayer) {
    const iCenter = playerLane % LANE_COUNT;
    const iLeft = (playerLane - 1 + LANE_COUNT) % LANE_COUNT;
    const iRight = (playerLane + 1) % LANE_COUNT;

    const baseCenter = outer[iCenter];
    const baseLeftRaw = outer[iLeft];
    const baseRightRaw = outer[iRight];

    const baseLeft = {
      x: (baseCenter.x * 2 + baseLeftRaw.x) / 3,
      y: (baseCenter.y * 2 + baseLeftRaw.y) / 3,
    };
    const baseRight = {
      x: (baseCenter.x * 2 + baseRightRaw.x) / 3,
      y: (baseCenter.y * 2 + baseRightRaw.y) / 3,
    };

    const nx = baseCenter.x - cx;
    const ny = baseCenter.y - cy;
    const len = Math.hypot(nx, ny) || 1;
    const nose = {
      x: baseCenter.x + (nx / len) * 16,
      y: baseCenter.y + (ny / len) * 16,
    };

    ctx.beginPath();
    ctx.fillStyle = "#facc15"; // yellow
    ctx.strokeStyle = "#fefce8";
    ctx.lineWidth = 2;
    ctx.moveTo(nose.x, nose.y);
    ctx.lineTo(baseLeft.x, baseLeft.y);
    ctx.lineTo(baseRight.x, baseRight.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

// ------------------------------------------------------
//  MAIN COMPONENT
// ------------------------------------------------------
export default function DoodleTempest() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 600 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [lives, setLives] = useState(4);
  const [gamePhase, setGamePhase] = useState("READY"); // READY | RUNNING | GAME_OVER

  const gameRef = useRef({
    playerLane: 0,
    bullets: [],
    enemies: [],
    spawnTimer: 0,
    lastTime: null,
    kills: 0,
  });

  const animRef = useRef(null);

  // ------------------------------------------------------
  // Resize
  // ------------------------------------------------------
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const size = Math.max(260, Math.min(rect.width - 20, 720));
      setCanvasSize({ width: size, height: size });
    };
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ------------------------------------------------------
  // Control actions
  // ------------------------------------------------------
  const rotateLeft = () => {
    gameRef.current.playerLane =
      (gameRef.current.playerLane - 1 + LANE_COUNT) % LANE_COUNT;

    if (gamePhase !== "RUNNING") drawStatic();
  };

  const rotateRight = () => {
    gameRef.current.playerLane =
      (gameRef.current.playerLane + 1) % LANE_COUNT;

    if (gamePhase !== "RUNNING") drawStatic();
  };

  const fireBullet = () => {
    if (gamePhase !== "RUNNING") return;
    gameRef.current.bullets.push({
      lane: gameRef.current.playerLane,
      progress: 1,
    });
  };

  const startGame = () => {
    setScore(0);
    setWave(1);
    setLives(4);
    setGamePhase("RUNNING");

    gameRef.current = {
      playerLane: 0,
      bullets: [],
      enemies: [],
      spawnTimer: 0,
      lastTime: null,
      kills: 0,
    };
  };

  const handleGameOver = () => {
    setHighScore((h) => Math.max(h, score));
    setGamePhase("GAME_OVER");
  };

  // ------------------------------------------------------
  // Static render
  // ------------------------------------------------------
  function drawStatic() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { playerLane, enemies, bullets } = gameRef.current;

    drawArena(ctx, canvas.width, canvas.height, {
      playerLane,
      showPlayer: true,
      enemies,
      bullets,
    });
  }

  // ------------------------------------------------------
  // Keyboard controls
  // ------------------------------------------------------
  useEffect(() => {
    const handler = (e) => {
      if (e.repeat) return;

      if (e.code === "ArrowLeft" || e.code === "KeyA") rotateLeft();
      if (e.code === "ArrowRight" || e.code === "KeyD") rotateRight();

      if (e.code === "Space") {
        e.preventDefault();
        if (gamePhase === "READY" || gamePhase === "GAME_OVER") startGame();
        else fireBullet();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gamePhase]);

  // ------------------------------------------------------
  // MAIN GAME LOOP
  // ------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (gamePhase !== "RUNNING") {
      cancelAnimationFrame(animRef.current);
      return;
    }

    const loop = (ts) => {
      const g = gameRef.current;

      if (g.lastTime == null) g.lastTime = ts;
      const dt = (ts - g.lastTime) / 1000;
      g.lastTime = ts;

      // --- spawn enemies
      g.spawnTimer += dt;
      const spawnInterval = Math.max(
        ENEMY_SPAWN_MIN,
        ENEMY_BASE_SPAWN - ENEMY_SPAWN_PER_WAVE * (wave - 1)
      );
      if (g.spawnTimer >= spawnInterval) {
        g.spawnTimer -= spawnInterval;
        g.enemies.push({
          lane: Math.floor(Math.random() * LANE_COUNT),
          progress: 0,
        });
      }

      // --- move enemies
      const speed = ENEMY_BASE_SPEED + ENEMY_SPEED_PER_WAVE * (wave - 1);
      g.enemies.forEach((e) => (e.progress += speed * dt));

      // --- move bullets
      g.bullets.forEach((b) => (b.progress -= BULLET_SPEED * dt));
      g.bullets = g.bullets.filter((b) => b.progress > 0);

      // --- collisions
      const survivors = [];
      const hitBullets = new Set();
      let kills = 0;

      g.enemies.forEach((enemy) => {
        let dead = false;
        g.bullets.forEach((bullet, idx) => {
          if (
            bullet.lane === enemy.lane &&
            Math.abs(bullet.progress - enemy.progress) < COLLISION_THRESHOLD
          ) {
            dead = true;
            hitBullets.add(idx);
            kills++;
          }
        });
        if (!dead) survivors.push(enemy);
      });

      g.enemies = survivors;
      g.bullets = g.bullets.filter((_, i) => !hitBullets.has(i));

      if (kills > 0) {
        g.kills += kills;
        setScore((s) => s + kills * SCORE_PER_KILL);
        const newWave = 1 + Math.floor(g.kills / KILLS_PER_WAVE);
        if (newWave !== wave) setWave(newWave);
      }

      // --- leak check
      let leaks = 0;
      const newEnemies = [];
      g.enemies.forEach((e) => {
        if (e.progress >= 1) leaks++;
        else newEnemies.push(e);
      });
      g.enemies = newEnemies;

      if (leaks > 0) {
        setLives((l) => {
          const next = l - leaks;
          if (next <= 0) handleGameOver();
          return Math.max(next, 0);
        });
      }

      // --- render
      drawArena(ctx, canvas.width, canvas.height, {
        playerLane: g.playerLane,
        showPlayer: true,
        enemies: g.enemies,
        bullets: g.bullets,
      });

      if (gamePhase === "RUNNING") animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animRef.current);
  }, [gamePhase, canvasSize, wave]);

  // ------------------------------------------------------
  // RENDER UI
  // ------------------------------------------------------
  return (
    <main
      className="min-h-screen w-full flex items-center justify-center px-4 py-6 bg-cover bg-center"
      style={{
        backgroundImage: "url('/bg/bg4.png')",
        cursor: "url(/cursors/pencil.png) 0 24, auto",
      }}
    >
      <div className="w-full max-w-5xl">
        <DoodleWindow
          title="Doodle Tempest"
          subtitle="Survive the spiral. Rage at the sketch."
          modeLabel="Controls: ← → / A D · Space = Start / Shoot"
          backHref="/"
          backLabel="Back to Doodleverse"
        >
          {/* Intro copy */}
          <div className="mb-4 text-xs sm:text-sm md:text-base text-slate-800 leading-relaxed">
            <p>
              Enemies crawl up the glowing lanes from the center. Rotate your
              ship around the rim and blast anything trying to escape the
              vortex.
            </p>
            <p className="mt-1 text-[11px] text-purple-500 italic">
              Spiral intensity rising… hold your crayon.
            </p>
          </div>

          {/* STATS ROW */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-xs sm:text-sm">
            <div className="border-[2px] border-black rounded-xl bg-slate-50 px-3 py-2 flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wide">
                Score
              </span>
              <span className="text-base">{score}</span>
            </div>
            <div className="border-[2px] border-black rounded-xl bg-slate-50 px-3 py-2 flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wide">
                High Score
              </span>
              <span className="text-base">{highScore}</span>
            </div>
            <div className="border-[2px] border-black rounded-xl bg-slate-50 px-3 py-2 flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wide">
                Wave
              </span>
              <span className="text-base">{wave}</span>
            </div>
            <div className="border-[2px] border-black rounded-xl bg-slate-50 px-3 py-2 flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wide">
                Lives
              </span>
              <span className="text-base">
                {lives > 0 ? "❤".repeat(lives) : "☠"}
              </span>
            </div>
          </div>

          {/* BUTTONS */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <button
              onClick={startGame}
              className="flex-1 rounded-full bg-purple-600 hover:bg-purple-500 text-white border border-black py-2 text-xs sm:text-sm shadow-[0_3px_0_rgba(0,0,0,0.7)] active:translate-y-[1px]"
            >
              ENTER THE TEMPEST{" "}
              <span className="ml-1 text-[10px]">unleash the chaos</span>
            </button>

            <button
              onClick={startGame}
              className="flex-1 rounded-full bg-white hover:bg-slate-100 border border-black py-2 text-xs sm:text-sm"
            >
              TRY AGAIN{" "}
              <span className="ml-1 text-[10px]">
                redeploy the crayon soldier
              </span>
            </button>
          </div>

          {/* CANVAS AREA */}
          <div className="mb-3">
            <div
              ref={containerRef}
              className="w-full border-[3px] border-black rounded-2xl bg-black p-2 flex items-center justify-center"
            >
              <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className="rounded-xl w-full h-auto"
              />
            </div>
          </div>

          {/* DESKTOP INSTRUCTIONS */}
          <div className="hidden sm:flex justify-between text-[11px] sm:text-xs text-slate-700 mb-3">
            <div>
              <div>
                <strong>Move:</strong> ← → / A D
              </div>
              <div>
                <strong>Shoot:</strong> Space
              </div>
            </div>
            <div className="text-right text-[10px] sm:text-[11px] text-slate-500">
              {gamePhase === "READY" && (
                <>Press SPACE or ENTER THE TEMPEST to begin.</>
              )}
              {gamePhase === "GAME_OVER" && <>You were erased. Skill issue.</>}
              {gamePhase === "RUNNING" && <>Spiral stability: questionable.</>}
            </div>
          </div>

          {/* MOBILE CONTROLS */}
          <div className="mt-2 sm:mt-0 flex sm:hidden flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={rotateLeft}
                className="flex-1 rounded-full border border-black bg-slate-200 py-2 text-xs font-semibold"
              >
                ◀ LEFT
              </button>
              <button
                onClick={fireBullet}
                className="flex-1 rounded-full border border-black bg-yellow-300 py-2 text-xs font-semibold"
              >
                FIRE
              </button>
              <button
                onClick={rotateRight}
                className="flex-1 rounded-full border border-black bg-slate-200 py-2 text-xs font-semibold"
              >
                RIGHT ▶
              </button>
            </div>
            <div className="text-[10px] text-slate-600 text-center">
              Tap the arrows to rotate, yellow button to shoot. Spiral runs at
              10k TSS (Tiny Spiral Spins).
            </div>
          </div>
        </DoodleWindow>
      </div>
    </main>
  );
}
