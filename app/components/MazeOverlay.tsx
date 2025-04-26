"use client";

interface MazeOverlayProps {
  countdown: number;
  elapsedTime: number;
  players: { id: string; time: number; gameOver: boolean }[];
}

export const MazeOverlay = ({ countdown, elapsedTime, players }: MazeOverlayProps) => {
  const formatTime = (time: number) =>
    `${Math.floor(time / 60).toString().padStart(2, "0")}:${Math.floor(time % 60).toString().padStart(2, "0")}.${Math.floor((time % 1) * 1000).toString().padStart(3, "0")}`;

  return (
    <>
      <div className="absolute top-16 left-0 right-0 flex justify-center">
        <div className="text-3xl font-semibold tabular-nums text-center">
          {countdown > 0
            ? `Zaczynamy za ${countdown}...`
            : `Czas gry: ${formatTime(elapsedTime)}`}
        </div>
      </div>

      <div className="absolute top-32 right-10 text-white">
        <h3>Blue: {players[0].gameOver ? formatTime(players[0].time) : "-"}</h3>
        <h3>Red: {players[1].gameOver ? formatTime(players[1].time) : "-"}</h3>
      </div>
    </>
  );
};
