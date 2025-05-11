"use client";

import { ReturnButton } from "@/components/ReturnButton";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const useSocket = () => {
  const socketRef = useRef(null);
  if (!socketRef.current) {
    socketRef.current = io(`https://twod-maze-game.onrender.com`);
  }
  return socketRef.current;
};

export const Maze = () => {
  const socket = useSocket();
  const router = useRouter();
  const canvasRef = useRef(null);
  const elapsedTimeRef = useRef(0);

  const [mazeData, setMazeData] = useState(null);
  const [players, setPlayers] = useState({});
  const [myId, setMyId] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);


  const size = 15;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const playerName =
      params.get("name") || `Player${Math.floor(Math.random() * 1000)}`;
    const roomId = params.get("room") || "default";
    const difficulty = params.get("difficulty") || "easy";

    socket.emit("joinRoom", { roomId, name: playerName, difficulty });
  }, []);

  useEffect(() => {
    socket.on(
      "init",
      ({ id, players, maze, startX, startY, finishX, finishY }) => {
        setMyId(id);
        setPlayers(players);
        setMazeData({ maze, startX, startY, finishX, finishY });
      }
    );

    socket.on("newPlayer", ({ id, pos }) => {
      setPlayers(prev => ({ ...prev, [id]: pos }));
    });

    socket.on("update", ({ id, pos }) => {
      setPlayers(prev => ({ ...prev, [id]: pos }));
    });

    socket.on("removePlayer", id => {
      setPlayers(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    });

    return () => {
      socket.off("init");
      socket.off("newPlayer");
      socket.off("update");
      socket.off("removePlayer");
    };
  }, []);

  useEffect(() => {
    socket.on("startGame", ({ serverStart }) => {
      setStartTime(serverStart);
      setGameStarted(true);
    });

    return () => socket.off("startGame");
  }, []);

  useEffect(() => {
    if (!startTime) return;
    const intervalId = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - startTime) / 1000;
      setElapsedTime(elapsed);
      elapsedTimeRef.current = elapsed;
    }, 10);

    const syncIntervalId = setInterval(() => {
      socket.emit("getServerTime", ({ now }) => {
        const correctedElapsed = (now - startTime) / 1000;
        setElapsedTime(correctedElapsed);
      });
    }, 3000);

    return () => {
      clearInterval(intervalId);
      clearInterval(syncIntervalId);
    };
  }, [startTime]);

  useEffect(() => {
    if (!gameStarted || !startTime) return;
    if (Object.values(players).length === 0) return;

    const allFinished = Object.values(players).every(
      player => player.finishTime != null
    );

    if (allFinished) {
      socket.emit("getServerTime", ({ now }) => {
        const syncedElapsed = (now - startTime) / 1000;
        setElapsedTime(syncedElapsed);
        elapsedTimeRef.current = syncedElapsed;
        setStartTime(null);
      });
    }
  }, [players, gameStarted, startTime]);

  const handleKeyDown = e => {
    if (!mazeData || !myId || !players[myId]) return;
    if (startTime === null) return;
    if (elapsedTimeRef.current < 0) return;

    const { maze, finishX, finishY } = mazeData;
    let { x, y } = players[myId];
    if (e.key === "ArrowUp" && maze[x - 1]?.[y] !== 1) x--;
    if (e.key === "ArrowDown" && maze[x + 1]?.[y] !== 1) x++;
    if (e.key === "ArrowLeft" && maze[x]?.[y - 1] !== 1) y--;
    if (e.key === "ArrowRight" && maze[x]?.[y + 1] !== 1) y++;

    const newPos = { x, y };
    setPlayers(prev => ({ ...prev, [myId]: { ...prev[myId], ...newPos } }));
    socket.emit("move", newPos);

    if (x === finishX && y === finishY && players[myId]?.finishTime == null) {
      const finishedAt = elapsedTimeRef.current;
      socket.emit("playerFinished", { time: finishedAt });
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [players, myId, mazeData, startTime]);

  useEffect(() => {
    if (!mazeData) return;
    const { maze } = mazeData;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const rows = maze.length;
    const cols = maze[0].length;
    canvas.width = cols * size;
    canvas.height = rows * size;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isPath = (x, y) => maze[x]?.[y] !== undefined && maze[x][y] !== 1;

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const tile = maze[i][j];
        const x = j * size;
        const y = i * size;

        if (tile === 1) {
          ctx.fillStyle = "blue";
          ctx.fillRect(x, y, size, size);
        }
      }
    }

    let positionMap = {};

    Object.entries(players).forEach(([id, { x, y }]) => {
      const key = `${x},${y}`;
      if (!positionMap[key]) positionMap[key] = [];
      positionMap[key].push(id);
    });

    Object.entries(positionMap).forEach(([key, ids]) => {
      const [x, y] = key.split(",").map(Number);
      ids.forEach((id, index) => {
        const player = players[id];
        if (!player) return;
        const offset = index * 4;
        ctx.beginPath();
        ctx.arc(
          y * size + size / 2 + offset,
          x * size + size / 2 + offset,
          size / 3,
          0,
          2 * Math.PI
        );
        ctx.fillStyle = player.color || "gray";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "black";
        ctx.stroke();
      });
    });
  }, [players, mazeData]);

  if (!mazeData) return <div className="text-white">Ładowanie gry...</div>;

  return (
    <div className="relative w-dvw h-dvh text-white overflow-hidden">
      <ReturnButton socket={socket} />

      <div className="absolute top-10 left-1/2 transform -translate-x-1/2 text-2xl z-20">
        {elapsedTime < 0
          ? `Start za ${Math.ceil(-elapsedTime)}s`
          : `Czas: ${elapsedTime.toFixed(2)}s`}
      </div>
  {!gameStarted && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-4 z-20">
        {!players[myId]?.isReady && (
          <button
            onClick={() => socket.emit("playerReady")}
            className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded text-white font-semibold"
          >
            ✔️ Ready
          </button>
        )}
        {players[myId]?.isOwner && !gameStarted && (
          <button
            onClick={() => socket.emit("startGameByOwner")}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded text-white font-semibold"
          >
            🕹 Start Game
          </button>
        )}
      </div>
  )}


      <canvas
        ref={canvasRef}
        className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white z-0"
      />

      <div className="absolute right-10 top-20 bg-black bg-opacity-40 p-4 rounded-lg text-sm z-20">
        <h2 className="font-bold mb-2">Gracze</h2>
        <ul className="space-y-1">
          {Object.entries(players)
            .sort(([, a], [, b]) => {
              if (a.finishTime != null && b.finishTime != null) {
                return a.finishTime - b.finishTime;
              }
              if (a.finishTime != null) return -1;
              if (b.finishTime != null) return 1;
              return 0;
            })
            .map(([id, { nick, color, isOwner, finishTime }]) => (
              <li key={id} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 min-w-[140px]">
                  {players[id]?.isReady ? "✅" : "❌"}
                  <span className="inline-block w-4 text-center">
                    {isOwner ? "👑" : ""}
                  </span>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color || "gray" }}
                  ></div>
                  {nick || "Anonim"}
                  {id === myId && (
                    <span className="text-xs text-gray-400 ml-1">(ty)</span>
                  )}
                </span>

                <span className="text-xs">
                  {elapsedTime >= 0 &&
                    (finishTime != null ? (
                      <span className="text-green-400">
                        ({finishTime.toFixed(2)}s)
                      </span>
                    ) : (
                      <span className="text-red-400">(Not finished)</span>
                    ))}
                </span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
};
