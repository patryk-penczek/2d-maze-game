'use client';
import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io';

interface ChatProps {
  socket: Socket;
  myId: string;
  players: Record<string, { nick: string }>;
  chatEnabled: boolean;
  roomId: string;
}

export const Chat = ({
  socket,
  myId,
  players,
  chatEnabled,
  roomId,
}: ChatProps) => {
  const [messages, setMessages] = useState<{ nick: string; message: string }[]>(
    []
  );
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg: { nick: string; message: string }) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.off('chatMessage', handleMessage);
    socket.on('chatMessage', handleMessage);
    console.log('📡 Zarejestrowano chatMessage');

    return () => {
      socket.off('chatMessage', handleMessage);
      console.log('🧹 Odlaczono chatMessage');
    };
  }, [socket]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const nick = players[myId]?.nick || 'Anonim';
    const msg = {
      roomId: roomId,
      nick,
      message: input.trim(),
    };

    socket.emit('chatMessage', msg);
    setInput('');
  };

  if (!chatEnabled) return null;

  return (
    <div className="p-4 bg-white/95 text-black border-2 border-black rounded-md shadow-md w-80 max-h-80 flex flex-col z-50">
      <div className="p-2 min-h-64 overflow-y-auto flex-1">
        {messages.map((msg, i) => (
          <div key={`${msg.nick}-${i}`}>
            <strong>{msg.nick}:</strong> {msg.message}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex border-t border-black">
        <input
          className="flex-1 px-2 py-1 bg-white border border-black outline-none rounded-bl-md"
          placeholder="Napisz wiadomość..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="px-3 text-sm bg-green-600 text-white rounded-br-md hover:bg-green-700 duration-300 cursor-pointer"
        >
          Wyślij
        </button>
      </div>
    </div>
  );
};
