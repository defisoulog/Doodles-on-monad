"use client";

import { useEffect, useRef, useState } from "react";
import DoodleWindow from "@/components/DoodleWindow";

export default function DoodleBreakoutPage() {
  const canvasRef = useRef(null);
  const controlsRef = useRef(null);

  // UI stats (React side)
  const [uiStats, setUiStats] = useState({
    blocksBroken: 0,
    lives: 3,
    bestScore: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = 800;
    canvas.height = 500;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ----------------------------------
    // GAME STATE
    // ----------------------------------

    const paddle = {
      width: 120,
      height: 15,
      x: canvas.width / 2 - 120 / 2,
      y: canvas.height - 60,
      speed: 6,
      movingLeft: false,
      movingRight: false,
    };

    const ball = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      radius: 10,
      dx: 3,
      dy: -3,
    };

    const bounds = {
      left: 10,
      right: canvas.width - 10,
      top: 10,
      bottom: canvas.height - 10,
    };

    // Bricks config
    const brickRowCount = 5;
    const brickColumnCount = 9;
    const brickConfig = {
      width: 60,
      height: 18,
      padding: 8,
      offsetTop: 80,
      offsetLeft: 40,
    };

    // Bricks array [col][row]
    const bricks = [];
    for (let c = 0; c < brickColumnCount; c++) {
      bricks[c] = [];
      for (let r = 0; r < brickRowCount; r++) {
        // Scatter multi-hit bricks (2–3 hits)
        const rand = Math.random();
        let hits = 1;
        if (rand > 0.8) hits = 3; // ~20% are 3-hit
        else if (rand > 0.5) hits = 2; // ~30% are 2-hit

        bricks[c][r] = {
          x: 0,
          y: 0,
          alive: true,
          hitsRemaining: hits,
          maxHits: hits,
        };
      }
    }

    const totalBricks = brickRowCount * brickColumnCount;

    let gameLives = 3;
    let gameBlocksBroken = 0;
    let gameOver = false;
    let gameWon = false;
    let animationId = null;

    // ----------------------------------
    // INPUT LISTENERS (keyboard)
    // ----------------------------------

    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") paddle.movingLeft = true;
      if (e.key === "ArrowRight") paddle.movingRight = true;
    };

    const handleKeyUp = (e) => {
      if (e.key === "ArrowLeft") paddle.movingLeft = false;
      if (e.key === "ArrowRight") paddle.movingRight = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // ----------------------------------
    // HELPERS
    // ----------------------------------

    function resetBallAndPaddle() {
      paddle.x = canvas.width / 2 - paddle.width / 2;
      paddle.y = canvas.height - 60;

      ball.x = canvas.width / 2;
      ball.y = canvas.height / 2;
      ball.dx = (Math.random() > 0.5 ? 1 : -1) * 3;
      ball.dy = -3;
    }

    function resetBricks() {
      for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
          const b = bricks[c][r];
          b.alive = true;
          b.hitsRemaining = b.maxHits;
        }
      }
    }

    function resetGame() {
      gameLives = 3;
      gameBlocksBroken = 0;
      gameOver = false;
      gameWon = false;
      resetBallAndPaddle();
      resetBricks();
      setUiStats((prev) => ({
        ...prev,
        blocksBroken: 0,
        lives: 3,
        // keep bestScore as-is
      }));
    }

    // expose controls (desktop + mobile) to buttons
    controlsRef.current = {
      start: () => {
        if (gameOver || gameWon) {
          resetGame();
        } else {
          resetBallAndPaddle();
        }
      },
      retry: () => {
        resetGame();
      },
      moveLeftDown: () => {
        paddle.movingLeft = true;
      },
      moveLeftUp: () => {
        paddle.movingLeft = false;
      },
      moveRightDown: () => {
        paddle.movingRight = true;
      },
      moveRightUp: () => {
        paddle.movingRight = false;
      },
    };

    // ----------------------------------
    // DRAWING
    // ----------------------------------

    function drawBackground() {
      // Notebook page inside the canvas
      ctx.fillStyle = "#fdfcf7";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Outer play area border
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.strokeRect(
        bounds.left,
        bounds.top,
        bounds.right - bounds.left,
        bounds.bottom - bounds.top
      );

      // Horizontal notebook lines
      ctx.strokeStyle = "#d0c4ff";
      ctx.lineWidth = 1;
      for (let y = 50; y < canvas.height - 30; y += 28) {
        const wobble = Math.random() * 2 - 1;
        ctx.beginPath();
        ctx.moveTo(bounds.left + 14, y + wobble);
        ctx.lineTo(bounds.right - 14, y + wobble);
        ctx.stroke();
      }
    }

    function drawPaddle() {
      ctx.fillStyle = "#7a3fff";
      ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

      ctx.strokeStyle = "#3e1f80";
      ctx.lineWidth = 2;
      ctx.strokeRect(paddle.x, paddle.y, paddle.width, paddle.height);
    }

    function drawBall() {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#7a3fff";
      ctx.fill();

      ctx.strokeStyle = "#3e1f80";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    function drawBricks() {
      for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
          const b = bricks[c][r];
          if (!b.alive) continue;

          const brickX =
            bounds.left +
            brickConfig.offsetLeft +
            c * (brickConfig.width + brickConfig.padding);
          const brickY =
            bounds.top +
            brickConfig.offsetTop +
            r * (brickConfig.height + brickConfig.padding);

          b.x = brickX;
          b.y = brickY;

          // Color based on hitsRemaining
          let fill = "#ffffff";
          if (b.maxHits === 2) fill = "#f0e6ff"; // light purple
          if (b.maxHits === 3) fill = "#e0d0ff"; // stronger purple

          ctx.fillStyle = fill;
          ctx.fillRect(brickX, brickY, brickConfig.width, brickConfig.height);

          // Black outline
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 2;
          ctx.strokeRect(brickX, brickY, brickConfig.width, brickConfig.height);

          // Little doodle scribble
          ctx.strokeStyle = "#7a3fff";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(brickX + 6, brickY + brickConfig.height / 2);
          ctx.lineTo(
            brickX + brickConfig.width - 8,
            brickY + brickConfig.height / 2 + 2
          );
          ctx.stroke();

          // Tiny "2x / 3x" marker for multi-hit bricks
          if (b.maxHits > 1) {
            ctx.fillStyle = "#333333";
            ctx.font = "10px monospace";
            ctx.textAlign = "right";
            ctx.fillText(
              `${b.hitsRemaining}x`,
              brickX + brickConfig.width - 4,
              brickY + brickConfig.height - 4
            );
          }
        }
      }
    }

    function drawOverlayText() {
      ctx.fillStyle = "#333333";
      ctx.font = "14px Arial";
      ctx.textAlign = "left";
      ctx.fillText("Doodle Breakout · Multi-hit bricks", 32, 36);
    }

    function drawGameOver() {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(
        bounds.left,
        bounds.top,
        bounds.right - bounds.left,
        bounds.bottom - bounds.top
      );

      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.font = "28px Arial";
      ctx.fillText("You Got Bricked.", canvas.width / 2, canvas.height / 2 - 8);

      ctx.font = "16px Arial";
      ctx.fillText(
        "Notebook physics claims another victim.",
        canvas.width / 2,
        canvas.height / 2 + 20
      );
      ctx.restore();
    }

    function drawWin() {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(
        bounds.left,
        bounds.top,
        bounds.right - bounds.left,
        bounds.bottom - bounds.top
      );

      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.font = "28px Arial";
      ctx.fillText("Board Cleared!", canvas.width / 2, canvas.height / 2 - 8);

      ctx.font = "16px Arial";
      ctx.fillText(
        "Ball speed escalating. Copium fully vented.",
        canvas.width / 2,
        canvas.height / 2 + 20
      );
      ctx.restore();
    }

    // ----------------------------------
    // UPDATE LOGIC
    // ----------------------------------

    function updatePaddle() {
      if (paddle.movingLeft) paddle.x -= paddle.speed;
      if (paddle.movingRight) paddle.x += paddle.speed;

      if (paddle.x < bounds.left + 10) paddle.x = bounds.left + 10;
      if (paddle.x + paddle.width > bounds.right - 10)
        paddle.x = bounds.right - 10 - paddle.width;
    }

    function handleBrickCollisions() {
      let hit = false;

      for (let c = 0; c < brickColumnCount && !hit; c++) {
        for (let r = 0; r < brickRowCount && !hit; r++) {
          const b = bricks[c][r];
          if (!b.alive) continue;

          if (
            ball.x > b.x - ball.radius &&
            ball.x < b.x + brickConfig.width + ball.radius &&
            ball.y > b.y - ball.radius &&
            ball.y < b.y + brickConfig.height + ball.radius
          ) {
            // Register hit
            b.hitsRemaining -= 1;

            if (b.hitsRemaining <= 0) {
              b.alive = false;
              gameBlocksBroken += 1;

              setUiStats((prev) => {
                const newBest = Math.max(prev.bestScore, gameBlocksBroken);
                return {
                  ...prev,
                  blocksBroken: gameBlocksBroken,
                  bestScore: newBest,
                };
              });

              if (gameBlocksBroken >= totalBricks) {
                gameWon = true;
              }
            }

            hit = true;
            ball.dy *= -1;
          }
        }
      }
    }

    function updateBall() {
      ball.x += ball.dx;
      ball.y += ball.dy;

      // Side walls
      if (ball.x - ball.radius <= bounds.left) {
        ball.x = bounds.left + ball.radius;
        ball.dx *= -1;
      }
      if (ball.x + ball.radius >= bounds.right) {
        ball.x = bounds.right - ball.radius;
        ball.dx *= -1;
      }

      // Top wall
      if (ball.y - ball.radius <= bounds.top) {
        ball.y = bounds.top + ball.radius;
        ball.dy *= -1;
      }

      // Paddle collision
      const withinX =
        ball.x > paddle.x - ball.radius &&
        ball.x < paddle.x + paddle.width + ball.radius;

      const touchingY =
        ball.y + ball.radius >= paddle.y &&
        ball.y + ball.radius <= paddle.y + paddle.height;

      if (withinX && touchingY && ball.dy > 0) {
        const hitPoint =
          (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);

        ball.dx = hitPoint * 4.5;
        ball.dy *= -1;
        ball.y = paddle.y - ball.radius;
      }

      // Brick collisions
      handleBrickCollisions();

      // Bottom = lose life
      if (ball.y - ball.radius > bounds.bottom) {
        gameLives -= 1;

        setUiStats((prev) => ({
          ...prev,
          lives: gameLives < 0 ? 0 : gameLives,
        }));

        if (gameLives <= 0) {
          gameOver = true;
        } else {
          resetBallAndPaddle();
        }
      }
    }

    // ----------------------------------
    // GAME LOOP
    // ----------------------------------

    function gameLoop() {
      drawBackground();
      drawBricks();

      if (!gameOver && !gameWon) {
        updatePaddle();
        updateBall();
      }

      drawPaddle();
      drawBall();
      drawOverlayText();

      if (gameOver) drawGameOver();
      if (gameWon) drawWin();

      animationId = requestAnimationFrame(gameLoop);
    }

    // init
    resetGame();
    gameLoop();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [setUiStats]);

  // Derived copium % just for UI flavor
  const copiumLevel = Math.min(100, uiStats.blocksBroken * 5);

  // ----------------------------------
  // PAGE LAYOUT
  // ----------------------------------

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-cover bg-center relative"
      style={{ backgroundImage: "url('/bg/bg4.png')" }}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 w-full max-w-5xl px-4 py-8 sm:py-12">
        <DoodleWindow
          title="Doodle Breakout"
          subtitle="Break blocks. Free the vibes. Dodge the copium."
          modeLabel="Game"
          backHref="/home"
          backLabel="Back to Doodleverse"
        >
          {/* Controls hint pill */}
          <div className="flex justify-end mb-3">
            <div className="px-3 py-1 text-[11px] sm:text-xs border border-black rounded-full bg-white shadow-[2px_2px_0_#000] font-mono">
              Controls: Left / Right arrows · touch buttons · START / RETRY
            </div>
          </div>

          {/* Header copy */}
          <header className="bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0_#000] px-4 sm:px-6 py-4 mb-4">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-black">
              Doodle Breakout
            </h2>

            <p className="mt-1 text-sm sm:text-base italic text-black">
              Break blocks. Free the vibes. Dodge the copium.
            </p>

            <p className="mt-2 text-xs sm:text-sm max-w-3xl leading-relaxed text-black">
              Doodle Breakout turns your notebook into a chaotic demolition
              zone. Control your shaky little paddle, smash every block, and
              pray the ball doesn’t suddenly decide to go Mach 10 for no
              reason.
              <br />
              Hand-drawn physics. Degen difficulty. Purple energy everywhere.
            </p>

            <div className="mt-2 text-[10px] sm:text-xs flex flex-wrap gap-3 font-mono text-neutral-800">
              <span>Ball trajectory: questionable.</span>
              <span>Some bricks require 2–3 hits.</span>
            </div>
          </header>

          {/* Game card */}
          <section className="bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0_#000] p-4 sm:p-5 flex flex-col gap-4">
            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-mono">
              <div className="px-2.5 py-1 border border-black rounded-full bg-neutral-100">
                Blocks Broken: {uiStats.blocksBroken}
              </div>
              <div className="px-2.5 py-1 border border-black rounded-full bg-neutral-100">
                Lives Left: {uiStats.lives}
              </div>
              <div className="px-2.5 py-1 border border-black rounded-full bg-neutral-100">
                Best Score: {uiStats.bestScore}
              </div>
              <div className="px-2.5 py-1 border border-black rounded-full bg-neutral-100">
                Copium Level: {copiumLevel}%
              </div>
            </div>

            {/* How to play mini block */}
            <div className="text-[11px] sm:text-xs text-black">
              <span className="font-semibold">How to play: </span>
              Move the paddle with Left / Right arrows or touch buttons. Hit the
              ball, break every block (some take 2–3 hits), and try not to get
              bricked.
            </div>

            {/* Canvas area */}
            <div className="mt-1 border-2 border-black rounded-xl bg-[#fdfcf7] p-2 flex justify-center items-center overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full max-w-full border border-dashed border-neutral-400 bg-transparent"
              />
            </div>

            {/* Mobile / touch controls */}
            <div className="flex justify-center gap-4 mt-2 flex-wrap">
              <button
                className="px-5 py-2 text-sm font-semibold bg-white border-2 border-black rounded-full shadow-[2px_2px_0_#000] active:translate-y-[1px]"
                onMouseDown={() => controlsRef.current?.moveLeftDown()}
                onMouseUp={() => controlsRef.current?.moveLeftUp()}
                onMouseLeave={() => controlsRef.current?.moveLeftUp()}
                onTouchStart={(e) => {
                  e.preventDefault();
                  controlsRef.current?.moveLeftDown();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  controlsRef.current?.moveLeftUp();
                }}
              >
                ← Move Left
              </button>
              <button
                className="px-5 py-2 text-sm font-semibold bg-white border-2 border-black rounded-full shadow-[2px_2px_0_#000] active:translate-y-[1px]"
                onMouseDown={() => controlsRef.current?.moveRightDown()}
                onMouseUp={() => controlsRef.current?.moveRightUp()}
                onMouseLeave={() => controlsRef.current?.moveRightUp()}
                onTouchStart={(e) => {
                  e.preventDefault();
                  controlsRef.current?.moveRightDown();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  controlsRef.current?.moveRightUp();
                }}
              >
                Move Right →
              </button>
            </div>

            {/* Buttons + flavor */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
              <div className="flex gap-2">
                <button
                  className="px-4 py-1.5 text-xs sm:text-sm font-semibold bg-[#f2e7ff] text-black border-2 border-black rounded-full shadow-[2px_2px_0_#000] active:translate-y-[1px]"
                  onClick={() => controlsRef.current?.start()}
                >
                  START BREAKING
                </button>
                <button
                  className="px-4 py-1.5 text-xs sm:text-sm bg-white text-black border-2 border-black rounded-full shadow-[2px_2px_0_#000] active:translate-y-[1px]"
                  onClick={() => controlsRef.current?.retry()}
                >
                  RETRY
                </button>
              </div>

              <span className="text-[10px] sm:text-xs font-mono text-neutral-800">
                Paddle stability: 1%. Ball speed escalating. Sketch physics may
                break (on purpose).
              </span>
            </div>
          </section>

          {/* Footnote */}
          <p className="mt-3 text-[10px] sm:text-xs font-mono text_black/80">
            Runs at 10k TPS (Tiny Paddle Smacks). Warning: excessive
            block-breaking may lower IQ. LF Codeee.
          </p>
        </DoodleWindow>
      </div>
    </div>
  );
}
