"use client";

import React from "react";

interface PlayerData {
  nick: string;
  color: string;
  finishTime: number | null;
  points?: number;
  medals?: {
    gold: number;
    silver: number;
    bronze: number;
  };
}

interface RankingProps {
  players: Record<string, PlayerData>;
  scoringType: "points" | "placements";
}

export const Ranking: React.FC<RankingProps> = ({ players, scoringType }) => {
  const sortedPlayers = Object.entries(players).sort(([, a], [, b]) => {
    if (scoringType === "points") {
      return (b.points ?? 0) - (a.points ?? 0);
    }

    if (scoringType === "placements") {
      const ma = a.medals || { gold: 0, silver: 0, bronze: 0 };
      const mb = b.medals || { gold: 0, silver: 0, bronze: 0 };
      if (mb.gold !== ma.gold) return mb.gold - ma.gold;
      if (mb.silver !== ma.silver) return mb.silver - ma.silver;
      return mb.bronze - ma.bronze;
    }

    return 0;
  });

  const medal = (index: number) =>
    index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";

  return (
    <div className="absolute top-4 left-4 bg-white bg-opacity-90 rounded p-3 shadow-lg text-black z-50 w-72">
      <h3 className="text-lg font-bold mb-2">🏆 Ranking</h3>
      <ol className="space-y-1">
        {sortedPlayers.map(([id, player], index) => (
          <li key={id} className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-5">{medal(index)}</span>
              <span className="w-4 text-right">{index + 1}.</span>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: player.color }}
              ></div>
              <span>{player.nick}</span>
            </div>
            <span className="text-sm text-gray-700 text-right">
              {scoringType === "points" && `${player.points ?? 0} pts`}
              {scoringType === "placements" && (
                <span>
                  🥇 {player.medals?.gold ?? 0}{" "}
                  🥈 {player.medals?.silver ?? 0}{" "}
                  🥉 {player.medals?.bronze ?? 0}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
};
