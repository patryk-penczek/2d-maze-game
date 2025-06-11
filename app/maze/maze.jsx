'use client';

import { ReturnButton } from '@/components/ReturnButton';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const useSocket = () => {
  const socketRef = useRef(null);
  if (!socketRef.current) {
    socketRef.current = io(`https://twod-maze-game.onrender.com`);
  }
  return socketRef.current;
};

export const Maze = () => {
  const socket = useSocket();
  const canvasRef = useRef(null);
  const elapsedTimeRef = useRef(0);

  const [mazeData, setMazeData] = useState(null);
  const [players, setPlayers] = useState({});
  const [myId, setMyId] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [countdownNumber, setCountdownNumber] = useState(null);
  const [countdownOpacity, setCountdownOpacity] = useState(0);
  const [shouldShowMaze, setShouldShowMaze] = useState(false);

  const size = 15;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const playerName =
      params.get('name') || `Player${Math.floor(Math.random() * 1000)}`;
    const roomId = params.get('room') || 'default';
    const difficulty = params.get('difficulty') || 'easy';

    socket.emit('joinRoom', { roomId, name: playerName, difficulty });
  }, []);

  useEffect(() => {
    socket.on(
      'init',
      ({ id, players, maze, startX, startY, finishX, finishY }) => {
        setMyId(id);
        setPlayers(players);
        setMazeData({ maze, startX, startY, finishX, finishY });
      }
    );

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

    return () => {
      socket.off('init');
      socket.off('newPlayer');
      socket.off('update');
      socket.off('removePlayer');
    };
  }, []);

  useEffect(() => {
    socket.on('startGame', ({ serverStart }) => {
      setStartTime(serverStart);
      setGameStarted(true);
      setShouldShowMaze(false);
    });

    return () => socket.off('startGame');
  }, []);

  useEffect(() => {
    if (!startTime) return;
    const intervalId = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - startTime) / 1000;
      setElapsedTime(elapsed);
      elapsedTimeRef.current = elapsed;

      if (elapsed < 0) {
        const countdown = Math.ceil(-elapsed);
        if (countdown !== countdownNumber) {
          setCountdownNumber(countdown);
          setCountdownOpacity(1);
          setTimeout(() => {
            setCountdownOpacity(0);
          }, 500);
        }
      } else if (elapsed >= 0 && !shouldShowMaze) {
        setShouldShowMaze(true);
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
  }, [startTime, countdownNumber, shouldShowMaze]);

  useEffect(() => {
    if (!gameStarted || !startTime) return;
    if (Object.values(players).length === 0) return;

    const allFinished = Object.values(players).every(
      (player) => player.finishTime != null
    );

    if (allFinished) {
      socket.emit('getServerTime', ({ now }) => {
        const syncedElapsed = (now - startTime) / 1000;
        setElapsedTime(syncedElapsed);
        elapsedTimeRef.current = syncedElapsed;
        setStartTime(null);
      });
    }
  }, [players, gameStarted, startTime]);

  const handleKeyDown = (e) => {
    if (!mazeData || !myId || !players[myId]) return;
    if (startTime === null) return;
    if (elapsedTimeRef.current < 0) return;

    const { maze, finishX, finishY } = mazeData;
    let { x, y } = players[myId];
    if (e.key === 'ArrowUp' && maze[x - 1]?.[y] !== 1) x--;
    if (e.key === 'ArrowDown' && maze[x + 1]?.[y] !== 1) x++;
    if (e.key === 'ArrowLeft' && maze[x]?.[y - 1] !== 1) y--;
    if (e.key === 'ArrowRight' && maze[x]?.[y + 1] !== 1) y++;
    if (e.key === 'k') {
      x = finishX;
      y = finishY;
    }
    const newPos = { x, y };
    setPlayers((prev) => ({ ...prev, [myId]: { ...prev[myId], ...newPos } }));
    socket.emit('move', newPos);

    if (x === finishX && y === finishY && players[myId]?.finishTime == null) {
      const finishedAt = elapsedTimeRef.current;
      socket.emit('playerFinished', { time: finishedAt });
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [players, myId, mazeData, startTime]);

  useEffect(() => {
    if (!mazeData) return;
    const { maze } = mazeData;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const rows = maze.length;
    const cols = maze[0].length;
    canvas.width = cols * size;
    canvas.height = rows * size;

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
  }, [players, mazeData, gameStarted, elapsedTime]);

  if (!mazeData) return <div className="text-white">Ładowanie gry...</div>;

  return (
    <div className="relative w-dvw h-dvh text-white overflow-hidden">
      <ReturnButton socket={socket} />

      <div className="bg-[#132a13] p-4 rounded-lg shadow-2xl absolute top-10 left-1/2 transform -translate-x-1/2 text-2xl z-50">
        {elapsedTime < 0
          ? `Start za ${Math.ceil(-elapsedTime)}s`
          : `Czas: ${elapsedTime.toFixed(2)}s`}
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
        {!gameStarted && (
          <div className="flex flex-col items-center gap-4 pointer-events-auto">
            {!players[myId]?.isReady && (
              <button
                onClick={() => socket.emit('playerReady')}
                className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded text-white font-semibold"
              >
                ✔️ Ready
              </button>
            )}
            {players[myId]?.isOwner && !gameStarted && (
              <button
                onClick={() => socket.emit('startGameByOwner')}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded text-white font-semibold"
              >
                🕹 Start Game
              </button>
            )}
          </div>
        )}
      </div>

      {countdownNumber && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
          style={{
            opacity: countdownOpacity,
            transition: 'opacity 0.5s ease-in-out',
          }}
        >
          <div className="text-8xl font-bold text-white">{countdownNumber}</div>
        </div>
      )}

      {shouldShowMaze && (
        <canvas
          ref={canvasRef}
          className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white z-0 border-12 border-[#132a13] shadow-xl rounded-md"
        />
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
    </div>
  );
};
