import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Join a station room
    socket.on('join', (room: string) => {
      socket.join(room);
      logger.debug(`Client ${socket.id} joined room: ${room}`);
    });

    // Leave a station room
    socket.on('leave', (room: string) => {
      socket.leave(room);
      logger.debug(`Client ${socket.id} left room: ${room}`);
    });

    // Disconnect
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  logger.info('Socket.io handlers configured');
}
