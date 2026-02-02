import 'dotenv/config';
import express, { Express, Request, Response } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import { RoomUpdateEvent } from '../shared/types';

const app: Express = express();
const server = http.createServer(app);

// Configure Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3003;

// Redis Pub/Sub clients (need separate connections for pub/sub)
const redisSubscriber = new Redis(process.env.REDIS_URL as string, {
  tls: { rejectUnauthorized: false }
});

console.log('🔄 Starting Notification Service...');

// Track connected clients
let connectedClients = 0;

// Socket.io connection handler
io.on('connection', (socket: Socket) => {
  connectedClients++;
  console.log(`✅ Client connected: ${socket.id} (Total: ${connectedClients})`);

  // Send welcome message
  socket.emit('connected', {
    message: 'Connected to BullRoom real-time updates',
    socketId: socket.id
  });

  // Client wants to subscribe to a specific room's updates
  socket.on('subscribe:room', (roomId: string) => {
    socket.join(`room:${roomId}`);
    console.log(`📍 Client ${socket.id} subscribed to room ${roomId}`);

    socket.emit('subscribed', {
      roomId,
      message: `Subscribed to updates for room ${roomId}`
    });
  });

  // Client wants to unsubscribe from a room
  socket.on('unsubscribe:room', (roomId: string) => {
    socket.leave(`room:${roomId}`);
    console.log(`📍 Client ${socket.id} unsubscribed from room ${roomId}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    connectedClients--;
    console.log(`❌ Client disconnected: ${socket.id} (Total: ${connectedClients})`);
  });
});

// Subscribe to Redis Pub/Sub channel for room updates
redisSubscriber.subscribe('room:updates', (err: Error | null, count: number) => {
  if (err) {
    console.error('❌ Failed to subscribe to Redis channel:', err.message);
    return;
  }
  console.log(`✅ Subscribed to ${count} Redis channel(s)`);
});

// Handle Redis Pub/Sub messages
redisSubscriber.on('message', (channel: string, message: string) => {
  try {
    const data: RoomUpdateEvent = JSON.parse(message);
    console.log(`📨 Received update:`, data);

    const { roomId, timeSlot, status, userId } = data;

    // Broadcast to all clients interested in this room
    io.to(`room:${roomId}`).emit('room:status', {
      roomId,
      timeSlot,
      status,
      userId,
      timestamp: new Date().toISOString()
    });

    // Also broadcast to all connected clients (for room list updates)
    io.emit('room:update', {
      roomId,
      timeSlot,
      status,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Broadcasted update for room ${roomId} to ${connectedClients} client(s)`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error processing Redis message:', errorMessage);
  }
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    connectedClients,
    timestamp: new Date().toISOString()
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Notification Service running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket ready for connections`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏳ Shutting down Notification Service...');

  io.close(() => {
    console.log('✅ All WebSocket connections closed');
  });

  await redisSubscriber.quit();
  console.log('✅ Redis subscriber closed');

  process.exit(0);
});
