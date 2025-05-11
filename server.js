const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { generateMaze } = require("./mazeUtils");

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "https://twod-maze-frontend.onrender.com",
  "http://localhost:3000",
  "https://2d-maze-game-git-fork-asad62611-render-despareks-projects.vercel.app",
  "https://2d-maze-game.vercel.app"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST"],
  credentials: true
}));

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

const COLORS = [
  "#3498db", "#9b59b6", "#e67e22", "#f1c40f", "#1abc9c",
  "#8e44ad", "#2980b9", "#e91e63", "#00cec9", "#6c5ce7",
  "#fdcb6e", "#0984e3", "#a29bfe", "#fab1a0", "#ffeaa7", "#81ecec"
];
let colorIndex = 0;

const rooms = {}; // { roomId: { players, ownerId, gameStarted, mazeData, difficulty } }

function getMazeSize(difficulty) {
  switch (difficulty) {
    case "easy": return { rows: 31, cols: 31 };
    case "medium": return { rows: 45, cols: 45 };
    case "hard": return { rows: 61, cols: 61 };
    case "extreme": return { rows: 81, cols: 81 };
    default: return { rows: 31, cols: 31 };
  }
}

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("joinRoom", ({ roomId, name, difficulty }) => {
    console.log(`➡️ ${socket.id} dołącza do pokoju: ${roomId}, poziom: ${difficulty}`);
    socket.roomId = roomId;

    if (!rooms[roomId]) {
      const { rows, cols } = getMazeSize(difficulty);
      const mazeData = generateMaze(rows, cols);
      rooms[roomId] = {
        players: {},
        ownerId: socket.id,
        gameStarted: false,
        mazeData,
        difficulty,
      };
    }

    const room = rooms[roomId];
    const { maze, startX, startY, finishX, finishY } = room.mazeData;

    const color = COLORS[colorIndex % COLORS.length];
    colorIndex++;

    const playerData = {
      x: startX,
      y: startY,
      color,
      nick: name || `Player${colorIndex}`,
      isOwner: socket.id === room.ownerId,
      isReady: false,
    };

    room.players[socket.id] = playerData;
    socket.join(roomId);

    socket.emit("init", {
      id: socket.id,
      players: room.players,
      maze, startX, startY, finishX, finishY
    });

    socket.to(roomId).emit("newPlayer", {
      id: socket.id,
      pos: playerData,
    });

    socket.on("move", (pos) => {
      if (room.players[socket.id]) {
        room.players[socket.id] = { ...room.players[socket.id], ...pos };
        socket.to(roomId).emit("update", {
          id: socket.id,
          pos: room.players[socket.id]
        });
      }
    });

    socket.on("startGameByOwner", () => {
      const room = rooms[socket.roomId];
      if (!room || room.ownerId !== socket.id || room.gameStarted) return;
      room.gameStarted = true;
      const serverStart = Date.now() + 3000;
      io.to(socket.roomId).emit("startGame", { serverStart });
    });

    socket.on("leaveRoom", () => {
      handlePlayerLeave(socket, socket.roomId);
    });

    socket.on("getServerTime", (callback) => {
      callback({ now: Date.now() });
    });

    socket.on("playerReady", () => {
      const room = rooms[socket.roomId];
      if (!room || !room.players[socket.id]) return;
      room.players[socket.id].isReady = true;
      io.to(socket.roomId).emit("update", {
        id: socket.id,
        pos: room.players[socket.id]
      });
    });
    /*
    if (Object.keys(room.players).length >= 3 && !room.gameStarted) {
      room.gameStarted = true;
      const serverStart = Date.now() + 3000;
      io.to(roomId).emit("startGame", { serverStart });
    }
    */

    socket.on("playerFinished", ({ time }) => {
      const room = rooms[socket.roomId];
      if (!room || !room.players[socket.id]) return;
      room.players[socket.id].finishTime = time;
      io.to(socket.roomId).emit("update", {
        id: socket.id,
        pos: room.players[socket.id]
      });
    });

    socket.on("disconnect", () => {
      handlePlayerLeave(socket, socket.roomId);
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
          pos: room.players[nextOwner]
        });
      }
    }

    /*
    if (Object.keys(room.players).length < 2) {
      room.gameStarted = false;
    }
    */

    socket.leave(roomId);
  }
});

server.listen(3001, () => {
  console.log("✅ Server running on http://localhost:3001");
});
