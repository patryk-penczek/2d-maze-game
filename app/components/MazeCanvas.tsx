"use client";

import { useEffect, useRef } from "react";

interface MazeCanvasProps {
  maze: number[][];
  players: { id: string; x: number; y: number }[];
  size: number;
  imagesLoaded: boolean;
}

export const MazeCanvas = ({ maze, players, size, imagesLoaded }: MazeCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!imagesLoaded) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const wallImg = new Image();
    const groundImg = new Image();
    const finishImg = new Image();
    wallImg.src = "/wall.webp";
    groundImg.src = "/ground.avif";
    finishImg.src = "/finish.webp";

    Promise.all([
      new Promise(resolve => wallImg.onload = resolve),
      new Promise(resolve => groundImg.onload = resolve),
      new Promise(resolve => finishImg.onload = resolve)
    ]).then(() => {
      const rows = maze.length;
      const cols = maze[0].length;

      canvas.width = cols * size + 40;
      canvas.height = rows * size + 40;

      const centerX = (canvas.width - cols * size) / 2;
      const centerY = (canvas.height - rows * size) / 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.translate(centerX, centerY);

      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          const tile = maze[i][j];
          const img = tile === 1 ? wallImg : tile === 2 ? finishImg : groundImg;
          ctx.drawImage(img, j * size, i * size, size, size);
        }
      }

      players.forEach(player => {
        ctx.fillStyle = player.id === "blue" ? "blue" : "red";
        ctx.fillRect(player.y * size, player.x * size, size, size);
      });

      ctx.translate(-centerX, -centerY);
    });
  }, [maze, players, size, imagesLoaded]);

  return <canvas ref={canvasRef} className="bg-white rounded-lg" />;
};
