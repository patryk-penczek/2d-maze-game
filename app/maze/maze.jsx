'use client';

import { Chat } from '@/components/Chat';
import { Ranking } from '@/components/Ranking';
import { ReturnButton } from '@/components/ReturnButton';
import { Settings } from '@/components/Settings';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const useSocket = () => {
  return useMemo(() => {
    if (typeof window === 'undefined') return null;
    const socketUrls = {
      localhost: `http://${window.location.hostname}:3001`,
      render: 'https://twod-maze-game.onrender.com',
    };
    const socketUrl =
      window.location.hostname === 'localhost'
        ? socketUrls.localhost
        : socketUrls.render;
    return io(socketUrl);
  }, []);
};

export const Maze = () => {
  const socket = useSocket();
  if (!socket) return null;
  const router = useRouter();
  const canvasRef = useRef(null);
  const wallImgRef = useRef(null);
  const groundImgRef = useRef(null);
  const finishImgRef = useRef(null);
  const elapsedTimeRef = useRef(0);

  const [roomId, setRoomId] = useState('default');
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
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const playerName =
      params.get('name') || `Player${Math.floor(Math.random() * 1000)}`;
    const room = params.get('room') || 'default';
    setRoomId(room);

    const difficulty = params.get('difficulty') || 'easy';
    socket.emit('joinRoom', { roomId: room, name: playerName, difficulty });
  }, []);

  useEffect(() => {
    socket.on(
      'init',
      ({ id, players, maze, startX, startY, finishX, finishY, settings }) => {
        setMyId(id);
        setPlayers(players);
        setMazeData(maze ? { maze, startX, startY, finishX, finishY } : null);
        setGameStarted(false);
        setRoomSettings(settings || {});
        setStartTime(null);
        setElapsedTime(0);
        elapsedTimeRef.current = 0;
        setRestartCountdown(null);
        setMaxRoundTime(settings?.maxRoundTime ?? 120);
        setRestartDelay(settings?.restartDelay ?? 15);
      }
    );

    socket.on('updateMaze', ({ maze }) => {
      const newMaze = maze.map((row) => [...row]);

      setMazeData((prevMazeData) => {
        if (!prevMazeData) return null;
        return {
          ...prevMazeData,
          maze: newMaze,
        };
      });
    });

    socket.on('newPlayer', ({ id, pos }) => {
      setPlayers((prev) => ({ ...prev, [id]: pos }));
    });

    socket.on('update', ({ id, pos }) => {
      setPlayers((prev) => ({ ...prev, [id]: pos }));
    });

    socket.on('removePlayer', (id) => {
      setPlayers((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    });

    socket.on('movementUpdated', ({ id, movement }) => {
      setPlayers((prev) => ({
        ...prev,
        [id]: { ...prev[id], movement },
      }));
    });

    return () => {
      socket.off('init');
      socket.off('updateMaze');
      socket.off('newPlayer');
      socket.off('update');
      socket.off('removePlayer');
      socket.off('movementUpdated');
    };
  }, []);

  useEffect(() => {
    socket.on('startGame', ({ serverStart }) => {
      const now = Date.now();
      const delay = Math.max(0, Math.round((serverStart - now) / 1000));
      if (delay > 0) {
        setCountdown(delay);
        setGameStarted(false);
        let current = delay;
        const interval = setInterval(() => {
          current--;
          setCountdown(current);
          if (current <= 0) {
            clearInterval(interval);
            setCountdown(null);
            setGameStarted(true);
            setStartTime(serverStart);
          }
        }, 1000);
        return () => clearInterval(interval);
      } else {
        setCountdown(null);
        setGameStarted(true);
        setStartTime(serverStart);
      }
      setRestartCountdown(null);
    });

    return () => socket.off('startGame');
  }, []);

  useEffect(() => {
    socket.on('pointsUpdated', ({ players: updated }) => {
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
      socket.off('pointsUpdated');
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
      socket.emit('getServerTime', ({ now }) => {
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
            socket.emit('newGame');
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

    wallImg.src = '/wall.webp';
    groundImg.src = '/ground.avif';
    finishImg.src = '/finish.webp';

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
    if (!gameStarted || startTime === null || elapsedTimeRef.current < 0)
      return;

    const { maze, finishX, finishY } = mazeData;
    let { x, y } = players[myId];
    const movementMode = players[myId]?.movement || 'arrows';

    if (movementMode === 'wasd') {
      if (e.key === 'w' && maze[x - 1]?.[y] !== 1) x--;
      if (e.key === 's' && maze[x + 1]?.[y] !== 1) x++;
      if (e.key === 'a' && maze[x]?.[y - 1] !== 1) y--;
      if (e.key === 'd' && maze[x]?.[y + 1] !== 1) y++;
    } else {
      if (e.key === 'ArrowUp' && maze[x - 1]?.[y] !== 1) x--;
      if (e.key === 'ArrowDown' && maze[x + 1]?.[y] !== 1) x++;
      if (e.key === 'ArrowLeft' && maze[x]?.[y - 1] !== 1) y--;
      if (e.key === 'ArrowRight' && maze[x]?.[y + 1] !== 1) y++;
    }
    if (e.key === 'k') (x = finishX), (y = finishY);

    const newPos = { x, y };
    setPlayers((prev) => ({ ...prev, [myId]: { ...prev[myId], ...newPos } }));
    socket.emit('move', newPos);

    if (x === finishX && y === finishY && players[myId]?.finishTime == null) {
      const finishedAt = elapsedTimeRef.current;
      socket.emit('playerFinished', { time: finishedAt });
    }
  };
  useEffect(() => {
    socket.on('settingsUpdated', (settings) => {
      setRoomSettings(settings || {});
      if (settings.maxRoundTime != null) {
        setMaxRoundTime(settings.maxRoundTime);
      }
      if (settings.restartDelay != null) {
        setRestartDelay(settings.restartDelay);
      }
    });

    return () => {
      socket.off('settingsUpdated');
    };
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [players, myId, mazeData, startTime, gameStarted]);

  useEffect(() => {
    if (!imagesLoaded || !mazeData || !mazeData.maze) return;
    const { maze } = mazeData;

    const containerSize = 0.75 * window.innerHeight;
    const rows = maze.length;
    const cols = maze[0].length;
    const size = Math.floor(containerSize / Math.max(rows, cols));

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = cols * size;
    canvas.height = rows * size;
    canvas.style.width = '75dvh';
    canvas.style.height = '75dvh';
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isWall = (x, y) => maze[x]?.[y] === 1;
    const isPath = (x, y) => maze[x]?.[y] === 0;
    const radius = size / 3;

    ctx.fillStyle = '#31572c';

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
    const { finishX, finishY } = mazeData;
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(
      finishY * size + size / 4,
      finishX * size + size / 4,
      size / 2,
      size / 2
    );
    let positionMap = {};

    Object.entries(players).forEach(([id, { x, y }]) => {
      const key = `${x},${y}`;
      if (!positionMap[key]) positionMap[key] = [];
      positionMap[key].push(id);
    });

    Object.entries(positionMap).forEach(([key, ids]) => {
      const [x, y] = key.split(',').map(Number);
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
        ctx.fillStyle = player.color || 'gray';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'black';
        ctx.stroke();
      });
    });
  }, [players, imagesLoaded, mazeData, elapsedTime]);

  return (
    <div className="relative w-dvw h-dvh text-white overflow-hidden">
      <ReturnButton socket={socket} />
      <Settings
        socket={socket}
        isOwner={players[myId]?.isOwner}
        playerColor={players[myId]?.color}
      />
      <div className="absolute top-4 left-4 z-50">
        <div className="w-80 bg-[#132a13] rounded-xl shadow-lg border border-[#31572c] flex flex-col items-center gap-2 px-4 py-3">
          <div className="w-full bg-[#1e4023] px-3 py-2 rounded text-base font-semibold text-white text-center border border-[#31572c] mb-1">
            {elapsedTime < 0
              ? `Start za ${Math.ceil(-elapsedTime)}s`
              : `Czas: ${elapsedTime.toFixed(2)}s${
                  restartCountdown != null ? ` (${restartCountdown}s)` : ''
                }`}
          </div>
          {(gameStarted || restartCountdown !== null) &&
            players[myId]?.isOwner && (
              <button
                onClick={() => socket.emit('newGame')}
                className="w-full bg-yellow-500 hover:bg-yellow-600 duration-300 cursor-pointer px-3 py-2 rounded text-white font-semibold text-sm shadow border border-yellow-700 mt-2"
              >
                ♻️ New Game
              </button>
            )}
        </div>
      </div>

      {!gameStarted &&
        (() => {
          const showNewGame = players[myId]?.isOwner;
          const showStart = players[myId]?.isOwner && mazeData?.maze;
          const showReady = !players[myId]?.isReady && mazeData?.maze;
          const shouldShowContainer =
            showNewGame ||
            showStart ||
            showReady ||
            (!players[myId]?.isOwner && !mazeData?.maze);
          if (!shouldShowContainer) return null;
          return (
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40">
              <div className="w-80 bg-[#132a13] rounded-xl shadow-lg border border-[#31572c] flex flex-col items-center gap-2 px-4 py-6 min-h-[120px] justify-center">
                {showNewGame && (
                  <button
                    onClick={() => socket.emit('newGame')}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 duration-300 cursor-pointer px-3 py-2 rounded text-white font-semibold text-sm shadow border border-yellow-700"
                  >
                    ♻️ New Game
                  </button>
                )}
                {showStart && (
                  <button
                    onClick={() => socket.emit('startGameByOwner')}
                    className="w-full bg-blue-600 hover:bg-blue-700 duration-300 cursor-pointer px-4 py-2 rounded text-white font-semibold text-base shadow border border-blue-800"
                  >
                    🕹 Start
                  </button>
                )}
                {showReady && (
                  <button
                    onClick={() => socket.emit('playerReady')}
                    className="w-full bg-green-600 hover:bg-green-700 duration-300 cursor-pointer px-4 py-2 rounded text-white font-semibold text-base shadow border border-green-800"
                  >
                    ✔️ Ready
                  </button>
                )}
                {!players[myId]?.isOwner && !mazeData?.maze && (
                  <span className="text-white text-lg font-semibold text-center opacity-80">
                    Waiting for owner to start the game...
                  </span>
                )}
              </div>
            </div>
          );
        })()}
      {countdown > 0 && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black/70">
          <div className="w-64 h-64 flex items-center justify-center bg-[#1e4023] rounded-2xl shadow-2xl border-4 border-[#31572c] animate-in fade-in zoom-in-50">
            <span className="text-8xl font-extrabold text-green-400 drop-shadow-lg animate-in fade-in zoom-in-50">
              {countdown}
            </span>
          </div>
        </div>
      )}
      {mazeData?.maze && gameStarted ? (
        <div
          className="absolute left-1/2 top-1/2 flex items-center justify-center"
          style={{
            width: '75dvh',
            height: '75dvh',
            transform: 'translate(-50%, -50%)',
            overflow: 'hidden',
            background: '#f8fafc',
            boxShadow: '0 6px 36px #0003',
            border: '3px solid #222',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
            className="z-0"
          />
        </div>
      ) : null}
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
                  {players[id]?.isReady ? '✅' : '❌'}
                  <span className="inline-block w-4 text-center">
                    {isOwner ? '👑' : ''}
                  </span>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color || 'gray' }}
                  ></div>
                  {nick || 'Anonim'}
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
      <div className="absolute left-4 bottom-1/2 translate-y-1/2 space-y-4">
        {Object.keys(players).length > 0 && (
          <Ranking
            players={players}
            scoringType={roomSettings?.scoringType || 'points'}
          />
        )}
        {roomSettings.chatEnabled && (
          <Chat
            socket={socket}
            myId={myId}
            players={players}
            chatEnabled={roomSettings.chatEnabled}
            roomId={roomId}
          />
        )}
      </div>
    </div>
  );
};
