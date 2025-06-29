"use client";

import { useRef, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import { ReturnButton } from "@/components/ReturnButton";
import { Settings } from "@/components/Settings";
import { Chat } from "@/components/Chat";
import { Ranking } from "@/components/Ranking";

const useSocket = () => {
  const socketRef = useRef(null);
  
  const socketUrls = {
    localhost: `http://${window.location.hostname}:3001`,
    render: 'https://twod-maze-game.onrender.com',
  };

  const socketUrl =
    window.location.hostname === 'localhost'
      ? socketUrls.localhost
      : socketUrls.render;

  if (!socketRef.current) {
    socketRef.current = io(socketUrl);
  }

  return socketRef.current;
};

export const Maze = () => {
  const socket = useSocket();
  const router = useRouter();
  const canvasRef = useRef(null);
  const wallImgRef = useRef(null);
  const groundImgRef = useRef(null);
  const finishImgRef = useRef(null);
  const elapsedTimeRef = useRef(0);

  const [roomId, setRoomId] = useState("default");
  const [restartCountdown, setRestartCountdown] = useState(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [mazeData, setMazeData] = useState(null);
  const [players, setPlayers] = useState({});
  const [myId, setMyId] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [restartDelay, setRestartDelay] = useState(15);
  const [maxRoundTime, setMaxRoundTime] = useState(120);
  const [roomSettings, setRoomSettings] = useState({});
  const [visionRadius, setVisionRadius] = useState(15);

  const size = 15;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const playerName =
      params.get("name") || `Player${Math.floor(Math.random() * 1000)}`;
    const room = params.get("room") || "default";
    setRoomId(room);

    const difficulty = params.get("difficulty") || "easy";
    socket.emit("joinRoom", { roomId: room, name: playerName, difficulty });
  }, []);

  useEffect(() => {
    socket.on("init", ({ id, players, maze, startX, startY, finishX, finishY, redDots, settings }) => {
      setMyId(id);
      setPlayers(players);
      setMazeData(maze ? { maze, startX, startY, finishX, finishY, redDots } : null);
      setGameStarted(false);
      setRoomSettings(settings || {});
      setStartTime(null);
      setElapsedTime(0);
      setVisionRadius(15);
      elapsedTimeRef.current = 0;
      setRestartCountdown(null);
      setMaxRoundTime(settings?.maxRoundTime ?? 120);
      setRestartDelay(settings?.restartDelay ?? 15);
    });

    socket.on("newPlayer", ({ id, pos }) => {
      setPlayers((prev) => ({ ...prev, [id]: pos }));
    });

    socket.on("update", ({ id, pos }) => {
      setPlayers((prev) => ({ ...prev, [id]: pos }));
    });

    socket.on("removePlayer", (id) => {
      setPlayers((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    });

    socket.on("movementUpdated", ({ id, movement }) => {
      setPlayers((prev) => ({
        ...prev,
        [id]: { ...prev[id], movement },
      }));
    });

    socket.on("redDotCollected", ({ playerId, remainingDots, visionRadius }) => {
  if (playerId === myId) {
    console.log("Zebrano czerwoną kropkę, nowy promień:", visionRadius);
    setVisionRadius(visionRadius);
    
    setTimeout(() => {
      console.log("Przywracanie normalnego widzenia");
      setVisionRadius(15);
    }, 5000);
  }
  setMazeData(prev => prev ? { ...prev, redDots: remainingDots } : null);
});

    return () => {
      socket.off("init");
      socket.off("newPlayer");
      socket.off("update");
      socket.off("removePlayer");
      socket.off("movementUpdated");
      socket.off("redDotCollected");
    };
  }, [myId]);

  useEffect(() => {
    socket.on("startGame", ({ serverStart }) => {
      setStartTime(serverStart);
      setGameStarted(true);
      setRestartCountdown(null);
    });

    return () => socket.off("startGame");
  }, []);

  useEffect(() => {
    socket.on("pointsUpdated", ({ players: updated }) => {
      setPlayers((prev) => {
        const newPlayers = { ...prev };
        for (const id in updated) {
          newPlayers[id] = {
            ...newPlayers[id],
            points: updated[id].points ?? newPlayers[id]?.points,
            medals: updated[id].medals ?? newPlayers[id]?.medals,
          };
        }
        return newPlayers;
      });
    });
    
    return () => {
      socket.off("pointsUpdated");
    };
  }, []);

  useEffect(() => {
    if (!startTime) return;
    const intervalId = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - startTime) / 1000;
      setElapsedTime(elapsed);
      elapsedTimeRef.current = elapsed;

      if (elapsed >= maxRoundTime) {
        setGameStarted(false);
        setStartTime(null);
      }
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
  }, [startTime, maxRoundTime]);

  useEffect(() => {
    if (!gameStarted || !startTime) return;
    if (Object.values(players).length === 0) return;

    const allFinished = Object.values(players).every(
      (player) => player.finishTime != null
    );

    if (allFinished && restartCountdown == null) {
      const delay = roomSettings?.restartDelay ?? 15;
      let countdown = delay;
      setRestartCountdown(countdown);

      const countdownInterval = setInterval(() => {
        countdown--;
        setRestartCountdown(countdown);
        if (countdown <= 0) {
          clearInterval(countdownInterval);
          setRestartCountdown(null);
          setGameStarted(false);
          setStartTime(null);
          if (roomSettings?.autoRestart !== false && players[myId]?.isOwner) {
            socket.emit("newGame");
          }
        }
      }, 1000);
    }
  }, [players, gameStarted, startTime, roomSettings, myId]);

  useEffect(() => {
    if (!mazeData || !mazeData.maze) return;

    const wallImg = new Image();
    const groundImg = new Image();
    const finishImg = new Image();

    wallImg.src = "/wall.webp";
    groundImg.src = "/ground.avif";
    finishImg.src = "/finish.webp";

    let loaded = 0;
    const check = () => {
      if (++loaded === 3) setImagesLoaded(true);
    };

    wallImg.onload = check;
    groundImg.onload = check;
    finishImg.onload = check;

    wallImgRef.current = wallImg;
    groundImgRef.current = groundImg;
    finishImgRef.current = finishImg;
  }, [mazeData]);

  const handleKeyDown = (e) => {
    if (!mazeData || !myId || !players[myId]) return;
    if (!gameStarted || startTime === null || elapsedTimeRef.current < 0) return;

    const { maze, finishX, finishY } = mazeData;
    let { x, y } = players[myId];
    const movementMode = players[myId]?.movement || "arrows";

    if (movementMode === "wasd") {
      if (e.key === "w" && maze[x - 1]?.[y] !== 1) x--;
      if (e.key === "s" && maze[x + 1]?.[y] !== 1) x++;
      if (e.key === "a" && maze[x]?.[y - 1] !== 1) y--;
      if (e.key === "d" && maze[x]?.[y + 1] !== 1) y++;
    } else {
      if (e.key === "ArrowUp" && maze[x - 1]?.[y] !== 1) x--;
      if (e.key === "ArrowDown" && maze[x + 1]?.[y] !== 1) x++;
      if (e.key === "ArrowLeft" && maze[x]?.[y - 1] !== 1) y--;
      if (e.key === "ArrowRight" && maze[x]?.[y + 1] !== 1) y++;
    }
    if (e.key === "k") x = finishX, y = finishY;

    const newPos = { x, y };
setPlayers((prev) => ({ ...prev, [myId]: { ...prev[myId], ...newPos } })); 
socket.emit("move", newPos);

    if (x === finishX && y === finishY && players[myId]?.finishTime == null) {
      const finishedAt = elapsedTimeRef.current;
      socket.emit("playerFinished", { time: finishedAt });
    }
  };

  useEffect(() => {
    socket.on("settingsUpdated", (settings) => {
      setRoomSettings(settings || {});
      if (settings.maxRoundTime != null) {
        setMaxRoundTime(settings.maxRoundTime);
      }
      if (settings.restartDelay != null) {
        setRestartDelay(settings.restartDelay);
      }
    });

    return () => {
      socket.off("settingsUpdated");
    };
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [players, myId, mazeData, startTime, gameStarted]);

  useEffect(() => {
    if (!imagesLoaded || !mazeData || !mazeData.maze) return;
    const { maze, redDots } = mazeData;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const rows = maze.length;
    const cols = maze[0].length;
    canvas.width = cols * size;
    canvas.height = rows * size;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw maze background
    ctx.fillStyle = '#31572c';
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (maze[i][j] === 1) {
          const x = j * size;
          const y = i * size;
          ctx.fillRect(x, y, size, size);
        }
      }
    }

    // Draw finish point
    const { finishX, finishY } = mazeData;
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(
      finishY * size + size / 4,
      finishX * size + size / 4,
      size / 2,
      size / 2
    );

    // Draw red dots
    if (redDots && redDots.length > 0) {
      redDots.forEach(({ x, y }) => {
        ctx.beginPath();
        ctx.arc(
          y * size + size / 2,
          x * size + size / 2,
          size / 4,
          0,
          2 * Math.PI
        );
        ctx.fillStyle = '#ff0000';
        ctx.fill();
      });
    }

    // Draw players
    Object.entries(players).forEach(([id, { x, y, color }]) => {
      ctx.beginPath();
      ctx.arc(
        y * size + size / 2,
        x * size + size / 2,
        size / 3,
        0,
        2 * Math.PI
      );
      ctx.fillStyle = color || "gray";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "black";
      ctx.stroke();
    });

    // Apply flashlight effect if vision radius is reduced
    if (visionRadius < 15 && players[myId]) {
      const { x: playerX, y: playerY } = players[myId];
      const gradient = ctx.createRadialGradient(
        playerY * size + size / 2,
        playerX * size + size / 2,
        0,
        playerY * size + size / 2,
        playerX * size + size / 2,
        visionRadius * size
      );
      gradient.addColorStop(0, 'rgba(0,0,0,0.1)');
      gradient.addColorStop(0.8, 'rgba(0,0,0,0.7)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.95)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [players, imagesLoaded, mazeData, elapsedTime, visionRadius, myId]);

  return (
    <div className="relative w-dvw h-dvh text-white overflow-hidden">
      <ReturnButton socket={socket} />
      <Settings socket={socket} isOwner={players[myId]?.isOwner} playerColor={players[myId]?.color}/>
      
      <div className="bg-[#132a13] p-4 rounded-lg shadow-2xl absolute top-10 left-1/2 transform -translate-x-1/2 text-2xl z-50">
        {elapsedTime < 0
          ? `Start za ${Math.ceil(-elapsedTime)}s`
          : `Czas: ${elapsedTime.toFixed(2)}s${restartCountdown != null ? ` (${restartCountdown}s left)` : ""}`}
      </div>

      <div className="absolute top-30 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-4 z-20">
        {players[myId]?.isOwner && (
          <button
            onClick={() => socket.emit("newGame")}
            className="bg-yellow-500 hover:bg-yellow-600 px-6 py-3 rounded text-white font-semibold"
          >
            ♻️ New Game
          </button>
        )}

        {players[myId]?.isOwner && mazeData?.maze && !gameStarted && (
          <button
            onClick={() => socket.emit("startGameByOwner")}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded text-white font-semibold"
          >
            🕹 Start Game
          </button>
        )}

        {!players[myId]?.isReady && !gameStarted && mazeData?.maze && (
          <button
            onClick={() => socket.emit("playerReady")}
            className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded text-white font-semibold"
          >
            ✔️ Ready
          </button>
        )}
      </div>

      {Object.keys(players).length > 0 && (
        <Ranking players={players} scoringType={roomSettings?.scoringType || "points"} />
      )}

      {mazeData?.maze && elapsedTime >= 0 && gameStarted ? (
        <canvas
          ref={canvasRef}
          className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white z-0 border-12 border-[#132a13] shadow-xl rounded-md"
        />
      ) : (
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xl text-white z-0">
          Czekam na rozpoczęcie gry...
        </div>
      )}

      <div className="absolute right-4 top-20 bg-white text-black p-4 border-2 border-[#132a13] shadow-xl rounded-md text-sm z-50">
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
                  <span className="inline-block w-4 text-center">{isOwner ? "👑" : ""}</span>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color || "gray" }}></div>
                  {nick || "Anonim"}
                  {id === myId && <span className="text-xs text-gray-400 ml-1">(ty)</span>}
                </span>
                <span className="text-xs">
                  {elapsedTime >= 0 && (finishTime != null ? (
                    <span className="text-green-400">({finishTime.toFixed(2)}s)</span>
                  ) : (
                    <span className="text-red-400">(Not finished)</span>
                  ))}
                </span>
              </li>
            ))}
        </ul>
      </div>

      {roomSettings.chatEnabled && (
        <div className="absolute bottom-24 left-4 w-80 z-50">
          <Chat socket={socket}
            myId={myId}
            players={players}
            chatEnabled={roomSettings.chatEnabled}
            roomId={roomId} />
        </div>
      )}
    </div>
  );
};