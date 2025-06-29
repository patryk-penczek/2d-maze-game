const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { generateMaze } = require("./mazeUtils");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

const COLORS = [
  "#3498db", "#9b59b6", "#e67e22", "#f1c40f", "#1abc9c", "#8e44ad", "#2980b9",
  "#e91e63", "#00cec9", "#6c5ce7", "#fdcb6e", "#0984e3", "#a29bfe", "#fab1a0",
  "#ffeaa7", "#81ecec"
];
let colorIndex = 0;

const rooms = {};

function getMazeSize(difficulty) {
  switch (difficulty) {
    case "medium": return { rows: 45, cols: 45 };
    case "hard": return { rows: 61, cols: 61 };
    case "extreme": return { rows: 81, cols: 81 };
    default: return { rows: 31, cols: 31 };
  }
}

function shouldAutoStart(room) {
  const players = Object.values(room.players);
  const readyCount = players.filter((p) => p.isReady).length;
  const thresholdRaw = room.settings.autoStartThreshold;

  if (typeof thresholdRaw === "string" && thresholdRaw.endsWith("%")) {
    const percent = parseInt(thresholdRaw.replace("%", ""));
    const required = Math.ceil((percent / 100) * players.length);
    return readyCount >= required;
  }

  const threshold = parseInt(thresholdRaw, 10);
  if (!isNaN(threshold)) {
    return readyCount >= threshold;
  }

  return false;
}

function generateMazeWithRedDots(rows, cols, redDotsCount = 5) {
  const mazeData = generateMaze(rows, cols);
  const { maze, startX, startY, finishX, finishY } = mazeData;

  const redDots = [];
  for (let i = 0; i < redDotsCount; i++) {
    let x, y;
    do {
      x = Math.floor(Math.random() * rows);
      y = Math.floor(Math.random() * cols);
    } while (
      maze[x][y] !== 0 || 
      (x === startX && y === startY) || 
      (x === finishX && y === finishY) ||
      redDots.some(dot => dot.x === x && dot.y === y)
    );
    redDots.push({ x, y });
  }

  return { ...mazeData, redDots };
}

