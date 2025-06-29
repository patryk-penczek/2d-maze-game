"use client";

import { ReturnButton } from "@/components/ReturnButton";
import { useSearchParams } from "next/navigation";
import { Maze } from "./maze";


export default function Mazepage() {
  const searchParams = useSearchParams(); 
  const difficulty = searchParams.get("difficulty");

  console.log(difficulty);

  return (
    <main>
      <ReturnButton />
      <Maze />
    </main>
  );
}
