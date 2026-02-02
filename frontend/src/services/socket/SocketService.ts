import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../../config/env';

type EventCallback = (...args: any[]) => void;

class SocketService {
  private socket: Socket | null = null;
  private eventCallbacks: Map<string, EventCallback[]> = new Map();

  // Connect to socket server
  connect(): void {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Re-register all event listeners after reconnection
    this.socket.on('connect', () => {
      this.eventCallbacks.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          this.socket?.on(event, callback);
        });
      });
    });
  }

  // Disconnect from socket server
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.eventCallbacks.clear();
    }
  }

  // Subscribe to a specific room for real-time updates
  subscribeToRoom(roomId: string): void {
    if (!this.socket?.connected) {
      console.warn('Socket not connected. Call connect() first.');
      return;
    }
    this.socket.emit('subscribe:room', roomId);
    console.log('Subscribed to room:', roomId);
  }

  // Unsubscribe from a room
  unsubscribeFromRoom(roomId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('unsubscribe:room', roomId);
    console.log('Unsubscribed from room:', roomId);
  }

  // Listen to an event
  on(event: string, callback: EventCallback): void {
    if (!this.socket) {
      console.warn('Socket not initialized. Call connect() first.');
      return;
    }

    // Store callback for re-registration after reconnection
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);

    this.socket.on(event, callback);
  }

  // Remove event listener
  off(event: string, callback?: EventCallback): void {
    if (!this.socket) return;

    if (callback) {
      this.socket.off(event, callback);
      // Remove from stored callbacks
      const callbacks = this.eventCallbacks.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    } else {
      this.socket.off(event);
      this.eventCallbacks.delete(event);
    }
  }

  // Emit an event
  emit(event: string, ...args: any[]): void {
    if (!this.socket?.connected) {
      console.warn('Socket not connected. Cannot emit event:', event);
      return;
    }
    this.socket.emit(event, ...args);
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export default new SocketService();
