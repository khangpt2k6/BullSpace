require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');

const app = express();
const server = http.createServer(app);

// cors 
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3003;

// redis pub/sub client
const redisSubscriber = new Redis(process.env.REDIS_URL, {
  tls: { rejectUnauthorized: false }
});

console.log('🔄 Starting Notification Service...');

let connectedClients = 0;

// webscket connection handler
io.on('connection', (socket) => {
  connectedClients++;
  console.log(`✅ Client connected: ${socket.id} (Total: ${connectedClients})`);

  socket.emit('connected', {
    message: 'Connected to BullRoom real-time updates',
    socketId: socket.id
  });

  // client want to subscribe to a room
  socket.on('subscribe:room', (roomId) => {
    socket.join(`room:${roomId}`);
    console.log(`📍 Client ${socket.id} subscribed to room ${roomId}`);

    socket.emit('subscribed', {
      roomId,
      message: `Subscribed to updates for room ${roomId}`
    });
  });

  // unsubscribe from a room
  socket.on('unsubscribe:room', (roomId) => {
    socket.leave(`room:${roomId}`);
    console.log(`📍 Client ${socket.id} unsubscribed from room ${roomId}`);
  });

  // handle disconnection
  socket.on('disconnect', () => {
    connectedClients--;
    console.log(`❌ Client disconnected: ${socket.id} (Total: ${connectedClients})`);
  });
});

redisSubscriber.subscribe('room:updates', (err, count) => {
  if (err) {
    console.error('❌ Failed to subscribe to Redis channel:', err.message);
    return;
  }
  console.log(`✅ Subscribed to ${count} Redis channel(s)`);
});

// handle Redis Pub/Sub messages
redisSubscriber.on('message', (channel, message) => {
  try {
    const data = JSON.parse(message);
    console.log(`📨 Received update:`, data);

    const { roomId, timeSlot, status, userId } = data;

    // broadcast to all clients interested in this room
    io.to(`room:${roomId}`).emit('room:status', {
      roomId,
      timeSlot,
      status,
      userId,
      timestamp: new Date().toISOString()
    });

    // also broadcast to all connected client
    io.emit('room:update', {
      roomId,
      timeSlot,
      status,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Broadcasted update for room ${roomId} to ${connectedClients} client(s)`);
  } catch (error) {
    console.error('❌ Error processing Redis message:', error.message);
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    connectedClients,
    timestamp: new Date().toISOString()
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Notification Service running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket ready for connections`);
});

process.on('SIGINT', async () => {
  console.log('\n⏳ Shutting down Notification Service...');

  io.close(() => {
    console.log('✅ All WebSocket connections closed');
  });

  await redisSubscriber.quit();
  console.log('✅ Redis subscriber closed');

  process.exit(0);
});