io.on("connection", (socket) => {
  socket.on("joinRoom", ({ roomId, name, difficulty }) => {
    socket.roomId = roomId;

    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: {},
        ownerId: socket.id,
        gameStarted: false,
        mazeData: null,
        settings: {
          difficulty,
          restartDelay: 15,
          maxPlayers: 16,
          autoStartThreshold: "75%",
          finishThreshold: "100%",
          chatEnabled: true,
          autoRestart: true,
          scoringType: "points",
          maxRoundTime: 120,
          redDotsCount: 5,
        },
      };
    }

    const room = rooms[roomId];
    if (room && Object.keys(room.players).length >= room.settings.maxPlayers) {
      socket.emit("roomFull", { message: "Room is full" });
      return;
    }

    const color = COLORS[colorIndex % COLORS.length];
    colorIndex++;

    const playerData = {
      x: 0,
      y: 0,
      color,
      nick: name || `Player${colorIndex}`,
      isOwner: socket.id === room.ownerId,
      isReady: false,
      finishTime: null,
      movement: "arrows",
      visionRadius: 15,
    };

    room.players[socket.id] = playerData;
    socket.join(roomId);

    const maze = room.mazeData?.maze || null;
    const startX = room.mazeData?.startX ?? 0;
    const startY = room.mazeData?.startY ?? 0;
    const finishX = room.mazeData?.finishX ?? 0;
    const finishY = room.mazeData?.finishY ?? 0;
    const redDots = room.mazeData?.redDots || [];

    socket.emit("init", {
      id: socket.id,
      players: room.players,
      maze,
      startX,
      startY,
      finishX,
      finishY,
      redDots,
      settings: room.settings,
    });

    socket.to(roomId).emit("newPlayer", { id: socket.id, pos: playerData });

    socket.on("move", (pos) => {
      if (!room.players[socket.id]) return;

      const newPos = { ...room.players[socket.id], ...pos };
      room.players[socket.id] = newPos;

      // Sprawdzanie kolizji z czerwonymi kropkami
      if (room.mazeData?.redDots) {
        const dotIndex = room.mazeData.redDots.findIndex(
          dot => dot.x === newPos.x && dot.y === newPos.y
        );
        
        if (dotIndex !== -1) {
          // Usuwanie zebranej kropki
          room.mazeData.redDots.splice(dotIndex, 1);
          
          // Aktualizacja promienia widzenia gracza
          room.players[socket.id].visionRadius = Math.max(
            newPos.visionRadius * 0.8, 
            2
          );
          
          // Powiadomienie wszystkich graczy o aktualizacji
          io.to(roomId).emit("redDotCollected", {
            playerId: socket.id,
            remainingDots: room.mazeData.redDots.length,
            visionRadius: room.players[socket.id].visionRadius
          });
        }
      }

      socket.to(roomId).emit("update", {
        id: socket.id,
        pos: newPos,
      });
    });

    socket.on("playerReady", () => {
      if (room.players[socket.id]) {
        room.players[socket.id].isReady = true;
        io.to(roomId).emit("update", {
          id: socket.id,
          pos: room.players[socket.id],
        });

        if (!room.gameStarted && shouldAutoStart(room)) {
          room.gameStarted = true;
          const serverStart = Date.now() + 3000;
          io.to(roomId).emit("startGame", { serverStart });
        }
      }
    });

    socket.on("startGameByOwner", () => {
      if (room.ownerId !== socket.id || room.gameStarted) return;
      room.gameStarted = true;
      const serverStart = Date.now() + 3000;
      io.to(roomId).emit("startGame", { serverStart });
    });

    socket.on("playerFinished", ({ time }) => {
      if (!room.players[socket.id]) return;
    
      room.players[socket.id].finishTime = time;
      io.to(roomId).emit("update", {
        id: socket.id,
        pos: room.players[socket.id],
      });
    
      const allFinished = Object.values(room.players).every((p) => p.finishTime != null);
    
      if (allFinished) {
        const { scoringType, points1 = 10, points2 = 7, points3 = 5 } = room.settings;
    
        if (scoringType === "points" || scoringType === "placements") {
          const placements = Object.entries(room.players)
            .sort(([, a], [, b]) => a.finishTime - b.finishTime);
        
          placements.forEach(([id], index) => {
            if (scoringType === "points") {
              let points = 0;
              if (index === 0) points = room.settings.points1 ?? 10;
              else if (index === 1) points = room.settings.points2 ?? 7;
              else if (index === 2) points = room.settings.points3 ?? 5;
              room.players[id].points = (room.players[id].points || 0) + points;
            }
        
            if (scoringType === "placements") {
              const medals = room.players[id].medals || { gold: 0, silver: 0, bronze: 0 };
              if (index === 0) medals.gold++;
              else if (index === 1) medals.silver++;
              else if (index === 2) medals.bronze++;
              room.players[id].medals = medals;
            }
          });
        
          io.to(roomId).emit("pointsUpdated", {
            players: room.players,
          });
        }
      }
    });

    socket.on("getServerTime", (cb) => {
      cb({ now: Date.now() });
    });

    socket.on("changeSettings", (newSettings) => {
      if (socket.id !== room.ownerId) return;

      room.settings = { 
        ...room.settings, 
        ...newSettings,
        redDotsCount: Math.min(15, Math.max(0, newSettings.redDotsCount || 5))
      };
      io.to(roomId).emit("settingsUpdated", room.settings);
    });

    socket.on("changeMovement", (mode) => {
      if (!["arrows", "wasd"].includes(mode)) return;
      if (room.players[socket.id]) {
        room.players[socket.id].movement = mode;
        socket.emit("movementUpdated", {
          id: socket.id,
          movement: mode,
        });
      }
    });

    socket.on("changeColor", (newColor) => {
      const room = rooms[socket.roomId];
      if (!room || !room.players[socket.id]) return;
    
      const usedColors = Object.values(room.players)
        .filter(p => p.color && p.color !== room.players[socket.id].color)
        .map(p => p.color.toLowerCase());
    
      if (usedColors.includes(newColor.toLowerCase())) return;
    
      room.players[socket.id].color = newColor;
      io.to(socket.roomId).emit("update", {
        id: socket.id,
        pos: room.players[socket.id],
      });
    });

    socket.on("chatMessage", ({ roomId, nick, message }) => {
      const resolvedRoomId = roomId || socket.roomId;
      const room = rooms[resolvedRoomId];
      if (!room || room.settings.chatEnabled === false) return;

      io.to(resolvedRoomId).emit("chatMessage", {
        id: socket.id,
        nick,
        message,
        timestamp: Date.now(),
      });
    });

    socket.on("newGame", () => {
      if (room.ownerId !== socket.id) return;

      const { difficulty, redDotsCount = 5 } = room.settings;
      const { rows, cols } = getMazeSize(difficulty);
      const mazeData = generateMazeWithRedDots(rows, cols, redDotsCount);
      room.mazeData = mazeData;
      room.gameStarted = false;

      for (const id in room.players) {
        room.players[id] = {
          ...room.players[id],
          x: mazeData.startX,
          y: mazeData.startY,
          isReady: false,
          finishTime: null,
          visionRadius: 15,
        };
      }

      io.to(roomId).emit("init", {
        id: socket.id,
        players: room.players,
        maze: mazeData.maze,
        startX: mazeData.startX,
        startY: mazeData.startY,
        finishX: mazeData.finishX,
        finishY: mazeData.finishY,
        redDots: mazeData.redDots,
        settings: room.settings,
      });
    });

    socket.on("leaveRoom", () => {
      handlePlayerLeave(socket, roomId);
    });

    socket.on("disconnect", () => {
      handlePlayerLeave(socket, roomId);
    });
  });

  function handlePlayerLeave(socket, roomId) {
    const room = rooms[roomId];
    if (!room || !room.players[socket.id]) return;

    delete room.players[socket.id];
    io.to(roomId).emit("removePlayer", socket.id);

    if (room.ownerId === socket.id) {
      const nextOwner = Object.keys(room.players)[0];
      room.ownerId = nextOwner;
      if (nextOwner && room.players[nextOwner]) {
        room.players[nextOwner].isOwner = true;
        io.to(roomId).emit("update", {
          id: nextOwner,
          pos: room.players[nextOwner],
        });
      }
    }

    if (Object.keys(room.players).length < 2) {
      room.gameStarted = false;
    }

    socket.leave(roomId);
  }
});

server.listen(3001, () => {
  console.log("✅ Server running on http://localhost:3001");
});