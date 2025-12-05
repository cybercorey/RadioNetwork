import { useEffect, useState } from 'react';
import { getSocket } from '@/services/socket';
import { Socket } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketInstance = getSocket();
    setSocket(socketInstance);

    return () => {
      // Don't disconnect on unmount as we want to keep connection alive
    };
  }, []);

  return socket;
}
