"use client";

import { useEffect, useRef, useState } from "react";

const generateMaze = (rows, cols, difficultyLevel = "easy") => {
  const maze = Array(rows)
    .fill()
    .map(() => Array(cols).fill(1));

  const stack = [];
  const directions = [
    [0, -2],
    [0, 2],
    [-2, 0],
    [2, 0]
  ];

  const centerRow = Math.floor(rows / 2);
  const centerCol = Math.floor(cols / 2);

  const isValid = (x, y) => {
    const inBounds = x > 0 && x < rows - 1 && y > 0 && y < cols - 1;
    const inCenter =
      x >= centerRow - 1 &&
      x <= centerRow + 1 &&
      y >= centerCol - 1 &&
      y <= centerCol + 1;
    return inBounds && !inCenter;
  };

  const carvePath = (x, y) => {
    maze[x][y] = 0;
    stack.push([x, y]);

    while (stack.length > 0) {
      const [cx, cy] = stack[stack.length - 1];
      const shuffledDirs = directions.sort(() => Math.random() - 0.5);
      let moved = false;

      for (let [dx, dy] of shuffledDirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (isValid(nx, ny) && maze[nx][ny] === 1) {
          maze[cx + dx / 2][cy + dy / 2] = 0;
          maze[nx][ny] = 0;
          stack.push([nx, ny]);
          moved = true;
          break;
        }
      }
      if (!moved) stack.pop();
    }
  };

  carvePath(1, 1);

  // Zmniejszony środek 3x3
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      maze[centerRow + i][centerCol + j] = 0;
    }
  }

  // Połączenia do środka
  maze[centerRow - 2][centerCol] = 0;
  maze[centerRow - 3][centerCol] = 0;

  maze[centerRow + 2][centerCol] = 0;
  maze[centerRow + 3][centerCol] = 0;

  maze[centerRow][centerCol - 2] = 0;
  maze[centerRow][centerCol - 3] = 0;

  maze[centerRow][centerCol + 2] = 0;
  maze[centerRow][centerCol + 3] = 0;

  const numberOfExits =
    difficultyLevel === "easy"
      ? 1
      : difficultyLevel === "medium"
      ? 2
      : difficultyLevel === "hard"
      ? 3
      : 1;

  const exits = [];
  const potentialExitSides = ["top", "bottom", "left", "right"];
  const usedSides = new Set();
  let finishX = 0,
    finishY = 0;

  while (exits.length < numberOfExits && usedSides.size < 4) {
    const side =
      potentialExitSides[Math.floor(Math.random() * potentialExitSides.length)];
    if (usedSides.has(side)) continue;

    let exitX = 0,
      exitY = 0;

    if (side === "right") {
      for (let i = rows - 2; i >= 1; i--) {
        if (maze[i][cols - 2] === 0) {
          maze[i][cols - 1] = 0;
          exitX = i;
          exitY = cols - 1;
          break;
        }
      }
    } else if (side === "left") {
      for (let i = 1; i < rows - 1; i++) {
        if (maze[i][1] === 0) {
          maze[i][0] = 0;
          exitX = i;
          exitY = 0;
          break;
        }
      }
    } else if (side === "top") {
      for (let j = 1; j < cols - 1; j++) {
        if (maze[1][j] === 0) {
          maze[0][j] = 0;
          exitX = 0;
          exitY = j;
          break;
        }
      }
    } else if (side === "bottom") {
      for (let j = cols - 2; j >= 1; j--) {
        if (maze[rows - 2][j] === 0) {
          maze[rows - 1][j] = 0;
          exitX = rows - 1;
          exitY = j;
          break;
        }
      }
    }

    if (maze[exitX][exitY] === 0) {
      maze[exitX][exitY] = 2; // ustawiamy metę dokładnie na wyjściu
      finishX = exitX;
      finishY = exitY;
      exits.push({ exitX, exitY });
      usedSides.add(side);
    }
  }

  return {
    maze,
    exits,
    finishX,
    finishY,
    startX: centerRow,
    startY: centerCol
  };
};

//zmiana poziomu trudnosci przez wielkosc labiryntu
//to do: connect with button to switching a difficulty


const getMazeSize = (difficulty) => {
  switch (difficulty) {
    case "easy":
      return { rows: 31, cols: 31 };
    case "medium":
      return { rows: 61, cols: 61 };
    case "hard":
      return { rows: 91, cols: 91 };
    default:
      return { rows: 31, cols: 31 };
  }
};


