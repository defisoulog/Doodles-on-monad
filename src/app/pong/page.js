"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import DoodleWindow from "@/components/DoodleWindow";

export default function DoodlePongPage() {
  const canvasRef = useRef(null);

  // UI state for mode + scores
  const [mode, setMode] = useState("1P"); // "1P" or "2P"
  const [isRunning, setIsRunning] = useState(false);
  const [scores, setScores] = useState({
    left: 0,
    right: 0,
    bestRally: 0,
  });

  // Refs for game internals (no re-renders every frame)
  const gameRef = useRef(null);
  const keysRef = useRef({
    w: false,
    s: false,
    ArrowUp: false,
    ArrowDown: false,
  });
  const modeRef = useRef(mode);
  const runningRef = useRef(isRunning);

  // Touch zones for mobile
  const touchRef = useRef({
    left: null, // "up" | "down" | null
    right: null,
  });

  // Keep refs in sync with React state
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    runningRef.current = isRunning;
  }, [isRunning]);

  // GAME SETUP + LOOP
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // ----- INITIAL GAME STATE -----
    const initGameState = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const width = parent.clientWidth;
      const height = parent.clientHeight;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const paddleWidth = 10;
      const paddleHeight = height * 0.22;
      const paddleMargin = 20;
      const ballSize = 10;

      const baseSpeed = width * 0.4; // base ball speed (px/sec)
      const state = {
        width,
        height,
        paddleWidth,
        paddleHeight,
        paddleMargin,
        ballSize,
        // paddles centered vertically
        leftY: height / 2 - paddleHeight / 2,
        rightY: height / 2 - paddleHeight / 2,
        leftScore: 0,
        rightScore: 0,
        rallyCount: 0,
        bestRally: 0,
        // ball in center
        ballX: width / 2,
        ballY: height / 2,
        ballVX: baseSpeed * (Math.random() > 0.5 ? 1 : -1),
        ballVY: baseSpeed * (Math.random() * 0.4 - 0.2),
        baseSpeed,
        lastTime: performance.now(),
      };

      gameRef.current = state;
    };

    initGameState();

    // ----- RESIZE HANDLER -----
    const handleResize = () => {
      // Re-init but keep scores & bestRally
      const prev = gameRef.current;
      initGameState();
      if (prev && gameRef.current) {
        gameRef.current.leftScore = prev.leftScore;
        gameRef.current.rightScore = prev.rightScore;
        gameRef.current.rallyCount = prev.rallyCount;
        gameRef.current.bestRally = prev.bestRally;
        setScores({
          left: prev.leftScore,
          right: prev.rightScore,
          bestRally: prev.bestRally,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    // ----- KEYBOARD HANDLERS -----
    const handleKeyDown = (e) => {
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setIsRunning((prev) => !prev);
        return;
      }
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        // full reset
        initGameState();
        setScores({ left: 0, right: 0, bestRally: 0 });
        setIsRunning(false);
        return;
      }

      if (e.key === "w" || e.key === "W") keysRef.current.w = true;
      if (e.key === "s" || e.key === "S") keysRef.current.s = true;
      if (e.key === "ArrowUp") keysRef.current.ArrowUp = true;
      if (e.key === "ArrowDown") keysRef.current.ArrowDown = true;
    };

    const handleKeyUp = (e) => {
      if (e.key === "w" || e.key === "W") keysRef.current.w = false;
      if (e.key === "s" || e.key === "S") keysRef.current.s = false;
      if (e.key === "ArrowUp") keysRef.current.ArrowUp = false;
      if (e.key === "ArrowDown") keysRef.current.ArrowDown = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // ----- TOUCH CONTROLS (MOBILE) -----
    const handleTouchStartMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // reset each cycle
      touchRef.current.left = null;
      touchRef.current.right = null;

      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        const x = t.clientX - rect.left;
        const y = t.clientY - rect.top;

        if (x < width * 0.33) {
          // left paddle zone
          touchRef.current.left = y < height / 2 ? "up" : "down";
        } else if (x > width * 0.67) {
          // right paddle zone
          touchRef.current.right = y < height / 2 ? "up" : "down";
        }
      }
    };

    const handleTouchEnd = () => {
      touchRef.current.left = null;
      touchRef.current.right = null;
    };

    canvas.addEventListener("touchstart", handleTouchStartMove, { passive: true });
    canvas.addEventListener("touchmove", handleTouchStartMove, { passive: true });
    canvas.addEventListener("touchend", handleTouchEnd);
    canvas.addEventListener("touchcancel", handleTouchEnd);

    // ----- GAME LOOP -----
    let animationId;

    const loop = (time) => {
      const state = gameRef.current;
      if (!state) {
        animationId = requestAnimationFrame(loop);
        return;
      }

      const dt = Math.min((time - state.lastTime) / 1000, 0.03); // cap dt
      state.lastTime = time;

      // UPDATE
      if (runningRef.current) {
        updateGame(state, dt);
      }

      // DRAW
      drawGame(ctx, state);

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    // CLEANUP
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("touchstart", handleTouchStartMove);
      canvas.removeEventListener("touchmove", handleTouchStartMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("touchcancel", handleTouchEnd);
      cancelAnimationFrame(animationId);
    };
  }, []);

  // ----- UPDATE FUNCTION -----
  const updateGame = (state, dt) => {
    const {
      width,
      height,
      paddleHeight,
      paddleMargin,
      ballSize,
      baseSpeed,
    } = state;

    const paddleSpeed = height * 1.2; // px/sec
    const aiSpeed = height * 0.9; // AI follow speed
    const maxBallSpeed = baseSpeed * 2.2;

    // LEFT PADDLE (keyboard)
    if (keysRef.current.w) {
      state.leftY -= paddleSpeed * dt;
    }
    if (keysRef.current.s) {
      state.leftY += paddleSpeed * dt;
    }

    // LEFT PADDLE (touch)
    if (touchRef.current.left === "up") {
      state.leftY -= paddleSpeed * dt;
    }
    if (touchRef.current.left === "down") {
      state.leftY += paddleSpeed * dt;
    }

    // RIGHT PADDLE
    if (modeRef.current === "2P") {
      // manual (keyboard)
      if (keysRef.current.ArrowUp) {
        state.rightY -= paddleSpeed * dt;
      }
      if (keysRef.current.ArrowDown) {
        state.rightY += paddleSpeed * dt;
      }
      // manual (touch)
      if (touchRef.current.right === "up") {
        state.rightY -= paddleSpeed * dt;
      }
      if (touchRef.current.right === "down") {
        state.rightY += paddleSpeed * dt;
      }
    } else {
      // 1P: AI tracks ball
      const targetY = state.ballY - paddleHeight / 2;
      const diff = targetY - state.rightY;
      const step = aiSpeed * dt;
      if (Math.abs(diff) <= step) {
        state.rightY = targetY;
      } else {
        state.rightY += step * Math.sign(diff);
      }
    }

    // Clamp paddles
    state.leftY = Math.max(10, Math.min(height - paddleHeight - 10, state.leftY));
    state.rightY = Math.max(10, Math.min(height - paddleHeight - 10, state.rightY));

    // BALL MOVEMENT
    state.ballX += state.ballVX * dt;
    state.ballY += state.ballVY * dt;

    // TOP/BOTTOM WALLS
    if (state.ballY - ballSize / 2 <= 0) {
      state.ballY = ballSize / 2;
      state.ballVY *= -1;
    } else if (state.ballY + ballSize / 2 >= height) {
      state.ballY = height - ballSize / 2;
      state.ballVY *= -1;
    }

    // LEFT PADDLE COLLISION
    const leftX = paddleMargin;
    if (
      state.ballX - ballSize / 2 <= leftX + state.paddleWidth &&
      state.ballX - ballSize / 2 >= leftX && // avoid "teleport" misses
      state.ballY >= state.leftY &&
      state.ballY <= state.leftY + paddleHeight
    ) {
      state.ballX = leftX + state.paddleWidth + ballSize / 2;
      state.ballVX = Math.abs(state.ballVX); // send right

      // Add spin based on where it hits the paddle
      const hitPos = (state.ballY - state.leftY) / paddleHeight - 0.5; // -0.5..0.5
      state.ballVY += hitPos * baseSpeed * 1.2;

      // Slight speed-up each rally
      const speed = Math.min(
        Math.hypot(state.ballVX, state.ballVY) * 1.05,
        maxBallSpeed
      );
      const angle = Math.atan2(state.ballVY, state.ballVX);
      state.ballVX = Math.cos(angle) * speed;
      state.ballVY = Math.sin(angle) * speed;

      state.rallyCount += 1;
      if (state.rallyCount > state.bestRally) {
        state.bestRally = state.rallyCount;
        setScores((prev) => ({
          ...prev,
          bestRally: state.bestRally,
        }));
      }
    }

    // RIGHT PADDLE COLLISION
    const rightX = width - paddleMargin - state.paddleWidth;
    if (
      state.ballX + ballSize / 2 >= rightX &&
      state.ballX + ballSize / 2 <= rightX + state.paddleWidth &&
      state.ballY >= state.rightY &&
      state.ballY <= state.rightY + paddleHeight
    ) {
      state.ballX = rightX - ballSize / 2;
      state.ballVX = -Math.abs(state.ballVX); // send left

      const hitPos = (state.ballY - state.rightY) / paddleHeight - 0.5;
      state.ballVY += hitPos * baseSpeed * 1.2;

      const speed = Math.min(
        Math.hypot(state.ballVX, state.ballVY) * 1.05,
        maxBallSpeed
      );
      const angle = Math.atan2(state.ballVY, state.ballVX);
      state.ballVX = Math.cos(angle) * speed;
      state.ballVY = Math.sin(angle) * speed;

      state.rallyCount += 1;
      if (state.rallyCount > state.bestRally) {
        state.bestRally = state.rallyCount;
        setScores((prev) => ({
          ...prev,
          bestRally: state.bestRally,
        }));
      }
    }

    // SCORE LEFT/RIGHT
    const resetBall = (direction) => {
      state.ballX = width / 2;
      state.ballY = height / 2;
      const dir = direction === "right" ? 1 : -1;
      state.ballVX = state.baseSpeed * dir;
      state.ballVY = state.baseSpeed * (Math.random() * 0.4 - 0.2);
      state.rallyCount = 0;
    };

    // Ball passed left side
    if (state.ballX + ballSize / 2 < 0) {
      state.rightScore += 1;
      setScores((prev) => ({
        ...prev,
        right: state.rightScore,
      }));
      resetBall("right");
    }

    // Ball passed right side
    if (state.ballX - ballSize / 2 > width) {
      state.leftScore += 1;
      setScores((prev) => ({
        ...prev,
        left: state.leftScore,
      }));
      resetBall("left");
    }
  };

  // ----- DRAW FUNCTION -----
  const drawGame = (ctx, state) => {
    const {
      width,
      height,
      paddleWidth,
      paddleHeight,
      paddleMargin,
      leftY,
      rightY,
      ballX,
      ballY,
      ballSize,
    } = state;

    // Background notebook-ish
    ctx.fillStyle = "#fdf7ff";
    ctx.fillRect(0, 0, width, height);

    // Very light vertical "notebook lines"
    ctx.strokeStyle = "#f3e2ff";
    ctx.lineWidth = 1;
    for (let x = 40; x < width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Center dashed line with slight wobble
    ctx.strokeStyle = "#c29cff";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    const midX = width / 2;
    for (let y = 20; y < height - 20; y += 20) {
      const wobble = Math.sin(y * 0.15) * 2;
      const x = midX + wobble;
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 10);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Paddles (with doodle outline)
    ctx.fillStyle = "#3b1b80";
    ctx.strokeStyle = "#120624";
    ctx.lineWidth = 2;

    // Left paddle
    ctx.beginPath();
    ctx.roundRect(
      paddleMargin,
      leftY,
      paddleWidth,
      paddleHeight,
      6
    );
    ctx.fill();
    ctx.stroke();

    // Right paddle
    ctx.beginPath();
    ctx.roundRect(
      width - paddleMargin - paddleWidth,
      rightY,
      paddleWidth,
      paddleHeight,
      6
    );
    ctx.fill();
    ctx.stroke();

    // Ball
    ctx.fillStyle = "#f97316";
    ctx.strokeStyle = "#22093a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Top text hint
    ctx.fillStyle = "#47208d";
    ctx.font = "12px monospace";
    ctx.fillText(
      "Space = start/pause · R = reset",
      16,
      18
    );

    if (!runningRef.current) {
      ctx.fillStyle = "rgba(10, 0, 40, 0.6)";
      ctx.fillRect(0, height / 2 - 30, width, 60);
      ctx.fillStyle = "#fdf7ff";
      ctx.textAlign = "center";
      ctx.font = "16px monospace";
      ctx.fillText("Press SPACE to start / pause", width / 2, height / 2 - 4);
      ctx.font = "12px monospace";
      ctx.fillText(
        "Don’t get embarrassed by a doodle ball.",
        width / 2,
        height / 2 + 14
      );
      ctx.textAlign = "start";
    }
  };

  // BUTTON HANDLERS
  const handleStart = () => {
    setIsRunning((prev) => !prev);
  };

  const handleRetry = () => {
    const state = gameRef.current;
    if (!state) return;
    state.leftScore = 0;
    state.rightScore = 0;
    state.rallyCount = 0;
    state.bestRally = 0;
    state.ballX = state.width / 2;
    state.ballY = state.height / 2;
    state.ballVX =
      state.baseSpeed * (Math.random() > 0.5 ? 1 : -1);
    state.ballVY = state.baseSpeed * (Math.random() * 0.4 - 0.2);

    setScores({
      left: 0,
      right: 0,
      bestRally: 0,
    });
    setIsRunning(false);
  };

  return (
    <main
      className="min-h-screen w-full flex items-center justify-center px-3 py-6 bg-repeat bg-center"
      style={{ backgroundImage: "url(/bg/bg4.png)" }}
    >
      <div className="w-full max-w-5xl">
        <DoodleWindow
          title="Doodle Pong"
          subtitle="Two paddles. One ball. Infinite rage."
          modeLabel={mode === "1P" ? "1 Player vs AI" : "2 Players"}
          backHref="/"
          backLabel="Back to Doodleverse"
        >
          {/* Description */}
          <div className="mb-4 text-xs sm:text-sm md:text-base text-slate-800 leading-relaxed">
            <p>
              Doodle Pong is a hand-drawn chaos rally where two sketchy paddles
              battle for purple supremacy while a cursed little ball bounces
              around like it drank 10k TPS caffeine.
            </p>
            <p className="mt-2">
              Easy to start. Impossible to master. Guaranteed to tilt you.
            </p>
          </div>

          {/* Score + mode row */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="space-y-0.5">
              <div>
                <span className="font-semibold">Player Left:</span>{" "}
                <span className="font-mono">{scores.left}</span>
              </div>
              <div>
                <span className="font-semibold">Player Right:</span>{" "}
                <span className="font-mono">{scores.right}</span>
              </div>
              <div>
                <span className="font-semibold">Best Rally:</span>{" "}
                <span className="font-mono">{scores.bestRally}</span>
              </div>
            </div>

            <div className="space-y-1 text-right">
              <div className="font-semibold text-xs sm:text-sm">Game Mode</div>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  onClick={() => setMode("1P")}
                  className={`px-3 py-1.5 rounded-full border text-xs sm:text-sm shadow-[2px_2px_0_#000] transition ${
                    mode === "1P"
                      ? "bg-black text-white border-black"
                      : "bg-white text-black border-black hover:bg-slate-100"
                  }`}
                >
                  1 Player (vs AI)
                </button>
                <button
                  onClick={() => setMode("2P")}
                  className={`px-3 py-1.5 rounded-full border text-xs sm:text-sm shadow-[2px_2px_0_#000] transition ${
                    mode === "2P"
                      ? "bg-black text-white border-black"
                      : "bg-white text-black border-black hover:bg-slate-100"
                  }`}
                >
                  2 Players
                </button>
              </div>
              <p className="text-[0.7rem] text-slate-700">
                Paddle latency: 0ms (in theory).
              </p>
            </div>
          </div>

          {/* Canvas frame */}
          <div className="border-2 border-black bg-[#fdf7ff] rounded-xl shadow-[3px_3px_0_#000] overflow-hidden">
            <div className="w-full aspect-[16/9]">
              <canvas ref={canvasRef} className="w-full h-full" />
            </div>
          </div>

          {/* Controls + buttons */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleStart}
                className="px-3 py-1.5 rounded-full border border-black bg-slate-100 text-xs sm:text-sm shadow-[2px_2px_0_#000] hover:bg-slate-200 active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition"
              >
                {isRunning ? "PAUSE" : "START MATCH"}{" "}
                <span className="ml-1 text-[0.65rem] uppercase tracking-wide">
                  begin the suffering
                </span>
              </button>
              <button
                onClick={handleRetry}
                className="px-3 py-1.5 rounded-full border border-black bg-slate-100 text-xs sm:text-sm shadow-[2px_2px_0_#000] hover:bg-slate-200 active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition"
              >
                RETRY{" "}
                <span className="ml-1 text-[0.65rem] uppercase tracking-wide">
                  cope harder
                </span>
              </button>
            </div>

            <div className="text-[0.7rem] sm:text-[0.75rem] text-slate-700 text-right">
              <p>Controls: W / S &amp; ↑ / ↓ · Space = Start / Pause · R = Reset</p>
              <p>Ball physics provided by crayon technology.</p>
            </div>
          </div>

          {/* How to play bar */}
          <div className="mt-4 border-t border-dashed border-slate-400 pt-3 text-xs sm:text-sm">
            <p>
              <span className="font-semibold">How to play:</span> Left Paddle:
              W / S · Right Paddle: ↑ / ↓ (or tap left/right on mobile). Keep
              the rally going and don&apos;t get embarrassed by a doodle ball.
            </p>
            <p className="mt-1 text-[0.7rem] text-slate-700">
              Notebook gravity enabled. Purple spin boost active. This game runs
              at 10k TPS (Tiny Paddle Shakes).
            </p>
          </div>
        </DoodleWindow>
      </div>
    </main>
  );
}
