"use client";

import { useRef, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import { ReturnButton } from "@/components/ReturnButton";
import { Settings } from "@/components/Settings";
import { Chat } from "@/components/Chat";

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
socket.on("init", ({ id, players, maze, startX, startY, finishX, finishY, settings }) => {
  setMyId(id);
  setPlayers(players);
  setMazeData(maze ? { maze, startX, startY, finishX, finishY } : null);
  setGameStarted(false);
  setRoomSettings(settings || {});
  setStartTime(null);
  setElapsedTime(0);
  setPlayerColor(players[socket.id]?.color || "");
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

    return () => {
      socket.off("init");
      socket.off("newPlayer");
      socket.off("update");
      socket.off("removePlayer");
      socket.off("movementUpdated");
    };
  }, []);

  useEffect(() => {
    socket.on("startGame", ({ serverStart }) => {
      setStartTime(serverStart);
      setGameStarted(true);
      setRestartCountdown(null);
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

          if (elapsed >= maxRoundTime){
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
  }, [startTime]);

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
  }, [players, gameStarted, startTime]);

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
    const { maze } = mazeData;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const rows = maze.length;
    const cols = maze[0].length;
    canvas.width = cols * size;
    canvas.height = rows * size;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isWall = (x, y) => maze[x]?.[y] === 1;
    const isPath = (x, y) => maze[x]?.[y] === 0;
    const radius = size / 3;

    ctx.fillStyle = '#31572c'

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (isWall(i, j)) {
          const x = j * size;
          const y = i * size;

          const hasTopLeftL =
            isPath(i - 1, j) && isPath(i, j - 1) && isPath(i - 1, j - 1);
          const hasTopRightL =
            isPath(i - 1, j) && isPath(i, j + 1) && isPath(i - 1, j + 1);
          const hasBottomLeftL =
            isPath(i + 1, j) && isPath(i, j - 1) && isPath(i + 1, j - 1);
          const hasBottomRightL =
            isPath(i + 1, j) && isPath(i, j + 1) && isPath(i + 1, j + 1);

          ctx.beginPath();

          if (hasTopLeftL) {
            ctx.moveTo(x + radius, y);
          } else {
            ctx.moveTo(x, y);
          }

          if (hasTopRightL) {
            ctx.lineTo(x + size - radius, y);
            ctx.arcTo(x + size, y, x + size, y + radius, radius);
          } else {
            ctx.lineTo(x + size, y);
          }

          if (hasBottomRightL) {
            ctx.lineTo(x + size, y + size - radius);
            ctx.arcTo(x + size, y + size, x + size - radius, y + size, radius);
          } else {
            ctx.lineTo(x + size, y + size);
          }

          if (hasBottomLeftL) {
            ctx.lineTo(x + radius, y + size);
            ctx.arcTo(x, y + size, x, y + size - radius, radius);
          } else {
            ctx.lineTo(x, y + size);
          }

          if (hasTopLeftL) {
            ctx.lineTo(x, y + radius);
            ctx.arcTo(x, y, x + radius, y, radius);
          } else {
            ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
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
  }, [players, imagesLoaded, mazeData, elapsedTime]);

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

      {mazeData?.maze && elapsedTime >=0 && gameStarted ? (
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
