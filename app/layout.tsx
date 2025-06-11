import { Background } from "@/components/Background";
import { Instruction } from "@/components/Instruction";
import { Settings } from "@/components/Settings";
import { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "2D Maze Game",
  description: "A 2D maze game"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-black">
        <Background />
        <Instruction />
        <Settings />
        <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
      </body>
    </html>
  );
}