export const Maze = () => {
  const canvasRef = useRef(null);
  const [difficulty, setDifficulty] = useState("easy");
  
  const { rows, cols } = getMazeSize(difficulty);
  const size = Math.max(10, Math.min(40, 600 / Math.max(rows, cols)));
   
  const [mazeData, setMazeData] = useState(() =>
    generateMaze(rows, cols, difficulty)
  );
  const { maze, finishX, finishY, startX, startY } = mazeData;  

  const [players, setPlayers] = useState([
    {
      id: "blue",
      x: mazeData.startX,
      y: mazeData.startY,
      time: 0,
      gameOver: false
    },
    {
      id: "red",
      x: mazeData.startX + 1,
      y: mazeData.startY,
      time: 0,
      gameOver: false
    }
  ]);

  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const countdownInterval = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(countdownInterval);
    } else {
      setStartTime(performance.now());
      setTimerActive(true);
      setGameStarted(true);
    }
  }, [countdown]);

  useEffect(() => {
    if (startTime === null || players.every(player => player.gameOver)) return;

    const interval = setInterval(() => {
      const currentTime = performance.now();
      const timeElapsed = (currentTime - startTime) / 1000;
      setElapsedTime(timeElapsed);
      setPlayers(prevPlayers =>
        prevPlayers.map(player =>
          player.gameOver ? player : { ...player, time: timeElapsed }
        )
      );
    }, 10);

    return () => clearInterval(interval);
  }, [startTime, players]);

  const handleKeyDown = e => {
    if (!gameStarted) return;

    setPlayers(prevPlayers =>
      prevPlayers.map(player => {
        let { x, y } = player;

        if (player.id === "blue") {
          if (e.key === "ArrowUp" && maze[x - 1]?.[y] !== 1) x--;
          if (e.key === "ArrowDown" && maze[x + 1]?.[y] !== 1) x++;
          if (e.key === "ArrowLeft" && maze[x]?.[y - 1] !== 1) y--;
          if (e.key === "ArrowRight" && maze[x]?.[y + 1] !== 1) y++;
        } else if (player.id === "red") {
          if (e.key === "w" && maze[x - 1]?.[y] !== 1) x--;
          if (e.key === "s" && maze[x + 1]?.[y] !== 1) x++;
          if (e.key === "a" && maze[x]?.[y - 1] !== 1) y--;
          if (e.key === "d" && maze[x]?.[y + 1] !== 1) y++;
        }

        if (x === finishX && y === finishY && !player.gameOver) {
          player.gameOver = true;
        }

        return { ...player, x, y };
      })
    );
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameStarted]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = cols * size + 40;
    canvas.height = rows * size + 40;

    const centerX = (canvas.width - cols * size) / 2;
    const centerY = (canvas.height - rows * size) / 2;

    const drawMaze = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.translate(centerX, centerY);
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          ctx.fillStyle =
            maze[i][j] === 1 ? "black" : maze[i][j] === 2 ? "green" : "white";
          ctx.fillRect(j * size, i * size, size, size);
        }
      }

      players.forEach(player => {
        ctx.fillStyle = player.id === "blue" ? "blue" : "red";
        ctx.fillRect(player.y * size, player.x * size, size, size);
      });

      ctx.translate(-centerX, -centerY);
    };

    drawMaze();
  }, [players]);

  return (
    <div className="relative flex justify-center items-center overflow-hidden w-dvw h-dvh text-white">
      <div className="absolute top-16 left-0 right-0 flex justify-center items-center">
        <div className="text-3xl font-semibold tabular-nums text-center">
          {countdown > 0
            ? `Zaczynamy za ${countdown}...`
            : `Czas gry: ${Math.floor(elapsedTime / 60)
                .toString()
                .padStart(2, "0")}:${Math.floor(elapsedTime % 60)
                .toString()
                .padStart(2, "0")}.${Math.floor((elapsedTime % 1) * 1000)
                .toString()
                .padStart(3, "0")}`}
        </div>
      </div>

      <canvas ref={canvasRef} className="bg-white rounded-lg" />
      <div className="absolute top-32 right-10">
        <div>
          <h3>
            Blue:{" "}
            {players[0].gameOver
              ? `${Math.floor(players[0].time / 60)
                  .toString()
                  .padStart(2, "0")}:${Math.floor(players[0].time % 60)
                  .toString()
                  .padStart(2, "0")}.${Math.floor((players[0].time % 1) * 1000)
                  .toString()
                  .padStart(3, "0")}`
              : "-"}
          </h3>

          <h3>
            Red:{" "}
            {players[1].gameOver
              ? `${Math.floor(players[1].time / 60)
                  .toString()
                  .padStart(2, "0")}:${Math.floor(players[1].time % 60)
                  .toString()
                  .padStart(2, "0")}.${Math.floor((players[1].time % 1) * 1000)
                  .toString()
                  .padStart(3, "0")}`
              : "-"}
          </h3>
        </div>
      </div>
    </div>
  );
};
