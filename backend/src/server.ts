import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { logger } from './utils/logger';
import { errorHandler } from './api/middleware/errorHandler';
import { rateLimiter } from './api/middleware/rateLimiter';
import stationsRouter from './api/routes/stations';
import songsRouter from './api/routes/songs';
import playsRouter from './api/routes/plays';
import analyticsRouter from './api/routes/analytics';
import { setupSocketHandlers } from './socket/socketHandler';

// Fix BigInt serialization in JSON
(BigInt.prototype as any).toJSON = function() {
  return this.toString();
};

const app = express();
const server = createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Rate limiting
app.use('/api/', rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/stations', stationsRouter);
app.use('/api/songs', songsRouter);
app.use('/api/plays', playsRouter);
app.use('/api/analytics', analyticsRouter);

// Socket.io handlers
setupSocketHandlers(io);

// Error handler (must be last)
app.use(errorHandler);

export { app, server, io };
