'use client';

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { SettingsIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io';
import { Button } from './ui/button';

interface SettingsProps {
  socket: Socket | null;
  isOwner: boolean;
  playerColor?: string;
}

export function Settings({
  socket,
  isOwner,
  playerColor: initialColor,
}: SettingsProps) {
  const [difficulty, setDifficulty] = useState('easy');
  const [restartDelay, setRestartDelay] = useState(15);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [maxRoundTime, setMaxRoundTime] = useState(120);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [autoRestart, setAutoRestart] = useState(true);
  const [scoringType, setScoringType] = useState('points');
  const [autoStartThreshold, setAutoStartThreshold] = useState('75%');
  const [finishThreshold, setFinishThreshold] = useState('100%');
  const [movement, setMovement] = useState('arrows');
  const [playerColor, setPlayerColor] = useState(initialColor || '');
  const [points1, setPoints1] = useState(10);
  const [points2, setPoints2] = useState(7);
  const [points3, setPoints3] = useState(5);
  const [lobbyOpen, setLobbyOpen] = useState(isOwner);
  const [vanishingWalls, setVanishingWalls] = useState(true);
  const [holesPerInterval, setHolesPerInterval] = useState(3);
  const [holesInterval, setHolesInterval] = useState(5);

  useEffect(() => {
    if (!socket) return;

    interface Settings {
      difficulty?: string;
      restartDelay?: number;
      maxPlayers?: number;
      maxRoundTime?: number;
      chatEnabled?: boolean;
      autoRestart?: boolean;
      scoringType?: string;
      autoStartThreshold?: string | number;
      finishThreshold?: string | number;
      points1?: number;
      points2?: number;
      points3?: number;
      vanishingWalls?: boolean;
      holesPerInterval?: number;
      holesInterval?: number;
    }

    socket.on('settingsUpdated', (settings: Settings) => {
      if (settings.difficulty) setDifficulty(settings.difficulty);
      if (settings.restartDelay != null) setRestartDelay(settings.restartDelay);
      if (settings.maxPlayers != null) setMaxPlayers(settings.maxPlayers);
      if (settings.maxRoundTime != null) setMaxRoundTime(settings.maxRoundTime);
      if (settings.chatEnabled != null) setChatEnabled(settings.chatEnabled);
      if (settings.autoRestart != null) setAutoRestart(settings.autoRestart);
      if (settings.scoringType) setScoringType(settings.scoringType);
      if (settings.points1 != null) setPoints1(settings.points1);
      if (settings.points2 != null) setPoints2(settings.points2);
      if (settings.points3 != null) setPoints3(settings.points3);
      if (settings.vanishingWalls != null)
        setVanishingWalls(settings.vanishingWalls);
      if (settings.holesPerInterval != null)
        setHolesPerInterval(settings.holesPerInterval);
      if (settings.holesInterval != null)
        setHolesInterval(settings.holesInterval);
      if (settings.autoStartThreshold != null)
        setAutoStartThreshold(String(settings.autoStartThreshold));
      if (settings.finishThreshold != null)
        setFinishThreshold(String(settings.finishThreshold));
    });

    const handleMovementUpdated = (movement: string) => {
      setMovement(movement);
    };

    socket.on('movementUpdated', handleMovementUpdated);

    return () => {
      socket.off('settingsUpdated', (settings: Settings) => {
        if (settings.difficulty) setDifficulty(settings.difficulty);
        if (settings.restartDelay != null)
          setRestartDelay(settings.restartDelay);
        if (settings.maxPlayers != null) setMaxPlayers(settings.maxPlayers);
        if (settings.maxRoundTime != null)
          setMaxRoundTime(settings.maxRoundTime);
        if (settings.chatEnabled != null) setChatEnabled(settings.chatEnabled);
        if (settings.autoRestart != null) setAutoRestart(settings.autoRestart);
        if (settings.scoringType) setScoringType(settings.scoringType);
        if (settings.autoStartThreshold != null)
          setAutoStartThreshold(String(settings.autoStartThreshold));
        if (settings.finishThreshold != null)
          setFinishThreshold(String(settings.finishThreshold));
      });
      socket.off('movementUpdated', handleMovementUpdated);
    };
  }, [socket]);

  const handleSave = () => {
    if (!socket) return;

    if (isOwner) {
      socket.emit('changeSettings', {
        difficulty,
        restartDelay,
        maxPlayers,
        maxRoundTime,
        chatEnabled,
        autoRestart,
        scoringType,
        points1,
        points2,
        points3,
        autoStartThreshold,
        finishThreshold,
        vanishingWalls,
        holesPerInterval,
        holesInterval,
      });
    }

    if (playerColor) {
      socket.emit('changeColor', playerColor);
    }

    socket.emit('changeMovement', movement);
  };

  const autoStartOptions = [1, 2, 3, 4, 5, '10%', '50%', '75%', '90%', '100%'];
  const finishThresholdOptions = [1, 2, 3, '10%', '50%'];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="fixed right-40 top-4 z-10 text-black font-medium cursor-pointer"
        >
          <SettingsIcon className="size-4.5" />
          Settings
        </Button>
      </SheetTrigger>
      <SheetContent className="bg-foreground/95 p-4 text-white border-black overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white">Settings</SheetTitle>
          <SheetDescription className="text-white/80">
            View lobby settings and adjust your preferences.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-2 mt-4">
              Your Preferences
            </h3>
            <div>
              <label className="text-sm block mb-2 font-medium">
                Movement Keys
              </label>
              <select
                value={movement}
                onChange={(e) => setMovement(e.target.value)}
                className="w-full p-2 rounded bg-white text-black border border-gray-400"
              >
                <option value="arrows">Arrow Keys</option>
                <option value="wasd">WASD</option>
              </select>
            </div>
            <div>
              <label className="text-sm block mb-2 font-medium">
                Player Color
              </label>
              <input
                type="color"
                value={playerColor}
                onChange={(e) => setPlayerColor(e.target.value)}
                className="w-full h-10 p-1 border rounded bg-white"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg mb-2">Lobby Settings</h3>
              {!isOwner && (
                <button
                  type="button"
                  onClick={() => setLobbyOpen((open) => !open)}
                  className="text-sm underline text-white/80 hover:text-white focus:outline-none"
                  aria-expanded={lobbyOpen}
                  aria-controls="lobby-settings-section"
                >
                  {lobbyOpen ? 'Hide' : 'Show'}
                </button>
              )}
            </div>
            {(isOwner || lobbyOpen) && (
              <div
                id="lobby-settings-section"
                className="space-y-4 transition-all duration-300"
              >
                <label className="text-sm block mb-2 font-medium">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  disabled={!isOwner}
                  className="w-full p-2 rounded bg-white text-black border border-gray-400 disabled:opacity-50"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="extreme">Extreme</option>
                </select>

                <div>
                  <label className="text-sm block mb-2 font-medium">
                    Restart delay (sec)
                  </label>
                  <input
                    type="number"
                    value={restartDelay}
                    min={5}
                    max={60}
                    onChange={(e) => setRestartDelay(Number(e.target.value))}
                    disabled={!isOwner}
                    className="w-full p-2 rounded bg-white text-black border border-gray-400 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="text-sm block mb-2 font-medium">
                    Max Players
                  </label>
                  <input
                    type="number"
                    value={maxPlayers}
                    min={2}
                    max={32}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    disabled={!isOwner}
                    className="w-full p-2 rounded bg-white text-black border border-gray-400 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="text-sm block mb-2 font-medium">
                    Max Round Time (sec)
                  </label>
                  <input
                    type="number"
                    value={maxRoundTime}
                    min={10}
                    max={600}
                    onChange={(e) => setMaxRoundTime(Number(e.target.value))}
                    disabled={!isOwner}
                    className="w-full p-2 rounded bg-white text-black border border-gray-400 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="text-sm block mb-2 font-medium">
                    Scoring System
                  </label>
                  <select
                    value={scoringType}
                    onChange={(e) => setScoringType(e.target.value)}
                    disabled={!isOwner}
                    className="w-full p-2 rounded bg-white text-black border border-gray-400 disabled:opacity-50"
                  >
                    <option value="points">Points</option>
                    <option value="placements">Placements</option>
                  </select>
                </div>
                {scoringType === 'points' && (
                  <>
                    <div>
                      <label className="text-sm block mb-2 font-medium">
                        Points for 1st place
                      </label>
                      <input
                        type="number"
                        value={points1}
                        onChange={(e) => setPoints1(Number(e.target.value))}
                        disabled={!isOwner}
                        className="w-full p-2 rounded bg-white text-black border border-gray-400 disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="text-sm block mb-2 font-medium">
                        Points for 2nd place
                      </label>
                      <input
                        type="number"
                        value={points2}
                        onChange={(e) => setPoints2(Number(e.target.value))}
                        disabled={!isOwner}
                        className="w-full p-2 rounded bg-white text-black border border-gray-400 disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="text-sm block mb-2 font-medium">
                        Points for 3rd place
                      </label>
                      <input
                        type="number"
                        value={points3}
                        onChange={(e) => setPoints3(Number(e.target.value))}
                        disabled={!isOwner}
                        className="w-full p-2 rounded bg-white text-black border border-gray-400 disabled:opacity-50"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="text-sm block mb-2 font-medium">
                    Auto-start Threshold
                  </label>
                  <select
                    value={autoStartThreshold}
                    onChange={(e) => setAutoStartThreshold(e.target.value)}
                    disabled={!isOwner}
                    className="w-full p-2 rounded bg-white text-black border border-gray-400 disabled:opacity-50"
                  >
                    {autoStartOptions.map((option) => (
                      <option key={option} value={option}>
                        {typeof option === 'string'
                          ? option
                          : `${option} players`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm block mb-2 font-medium">
                    Finish Threshold
                  </label>
                  <select
                    value={finishThreshold}
                    onChange={(e) => setFinishThreshold(e.target.value)}
                    disabled={!isOwner}
                    className="w-full p-2 rounded bg-white text-black border border-gray-400 disabled:opacity-50"
                  >
                    {finishThresholdOptions.map((option) => (
                      <option key={option} value={option}>
                        {typeof option === 'string'
                          ? option
                          : `${option} player${option > 1 ? 's' : ''}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoRestart}
                    onChange={(e) => setAutoRestart(e.target.checked)}
                    disabled={!isOwner}
                  />
                  <label className="text-sm font-medium">Auto-Restart</label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={chatEnabled}
                    onChange={(e) => setChatEnabled(e.target.checked)}
                    disabled={!isOwner}
                  />
                  <label className="text-sm font-medium">Enable Chat</label>
                </div>

                <div className="border-t border-white/20 pt-4 mt-4">
                  <h4 className="font-semibold text-base mb-3">
                    Vanishing Walls
                  </h4>

                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      checked={vanishingWalls}
                      onChange={(e) => setVanishingWalls(e.target.checked)}
                      disabled={!isOwner}
                    />
                    <label className="text-sm font-medium">
                      Enable Vanishing Walls
                    </label>
                  </div>

                  {vanishingWalls && (
                    <>
                      <div className="mb-3">
                        <label className="text-sm block mb-2 font-medium">
                          Holes per interval
                        </label>
                        <input
                          type="number"
                          value={holesPerInterval}
                          min={1}
                          max={20}
                          onChange={(e) =>
                            setHolesPerInterval(Number(e.target.value))
                          }
                          disabled={!isOwner}
                          className="w-full p-2 rounded bg-white text-black border border-gray-400 disabled:opacity-50"
                        />
                      </div>

                      <div className="mb-3">
                        <label className="text-sm block mb-2 font-medium">
                          Interval (seconds)
                        </label>
                        <input
                          type="number"
                          value={holesInterval}
                          min={1}
                          max={60}
                          onChange={(e) =>
                            setHolesInterval(Number(e.target.value))
                          }
                          disabled={!isOwner}
                          className="w-full p-2 rounded bg-white text-black border border-gray-400 disabled:opacity-50"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button
              onClick={handleSave}
              variant="outline"
              className="text-black my-2 cursor-pointer w-full"
            >
              Save changes
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
