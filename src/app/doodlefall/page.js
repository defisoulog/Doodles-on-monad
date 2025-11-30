"use client";

import { useEffect, useRef } from "react";
import DoodleWindow from "../../components/DoodleWindow";

export default function DoodlefallPage() {
  const canvasRef = useRef(null);
  const jumpRequestedRef = useRef(false);
  const resetRequestedRef = useRef(false); // request a full reset from React

  const handleMobileJump = () => {
    jumpRequestedRef.current = true;
  };

  const handleRetry = () => {
    resetRequestedRef.current = true;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 900;
    const height = 450;

    canvas.width = width;
    canvas.height = height;

    let lastTime = 0;

    const baseGroundY = height - 60;

    let baseSpeed = 3;
    let speed = baseSpeed;
    let distance = 0;
    let difficulty = 1;
    let vibeScore = 0;
    let lives = 3;

    let gameOver = false;

    const player = {
      x: 140,
      y: baseGroundY,
      width: 70,
      height: 70,
      velocityY: 0,
      onGround: true,
    };

    const GRAVITY = 0.6;
    const JUMP_FORCE = -14;

    // Hero image
    const heroImage = new Image();
    heroImage.src = "/games/pitfallhero.png";
    let heroLoaded = false;
    heroImage.onload = () => {
      heroLoaded = true;
    };

    // Decorations – jungle trees
    const trees = [];
    for (let i = 0; i < 10; i++) {
      trees.push({
        x: 80 + i * 120,
        h: 40 + Math.random() * 40,
      });
    }

    const vinesStatic = [
      { x: 220, top: 40, bottom: baseGroundY - 40 },
      { x: 640, top: 30, bottom: baseGroundY - 60 },
    ];

    // Pits
    const pits = [
      { x: 550, width: 90 },
      { x: 1000, width: 110 },
    ];

    function resetPit(pit) {
      pit.x = width + 300 + Math.random() * 500;
      pit.width = 70 + Math.random() * 90;
    }

    function isOverPit(px, pw) {
      const centerX = px + pw / 2;
      return pits.some((p) => centerX > p.x && centerX < p.x + p.width);
    }

    // ---------- OBSTACLES SYSTEM ----------

    const obstacles = [];

    function createObstacle(spawnX) {
      // Types: log, spikes, rock, vibe
      let pool = [];

      if (difficulty < 3) {
        pool = ["log", "vibe", "vibe", "spikes", "rock"];
      } else if (difficulty < 5) {
        pool = ["log", "spikes", "rock", "rock", "vibe"];
      } else {
        pool = ["log", "spikes", "rock", "rock", "rock", "vibe"];
      }

      const type = pool[Math.floor(Math.random() * pool.length)];

      if (type === "log") {
        const w = 60 + Math.random() * 40;
        const h = 28;
        return {
          type,
          x: spawnX,
          y: baseGroundY,
          width: w,
          height: h,
        };
      }

      if (type === "spikes") {
        const w = 40 + Math.random() * 40;
        const h = 35;
        return {
          type,
          x: spawnX,
          y: baseGroundY,
          width: w,
          height: h,
        };
      }

      if (type === "rock") {
        const w = 36 + Math.random() * 22;
        const h = 36 + Math.random() * 22;
        return {
          type,
          x: spawnX + 80 + Math.random() * 200,
          y: -60,
          width: w,
          height: h,
          vy: 0.9 + Math.random() * 1.1,
        };
      }

      // vibe
      const w = 20;
      const h = 20;
      const baseY = baseGroundY - (70 + Math.random() * 80);
      return {
        type: "vibe",
        x: spawnX,
        y: baseY,
        width: w,
        height: h,
        t: Math.random() * Math.PI * 2,
      };
    }

    function resetObstacle(ob) {
      const spawnX = width + 350 + Math.random() * 500;
      const fresh = createObstacle(spawnX);
      Object.assign(ob, fresh);
    }

    // forgiving player hitbox
    function getPlayerHitbox() {
      const padX = player.width * 0.3;
      const padY = player.height * 0.3;

      return {
        x: player.x + padX,
        y: player.y - player.height + padY,
        w: player.width - padX * 2,
        h: player.height - padY * 2,
      };
    }

    function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
      return (
        ax < bx + bw &&
        ax + aw > bx &&
        ay < by + bh &&
        ay + ah > by
      );
    }

    // initial obstacles
    for (let i = 0; i < 4; i++) {
      obstacles.push(createObstacle(width + i * 300));
    }

    // ---------- RESET HELPERS ----------

    function resetObstaclesFull() {
      for (let i = 0; i < obstacles.length; i++) {
        const fresh = createObstacle(width + i * 300);
        Object.assign(obstacles[i], fresh);
      }
    }

    function resetPlayerPosition() {
      player.x = 140;
      player.y = baseGroundY;
      player.velocityY = 0;
      player.onGround = true;
    }

    function resetRun(fullReset) {
      // fullReset = true when hitting Retry button
      distance = fullReset ? 0 : distance;
      difficulty = fullReset ? 1 : difficulty;
      vibeScore = fullReset ? 0 : vibeScore;
      speed = baseSpeed;
      resetObstaclesFull();
      resetPlayerPosition();
      pits.forEach(resetPit);
      gameOver = false;
    }

    // ---------- UPDATE & DRAW ----------

    function updateDifficulty() {
      distance += speed;
      const newDifficulty = 1 + Math.floor(distance / 5000);
      if (newDifficulty !== difficulty) difficulty = newDifficulty;

      speed = baseSpeed + (difficulty - 1) * 0.35;
    }

    function update() {
      // Global reset requested from UI
      if (resetRequestedRef.current) {
        lives = 3;
        resetRun(true);
        resetRequestedRef.current = false;
      }

      if (gameOver) return;

      updateDifficulty();

      // decorations
      trees.forEach((t) => {
        t.x -= speed * 0.8; // parallax
        if (t.x < -80) t.x = width + Math.random() * 200;
      });
      vinesStatic.forEach((v) => {
        v.x -= speed;
        if (v.x < -20) v.x = width + Math.random() * 300;
      });

      pits.forEach((p) => {
        p.x -= speed;
        if (p.x + p.width < 0) resetPit(p);
      });

      const playerHit = getPlayerHitbox();

      obstacles.forEach((ob) => {
        // movement
        ob.x -= speed;

        if (ob.type === "rock") {
          ob.vy += 0.18;
          ob.y += ob.vy;
        }

        if (ob.type === "vibe") {
          ob.t += 0.08;
          const floatAmp = 5;
          const baseY = ob.y;
          const offset = Math.sin(ob.t) * floatAmp;
          ob._drawY = baseY + offset;
        }

        // recycle
        const offLeft = ob.x + ob.width < -80;
        const offBottom =
          (ob.y ?? 0) - (ob.height ?? 0) > height + 80;

        if (offLeft || offBottom) {
          resetObstacle(ob);
          return;
        }

        // obstacle hitbox
        const obY =
          ob.type === "vibe" && ob._drawY != null ? ob._drawY : ob.y;
        const obRect = {
          x: ob.x,
          y: obY - ob.height,
          w: ob.width,
          h: ob.height,
        };

        // Vibe pickup
        if (ob.type === "vibe") {
          if (
            rectsOverlap(
              playerHit.x,
              playerHit.y,
              playerHit.w,
              playerHit.h,
              obRect.x,
              obRect.y,
              obRect.w,
              obRect.h
            )
          ) {
            vibeScore += 1;
            resetObstacle(ob);
          }
          return;
        }

        // Deadly obstacles: logs, spikes, rocks
        let padX = obRect.w * 0.2;
        let padY = obRect.h * 0.2;

        if (ob.type === "log") {
          padX = obRect.w * 0.1;
          padY = obRect.h * 0.1;
        }

        const hitRect = {
          x: obRect.x + padX,
          y: obRect.y + padY,
          w: obRect.w - padX * 2,
          h: obRect.h - padY * 2,
        };

        if (
          rectsOverlap(
            playerHit.x,
            playerHit.y,
            playerHit.w,
            playerHit.h,
            hitRect.x,
            hitRect.y,
            hitRect.w,
            hitRect.h
          )
        ) {
          // lose a life and either reset run or fully game over
          lives -= 1;
          if (lives > 0) {
            resetRun(false);
          } else {
            gameOver = true;
          }
        }
      });

      // jump
      if (jumpRequestedRef.current && player.onGround) {
        player.velocityY = JUMP_FORCE;
        player.onGround = false;
        jumpRequestedRef.current = false;
      }

      // gravity
      player.y += player.velocityY;
      player.velocityY += GRAVITY;

      const overPit = isOverPit(player.x, player.width);

      if (!overPit && player.y >= baseGroundY) {
        player.y = baseGroundY;
        player.velocityY = 0;
        player.onGround = true;
      }

      if (player.y - player.height > height + 40) {
        lives -= 1;
        if (lives > 0) {
          resetRun(false);
        } else {
          gameOver = true;
        }
      }
    }

    function drawBackground() {
      // sky
      ctx.fillStyle = "#fef9c3";
      ctx.fillRect(0, 0, width, height);

      // distant jungle band
      ctx.fillStyle = "#14532d";
      ctx.fillRect(0, baseGroundY - 80, width, 40);

      // ground
      ctx.fillStyle = "#16a34a";
      ctx.fillRect(0, baseGroundY, width, height - baseGroundY);

      // ground outline
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, baseGroundY);
      ctx.lineTo(width, baseGroundY);
      ctx.stroke();

      // pits with blue "water", no dark top line
      pits.forEach((p) => {
        const waterTop = baseGroundY - 1; // cover outline a bit
        ctx.fillStyle = "#0ea5e9"; // blue
        ctx.fillRect(p.x, waterTop, p.width, height - waterTop + 1);

        // side edges only
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, waterTop);
        ctx.lineTo(p.x, height);
        ctx.moveTo(p.x + p.width, waterTop);
        ctx.lineTo(p.x + p.width, height);
        ctx.stroke();
      });

      // back row trees
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#022c22";
      trees.forEach((t) => {
        const trunkHeight = 30 + t.h;
        const trunkX = t.x;
        const trunkY = baseGroundY - 60 - trunkHeight;

        ctx.beginPath();
        ctx.moveTo(trunkX, baseGroundY - 60);
        ctx.lineTo(trunkX, trunkY);
        ctx.stroke();

        ctx.strokeRect(trunkX - 14, trunkY - 20, 28, 20);
      });

      // static hanging vines (decor only)
      vinesStatic.forEach((v) => {
        ctx.beginPath();
        ctx.moveTo(v.x, v.top);
        ctx.lineTo(v.x, v.bottom);
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    function drawObstacles() {
      obstacles.forEach((ob) => {
        if (ob.type === "log") {
          ctx.fillStyle = "#78350f";
          ctx.fillRect(ob.x, ob.y - ob.height, ob.width, ob.height);
          ctx.strokeStyle = "#000000";
          ctx.strokeRect(ob.x, ob.y - ob.height, ob.width, ob.height);

          ctx.font = "12px monospace";
          ctx.fillStyle = "#000000";
          ctx.fillText("JEET", ob.x + 6, ob.y - ob.height / 2 + 4);
        } else if (ob.type === "spikes") {
          ctx.strokeStyle = "#000000";
          ctx.fillStyle = "#f97316";
          const baseY = ob.y;
          const spikeCount = Math.max(2, Math.floor(ob.width / 14));
          const spikeWidth = ob.width / spikeCount;

          for (let i = 0; i < spikeCount; i++) {
            const x1 = ob.x + i * spikeWidth;
            const x2 = x1 + spikeWidth;
            const midX = (x1 + x2) / 2;
            const topY = baseY - ob.height;

            ctx.beginPath();
            ctx.moveTo(x1, baseY);
            ctx.lineTo(midX, topY);
            ctx.lineTo(x2, baseY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        } else if (ob.type === "rock") {
          const centerX = ob.x + ob.width / 2;
          const centerY = ob.y - ob.height / 2;

          // ground shadow
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.beginPath();
          ctx.ellipse(
            centerX,
            baseGroundY + 4,
            ob.width / 2,
            ob.height / 4,
            0,
            0,
            Math.PI * 2
          );
          ctx.fill();

          // falling rock
          ctx.fillStyle = "#4b5563";
          ctx.beginPath();
          ctx.ellipse(
            centerX,
            centerY,
            ob.width / 2,
            ob.height / 2,
            0,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.strokeStyle = "#000000";
          ctx.stroke();
        } else if (ob.type === "vibe") {
          const drawY = ob._drawY != null ? ob._drawY : ob.y;
          ctx.beginPath();
          ctx.arc(
            ob.x + ob.width / 2,
            drawY - ob.height / 2,
            ob.width / 2,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = "#a855f7";
          ctx.fill();
          ctx.strokeStyle = "#000000";
          ctx.stroke();
        }
      });
    }

    function drawPlayer() {
      if (heroLoaded) {
        ctx.drawImage(
          heroImage,
          player.x,
          player.y - player.height,
          player.width,
          player.height
        );
      } else {
        ctx.fillStyle = "#000000";
        ctx.fillRect(
          player.x,
          player.y - player.height,
          player.width,
          player.height
        );
      }
    }

    function drawHUD() {
      ctx.font = "20px monospace";
      ctx.fillStyle = "#000000";
      ctx.fillText("Doodlefall", 30, 40);

      ctx.font = "14px monospace";
      ctx.fillText(`Vibes: ${vibeScore}`, 30, 65);
      ctx.fillText(`Lvl: ${difficulty}`, 30, 85);
      ctx.fillText(`Lives: ${lives}`, 30, 105);
    }

    function drawGameOver() {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "#ffffff";
      ctx.font = "40px monospace";
      ctx.fillText("RUGGED.", width / 2 - 110, height / 2 - 20);

      ctx.font = "18px monospace";
      ctx.fillText(
        "You doodled your last doodle.",
        width / 2 - 170,
        height / 2 + 20
      );
      ctx.fillText(
        `Vibes collected: ${vibeScore}`,
        width / 2 - 140,
        height / 2 + 50
      );
      ctx.fillText(
        "Hit the Retry button to respawn.",
        width / 2 - 175,
        height / 2 + 80
      );
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      drawBackground();
      drawObstacles();
      drawPlayer();
      drawHUD();

      if (gameOver) drawGameOver();
    }

    function loop(timestamp) {
      const delta = timestamp - lastTime;
      lastTime = timestamp;

      update();
      draw();
      requestAnimationFrame(loop);
    }

    const id = requestAnimationFrame(loop);

    const handleKeyDown = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        jumpRequestedRef.current = true;
      }
    };

    const handleCanvasPointer = () => {
      jumpRequestedRef.current = true;
    };

    window.addEventListener("keydown", handleKeyDown);
    canvas.addEventListener("pointerdown", handleCanvasPointer);

    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("keydown", handleKeyDown);
      canvas.removeEventListener("pointerdown", handleCanvasPointer);
    };
  }, []);

  return (
    <main className="min-h-screen w-full bg-[url('/bg/bg4.png')] bg-cover bg-center flex items-center justify-center px-3 py-6 md:px-6 md:py-10">
      <div className="w-full max-w-5xl">
        <DoodleWindow
          title="Doodlefall"
          rightLabel="Controls: Space / Click / Tap = Jump"
          backHref="/home"
          backLabel="Back to Doodleverse"
        >
          {/* Header copy */}
          <header className="space-y-1.5 mb-4">
            <h1 className="text-xl md:text-2xl font-bold text-[#1f1230]">
              Doodlefall
            </h1>
            <p className="text-sm md:text-base text-neutral-800">
              Fall deeper. Sketch harder. Survive longer.
            </p>
            <p className="text-xs md:text-sm text-neutral-600">
              Doodlefall is a vertical-drop chaos simulator where your tiny
              doodle dude free-falls through a cursed ballpoint jungle. Dodge
              traps. Avoid spikes. And pray your reflexes aren’t as smooth as
              your brain.
            </p>
            <p className="text-[11px] md:text-xs italic text-neutral-500">
              This game hates you.
            </p>
          </header>

          {/* Game canvas */}
          <section className="rounded-2xl border border-neutral-300 bg-neutral-50 shadow-inner p-3 flex justify-center">
            <canvas
              ref={canvasRef}
              className="border border-neutral-400 w-full h-auto max-w-[900px] bg-[#fef9c3]"
              style={{ maxWidth: "100%" }}
            />
          </section>

          {/* How to play + Retry */}
          <section className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="text-xs md:text-sm text-neutral-800 border border-neutral-300 bg-white rounded-xl px-4 py-2">
              <strong>How to play:</strong> Tap / Click / Space to jump. Avoid
              pits, logs, spikes & falling rocks. Grab vibes. Don’t die.
            </div>

            <button
              onClick={handleRetry}
              className="inline-flex items-center justify-center px-4 py-2 rounded-full text-xs md:text-sm font-semibold border border-purple-600 bg-purple-600 text-white shadow-[0_3px_0_rgba(0,0,0,0.4)] hover:bg-purple-700 transition"
            >
              Retry run
            </button>
          </section>

          {/* Mobile jump button */}
          <button
            onClick={handleMobileJump}
            className="mt-3 md:hidden w-full border border-neutral-400 bg-white py-2 text-sm font-semibold rounded-xl shadow-[0_3px_0_rgba(0,0,0,0.35)] text-neutral-900"
          >
            TAP TO JUMP
          </button>
        </DoodleWindow>
      </div>
    </main>
  );
}
