import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { InfoIcon } from 'lucide-react';
import { Button } from './ui/button';

export const Instruction = () => {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          className="fixed right-4 top-4 z-10 font-medium cursor-pointer gap-2 px-3 py-2"
        >
          <InfoIcon className="size-4.5" />
          Instructions
        </Button>
      </DrawerTrigger>
      <DrawerContent className="bg-foreground/95 text-white border-black">
        <DrawerTitle className="sr-only">Game Instructions</DrawerTitle>
        <div className="grid grid-cols-2 items-center mx-auto pt-6 pb-12">
          <section>
            <p className="text-xl font-semibold mb-2">How to Play</p>
            <ol className="list-decimal pl-4 space-y-2 text-white/80">
              <li>Enter your nickname.</li>
              <li>Select a difficulty level.</li>
              <li>
                Choose one of the following:
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>
                    <span className="font-medium">Play</span> — play locally
                    with a friend or solo.
                  </li>
                  <li>
                    <span className="font-medium">Create Private Room</span> —
                    invite a friend and play online.
                  </li>
                </ul>
              </li>
              <li>
                Start the game and try to escape the maze as quickly as possible
                from the center!
              </li>
            </ol>
          </section>
          <section className="mx-auto">
            <p className="text-xl font-semibold mb-1">Controls</p>
            <ul className="list-none pl-0.5 space-y-1 text-white/80">
              <li>
                <span className="font-medium">Player 1:</span> W A S D
              </li>
              <li>
                <span className="font-medium">Player 2:</span> ← ↑ ↓ →
              </li>
            </ul>
          </section>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
