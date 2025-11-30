"use client";

import { useRef, useEffect, useState } from "react";
import DoodleWindow from "@/components/DoodleWindow";

const COLS = 20;
const ROWS = 15;
const CELL_SIZE = 32; // 20 * 32 = 640, 15 * 32 = 480

const MICRO_FLAVORS = [
  "Running at 10k TPS (Tiny Pencil Strokes).",
  "Sketch physics barely holding together.",
  "Warning: copium intake increasing.",
  "Notebook friction: 0%.",
  "Purple snake protocol engaged.",
];

const GAME_OVER_LINES = [
  "You Ate Yourself.\nTragic but expected.",
  "Self-collision detected.\nIQ insufficient.",
  "You tangled the doodle.\nTry again.",
];

function createInitialSnake() {
  return [
    { x: 5, y: 7 },
    { x: 4, y: 7 },
    { x: 3, y: 7 },
  ];
}

function getRandomFood(snake) {
  let position = null;

  while (
    !position ||
    snake.some((seg) => seg.x === position.x && seg.y === position.y)
  ) {
    position = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  }

  return position;
}

export default function SnakePage() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const [snake, setSnake] = useState(createInitialSnake);
  const snakeRef = useRef(snake);

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [gameOverText, setGameOverText] = useState("");
  const [microFlavor] = useState(
    () => MICRO_FLAVORS[Math.floor(Math.random() * MICRO_FLAVORS.length)]
  );

  const foodRef = useRef(null);
  const directionRef = useRef({ x: 1, y: 0 }); // moving right
  const loopRef = useRef(null);

  // Keep snakeRef in sync with state
  useEffect(() => {
    snakeRef.current = snake;
  }, [snake]);

  // Track best score
  useEffect(() => {
    setBestScore((prev) => (score > prev ? score : prev));
  }, [score]);

  // Draw scene
  const drawScene = (
    snakeToDraw,
    foodToDraw,
    gameOver = false,
    message = ""
  ) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background / paper color
    ctx.fillStyle = "#fffaf0";
    ctx.fillRect(0, 0, width, height);

    // Light doodle grid
    ctx.strokeStyle = "rgba(0,0,0,0.07)";
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      const x = c * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      const y = r * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Food
    if (foodToDraw) {
      const centerX = foodToDraw.x * CELL_SIZE + CELL_SIZE / 2;
      const centerY = foodToDraw.y * CELL_SIZE + CELL_SIZE / 2;
      const jitterX = (Math.random() - 0.5) * 3;
      const jitterY = (Math.random() - 0.5) * 3;

      ctx.fillStyle = "#ff4b81";
      ctx.strokeStyle = "#222222";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(
        centerX + jitterX,
        centerY + jitterY,
        CELL_SIZE * 0.25,
        CELL_SIZE * 0.25,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();
    }

    // Snake
    snakeToDraw.forEach((segment, index) => {
      const baseX = segment.x * CELL_SIZE;
      const baseY = segment.y * CELL_SIZE;

      const jitterX = (Math.random() - 0.5) * 2;
      const jitterY = (Math.random() - 0.5) * 2;

      const x = baseX + 4 + jitterX;
      const y = baseY + 4 + jitterY;
      const size = CELL_SIZE - 8;

      ctx.fillStyle = "#3b3b3b";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.fillRect(x, y, size, size);
      ctx.strokeRect(x, y, size, size);

      if (index === 0) {
        // Eyes
        ctx.fillStyle = "#ffffff";
        const eyeSize = 4;
        ctx.fillRect(x + size * 0.2, y + size * 0.2, eyeSize, eyeSize);
        ctx.fillRect(x + size * 0.6, y + size * 0.2, eyeSize, eyeSize);

        ctx.fillStyle = "#000000";
        ctx.fillRect(x + size * 0.2 + 1, y + size * 0.2 + 1, 2, 2);
        ctx.fillRect(x + size * 0.6 + 1, y + size * 0.2 + 1, 2, 2);

        // Tongue
        ctx.strokeStyle = "#ff4b81";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + size * 0.5, y + size * 0.8);
        ctx.lineTo(x + size * 0.5, y + size);
        ctx.stroke();
      }
    });

    // Game over overlay
    if (gameOver && message) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, height / 2 - 40, width, 80);

      ctx.font = "22px Comic Sans MS, system-ui, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";

      const lines = message.split("\n");
      const baseY = height / 2;
      const lineHeight = 24;

      lines.forEach((line, idx) => {
        ctx.fillText(
          line,
          width / 2,
          baseY + idx * lineHeight - ((lines.length - 1) * lineHeight) / 2
        );
      });

      ctx.textAlign = "start";
    }
  };

  const startLoop = () => {
    if (loopRef.current) clearInterval(loopRef.current);

    setIsRunning(true);

    loopRef.current = setInterval(() => {
      const currentSnake = snakeRef.current;
      const dir = directionRef.current;
      const currentFood = foodRef.current;

      if (!currentSnake || currentSnake.length === 0) return;

      const head = currentSnake[0];
      const newHead = { x: head.x + dir.x, y: head.y + dir.y };

      // Wall collision
      if (
        newHead.x < 0 ||
        newHead.x >= COLS ||
        newHead.y < 0 ||
        newHead.y >= ROWS
      ) {
        const msg =
          GAME_OVER_LINES[Math.floor(Math.random() * GAME_OVER_LINES.length)];
        setGameOverText(msg);
        setIsGameOver(true);
        setIsRunning(false);
        clearInterval(loopRef.current);
        loopRef.current = null;
        drawScene(currentSnake, currentFood, true, msg);
        return;
      }

      // Self collision
      const hitSelf = currentSnake.some(
        (seg) => seg.x === newHead.x && seg.y === newHead.y
      );

      if (hitSelf) {
        const msg =
          GAME_OVER_LINES[Math.floor(Math.random() * GAME_OVER_LINES.length)];
        setGameOverText(msg);
        setIsGameOver(true);
        setIsRunning(false);
        clearInterval(loopRef.current);
        loopRef.current = null;
        drawScene(currentSnake, currentFood, true, msg);
        return;
      }

      let newSnake = [];
      let newFood = currentFood;

      // Eat food
      if (
        currentFood &&
        newHead.x === currentFood.x &&
        newHead.y === currentFood.y
      ) {
        newSnake = [newHead, ...currentSnake];
        setScore((prev) => prev + 1);
        newFood = getRandomFood(newSnake);
        foodRef.current = newFood;
      } else {
        newSnake = [newHead, ...currentSnake.slice(0, -1)];
      }

      snakeRef.current = newSnake;
      setSnake(newSnake);

      drawScene(newSnake, newFood, false, "");
    }, 120);
  };

  const resetGame = () => {
    const initialSnake = createInitialSnake();
    snakeRef.current = initialSnake;
    setSnake(initialSnake);

    const initialFood = getRandomFood(initialSnake);
    foodRef.current = initialFood;

    directionRef.current = { x: 1, y: 0 };
    setScore(0);
    setIsGameOver(false);
    setGameOverText("");
    setHasStarted(true);

    drawScene(initialSnake, initialFood, false, "");
    startLoop();
  };

  const updateDirection = (newDir) => {
    const current = directionRef.current;
    if (current.x + newDir.x === 0 && current.y + newDir.y === 0) return;
    directionRef.current = newDir;
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      let handled = false;

      if (key === "arrowup" || key === "w") {
        updateDirection({ x: 0, y: -1 });
        handled = true;
      } else if (key === "arrowdown" || key === "s") {
        updateDirection({ x: 0, y: 1 });
        handled = true;
      } else if (key === "arrowleft" || key === "a") {
        updateDirection({ x: -1, y: 0 });
        handled = true;
      } else if (key === "arrowright" || key === "d") {
        updateDirection({ x: 1, y: 0 });
        handled = true;
      }

      if (handled) e.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Canvas setup + first render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = COLS * CELL_SIZE;
    canvas.height = ROWS * CELL_SIZE;

    const ctx = canvas.getContext("2d");
    ctxRef.current = ctx;

    const initialSnake = snakeRef.current;
    let initialFood = foodRef.current;

    if (!initialFood) {
      initialFood = getRandomFood(initialSnake);
      foodRef.current = initialFood;
    }

    drawScene(initialSnake, initialFood, false, "");

    return () => {
      if (loopRef.current) clearInterval(loopRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMobileDirection = (dir) => {
    if (!hasStarted || !isRunning || isGameOver) return;
    if (dir === "up") updateDirection({ x: 0, y: -1 });
    if (dir === "down") updateDirection({ x: 0, y: 1 });
    if (dir === "left") updateDirection({ x: -1, y: 0 });
    if (dir === "right") updateDirection({ x: 1, y: 0 });
  };

  const handlePrimaryButtonClick = () => {
    resetGame();
  };

  const snakeLength = snake.length;
  const primaryLabel = !hasStarted ? "START GAME" : "RETRY";
  const primarySub =
    !hasStarted ? "slither responsibly" : "don’t gaslight yourself, it happens";

  return (
    <main
      className="min-h-screen w-full flex items-center justify-center px-4 py-6 sm:py-10"
      style={{
        backgroundImage: "url(/bg/bg4.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        cursor: "url(/cursors/pencil.png) 0 24, auto",
      }}
    >
      <div className="w-full max-w-5xl">
        <DoodleWindow
          title="Doodle Snake"
          modeLabel="Arcade"
          backHref="/"
          backLabel="Back to Doodleverse"
        >
          <div className="space-y-4 sm:space-y-6">
            {/* Description card */}
            <section className="bg-white/90 border-[3px] border-black rounded-2xl shadow-[5px_5px_0_rgba(0,0,0,1)] px-4 sm:px-6 py-4 sm:py-5 space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Doodle Snake
              </h1>
              <p className="text-sm sm:text-base text-purple-800 font-semibold">
                Eat vibes. Grow long. Don&apos;t eat yourself, bro.
              </p>
              <p className="text-[11px] sm:text-sm text-neutral-800 leading-snug max-w-2xl">
                Doodle Snake is a hand-drawn survival loop where your cursed
                little noodle slithers around eating tokens, growing longer, and
                eventually — inevitably — crashing into its own smooth-brain
                decisions.
                <br />
                <span className="font-semibold">
                  Simple game. Bad outcomes. Peak doodle energy.
                </span>
              </p>
              <p className="text-[10px] sm:text-xs text-purple-900 italic mt-1">
                {microFlavor}
              </p>
            </section>

            {/* Game card */}
            <section className="bg-white/95 border-[3px] border-black rounded-2xl shadow-[5px_5px_0_rgba(0,0,0,1)] px-3 sm:px-5 py-4 sm:py-5 space-y-3">
              {/* Top info row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-[11px] sm:text-xs space-y-1">
                  <p className="font-semibold">Game Stats</p>
                  <div className="flex flex-wrap gap-2">
                    <div className="px-3 py-1 border-[2px] border-black bg-[#fffdf5] rounded-md shadow-[2px_2px_0_rgba(0,0,0,1)]">
                      Score: <span className="font-bold">{score}</span>
                    </div>
                    <div className="px-3 py-1 border-[2px] border-black bg-[#fffdf5] rounded-md shadow-[2px_2px_0_rgba(0,0,0,1)]">
                      Length: <span className="font-bold">{snakeLength}</span>
                    </div>
                    <div className="px-3 py-1 border-[2px] border-black bg-[#fffdf5] rounded-md shadow-[2px_2px_0_rgba(0,0,0,1)]">
                      Best Run: <span className="font-bold">{bestScore}</span>
                    </div>
                  </div>
                </div>

                {/* Start / Retry */}
                <div className="flex flex-col items-start sm:items-end gap-1">
                  <button
                    onClick={handlePrimaryButtonClick}
                    className="px-4 py-1.5 border-[2px] border-black bg-[#fbe3ff] rounded-full shadow-[3px_3px_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_rgba(0,0,0,1)] transition-transform text-xs sm:text-sm font-semibold"
                  >
                    {primaryLabel}
                  </button>
                  <span className="text-[10px] sm:text-xs text-neutral-700 italic">
                    {primarySub}
                  </span>
                </div>
              </div>

              {/* How to play */}
              <div className="border-[2px] border-black rounded-xl bg-[#fffef8] px-3 py-2 shadow-[2px_2px_0_rgba(0,0,0,1)] text-[10px] sm:text-xs">
                <span className="font-semibold">How to play:</span>
                <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
                  <p>
                    <span className="font-semibold">Move:</span> Arrow Keys /
                    WASD
                  </p>
                  <p>
                    <span className="font-semibold">Eat:</span> Tokens / doodle
                    bits
                  </p>
                  <p>
                    <span className="font-semibold">Avoid:</span> Walls,
                    yourself, bad life choices
                  </p>
                  <p>
                    <span className="font-semibold">Goal:</span> Get long, stay
                    alive
                  </p>
                </div>
              </div>

              {/* Canvas */}
              <div className="mt-2 flex justify-center">
                <div className="border-[3px] border-black bg-[#fffef8] shadow-[4px_4px_0_rgba(0,0,0,1)] rounded-xl p-2 relative">
                  <canvas
                    ref={canvasRef}
                    className="block max-w-full"
                    style={{
                      imageRendering: "pixelated",
                    }}
                  />
                </div>
              </div>

              {/* Game over text */}
              {isGameOver && (
                <p className="text-[10px] sm:text-xs text-red-700 font-semibold mt-1">
                  {gameOverText || "You tangled the doodle. Try again."}{" "}
                  <span className="ml-1 text-neutral-800">
                    Doodle OS cannot save you.
                  </span>
                </p>
              )}

              {/* Desktop helper */}
              <p className="hidden sm:block text-[10px] sm:text-xs text-neutral-600 mt-1 italic">
                Desktop: use Arrow keys or WASD. Copium levels: extreme.
              </p>

              {/* Mobile controls */}
              <div className="mt-4 sm:hidden flex flex-col items-center gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMobileDirection("up")}
                    className="w-16 h-10 border-[2px] border-black bg-[#fffdf5] rounded-lg shadow-[3px_3px_0_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_rgba(0,0,0,1)] text-lg"
                  >
                    ↑
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMobileDirection("left")}
                    className="w-16 h-10 border-[2px] border-black bg-[#fffdf5] rounded-lg shadow-[3px_3px_0_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_rgba(0,0,0,1)] text-lg"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => handleMobileDirection("down")}
                    className="w-16 h-10 border-[2px] border-black bg-[#fffdf5] rounded-lg shadow-[3px_3px_0_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_rgba(0,0,0,1)] text-lg"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => handleMobileDirection("right")}
                    className="w-16 h-10 border-[2px] border-black bg-[#fffdf5] rounded-lg shadow-[3px_3px_0_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_rgba(0,0,0,1)] text-lg"
                  >
                    →
                  </button>
                </div>
                <p className="text-[10px] text-neutral-600 italic">
                  Tap arrows to steer. Don&apos;t eat yourself.
                </p>
              </div>
            </section>
          </div>
        </DoodleWindow>
      </div>
    </main>
  );
}
