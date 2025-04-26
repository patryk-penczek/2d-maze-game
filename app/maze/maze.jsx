// /app/maze/maze.tsx

"use client";

import { useEffect, useRef, useState } from "react";
import { generateMaze } from "../lib/generateMaze";
import { getMazeSize } from "../lib/getMazeSize";  
import { MazeCanvas } from "../components/MazeCanvas";
import { MazeOverlay } from "../components/MazeOverlay";

export default function Maze({ difficulty }) {
  // Dodany kod, który prawidłowo pobiera wymiary labiryntu
  const { rows, cols } = getMazeSize(difficulty);  
  const size = Math.max(10, Math.min(40, 600 / Math.max(rows, cols)));

  const wallImgRef = useRef(null);
  const groundImgRef = useRef(null);
  const finishImgRef = useRef(null);

  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [mazeData] = useState(() => generateMaze(rows, cols));
  const { maze, finishX, finishY, startX, startY } = mazeData;

  const [players, setPlayers] = useState([
    { id: "blue", x: startX, y: startY, time: 0, gameOver: false },
    { id: "red", x: startX + 1, y: startY, time: 0, gameOver: false }
  ]);

  const [countdown, setCountdown] = useState(3);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    let countdownInterval;
    if (countdown > 0) {
      countdownInterval = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else {
      clearInterval(countdownInterval);
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 0.01);
      }, 10);
    }
    return () => {
      clearInterval(countdownInterval);
    };
  }, [countdown]);

  useEffect(() => {
    const images = ["/wall.webp", "/ground.avif", "/finish.webp"];
    let loadedCount = 0;
    images.forEach(src => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === images.length) {
          setImagesLoaded(true);
        }
      };
    });
  }, []);

  const handleMove = (playerId, dx, dy) => {
    if (countdown > 0) return;

    setPlayers(prevPlayers =>
      prevPlayers.map(player => {
        if (player.id === playerId && !player.gameOver) {
          const newX = player.x + dx;
          const newY = player.y + dy;
          if (
            newX >= 0 && newX < maze.length &&
            newY >= 0 && newY < maze[0].length &&
            maze[newX][newY] !== 1
          ) {
            const isAtFinish = newX === finishX && newY === finishY;
            return {
              ...player,
              x: newX,
              y: newY,
              gameOver: isAtFinish,
              time: isAtFinish ? elapsedTime : player.time
            };
          }
        }
        return player;
      })
    );
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowUp") handleMove("blue", -1, 0);
      if (e.key === "ArrowDown") handleMove("blue", 1, 0);
      if (e.key === "ArrowLeft") handleMove("blue", 0, -1);
      if (e.key === "ArrowRight") handleMove("blue", 0, 1);

      if (e.key === "w") handleMove("red", -1, 0);
      if (e.key === "s") handleMove("red", 1, 0);
      if (e.key === "a") handleMove("red", 0, -1);
      if (e.key === "d") handleMove("red", 0, 1);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [elapsedTime, countdown]);

  useEffect(() => {
    if (players.every(player => player.gameOver) && timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [players]);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden p-4">
      <MazeCanvas maze={maze} players={players} size={size} imagesLoaded={imagesLoaded} />
      <MazeOverlay countdown={countdown} elapsedTime={elapsedTime} players={players} />
    </div>
  );
}
