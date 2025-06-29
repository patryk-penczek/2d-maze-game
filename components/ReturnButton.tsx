'use client';

import { Button } from '@/components/ui/button';
import { DoorOpenIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io';

type ReturnButtonProps = {
  socket?: Socket;
};

export const ReturnButton = ({ socket }: ReturnButtonProps) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const continueRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleLeave = () => {
    if (socket) {
      socket.emit('leaveRoom');
      socket.disconnect();
    }
    router.push('/');
  };

  useEffect(() => {
    if (open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open && continueRef.current) {
      continueRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && continueRef.current === document.activeElement) {
        handleLeave();
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <>
      <Button
        variant="destructive"
        className="absolute right-70 top-4 z-10 font-medium cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <DoorOpenIcon className="size-4.5" />
        Leave
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" />
          <div
            ref={modalRef}
            className="relative z-10 bg-white text-black rounded-lg shadow-2xl p-6 min-w-md flex flex-col gap-4 items-center justify-center"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex flex-col gap-y-2 items-center justify-center text-center">
              <div className="text-xl font-semibold">Leave the game?</div>
              <div className="text-muted-foreground text-sm">
                You will have to start over if you return.
                <br /> Do you want to continue?
              </div>
            </div>
            <div className="flex gap-x-2">
              <Button
                ref={continueRef}
                onClick={handleLeave}
                className="font-medium"
                autoFocus
              >
                Continue
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
