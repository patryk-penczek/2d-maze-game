"use client";

import Head from "next/head";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    "easy"
  );
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const room = roomId.trim() || crypto.randomUUID().slice(0, 8);
    const params = new URLSearchParams({ name, room, difficulty });
    router.push(`/maze?${params.toString()}`);
  };

  return (
    <>
      <div className="relative flex items-center justify-center w-dvw h-dvh">
        <Head>
          <title>2D Maze Game</title>
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <div className="bg-[#faf9f6] shadow-2xl border-1 border-black p-10 rounded-lg max-w-md w-full flex flex-col gap-y-8 z-10">
          <h1 className="text-5xl font-bold text-center">2D Maze Game</h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-y-4">
            <div className="flex items-center gap-x-4">
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-black bg-white"
              />
              <select
                value={difficulty}
                onChange={e =>
                  setDifficulty(e.target.value as "easy" | "medium" | "hard")
                }
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-black bg-white"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="Enter Room ID (optional)"
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-black bg-white"
            />

            <button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-md transition duration-300"
            >
              Play
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
