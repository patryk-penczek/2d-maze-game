"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DoorOpenIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Socket } from "socket.io";

type ReturnButtonProps = {
  socket?: Socket;
};

export const ReturnButton = ({ socket }: ReturnButtonProps) => {
  const router = useRouter();

  const handleLeave = () => {
    if (socket) {
      socket.emit("leaveRoom");
      socket.disconnect();
    }
    router.push("/");
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          className="absolute left-4 top-4 z-10 font-medium cursor-pointer"
        >
          <DoorOpenIcon className="size-4.5" />
          Leave
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave the game?</AlertDialogTitle>
          <AlertDialogDescription>
            You will have to start over if you return. Do you want to continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={handleLeave} className="font-medium">
              Continue
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const ReturnButtonSP = () => {
  const router = useRouter();

  const handleLeave = () => {
    router.push("/");
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          className="absolute left-4 top-4 z-10 font-medium cursor-pointer"
        >
          <DoorOpenIcon className="size-4.5" />
          Leave
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave the game?</AlertDialogTitle>
          <AlertDialogDescription>
            You will have to start over if you return. Do you want to continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={handleLeave} className="font-medium">
              Continue
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
