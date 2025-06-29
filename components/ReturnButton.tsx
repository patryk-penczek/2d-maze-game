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
    if (!open) {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setOpen(true);
      };
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
    continueRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && document.activeElement === continueRef.current)
        handleLeave();
      if (e.key === 'Escape') setOpen(false);
    };
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node))
        setOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                <br />
                Do you want to continue?
              </div>
            </div>
            <div className="flex gap-x-2">
              <Button
                ref={continueRef}
                onClick={handleLeave}
                className="font-medium"
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
