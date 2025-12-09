import { EventEmitter } from 'events';
import { logger } from './logger';

// Event types for real-time notifications
export type WebSocketEventType = 
  | 'transaction:created'
  | 'transaction:updated'
  | 'transaction:completed'
  | 'transaction:failed'
  | 'callback:received'
  | 'log:created'
  | 'retry:queued'
  | 'retry:completed'
  | 'retry:failed';

export interface WebSocketEvent {
  type: WebSocketEventType;
  payload: any;
  timestamp: string;
}

// Simple pub/sub for server-sent events
class WebSocketManager extends EventEmitter {
  private clients: Map<string, {
    id: string;
    send: (data: string) => void;
    lastPing: number;
  }> = new Map();

  constructor() {
    super();
    this.setMaxListeners(100);
    
    // Heartbeat to clean up stale connections
    setInterval(() => this.cleanupStaleConnections(), 30000);
  }

  // Register a new client
  registerClient(id: string, send: (data: string) => void): void {
    this.clients.set(id, { id, send, lastPing: Date.now() });
    logger.info('WEBSOCKET', 'Client connected', { clientId: id, totalClients: this.clients.size });
  }

  // Remove a client
  removeClient(id: string): void {
    this.clients.delete(id);
    logger.info('WEBSOCKET', 'Client disconnected', { clientId: id, totalClients: this.clients.size });
  }

  // Broadcast event to all connected clients
  broadcast(event: WebSocketEvent): void {
    const message = JSON.stringify(event);
    
    for (const [id, client] of this.clients) {
      try {
        client.send(message);
      } catch (error) {
        logger.error('WEBSOCKET', 'Failed to send to client', { clientId: id, error });
        this.clients.delete(id);
      }
    }

    logger.debug('WEBSOCKET', 'Event broadcast', { 
      type: event.type, 
      clientCount: this.clients.size 
    });
  }

  // Update client ping
  updateClientPing(id: string): void {
    const client = this.clients.get(id);
    if (client) {
      client.lastPing = Date.now();
    }
  }

  // Clean up stale connections (no ping in 60 seconds)
  private cleanupStaleConnections(): void {
    const now = Date.now();
    const staleTimeout = 60000;

    for (const [id, client] of this.clients) {
      if (now - client.lastPing > staleTimeout) {
        this.clients.delete(id);
        logger.info('WEBSOCKET', 'Removed stale client', { clientId: id });
      }
    }
  }

  // Get client count
  getClientCount(): number {
    return this.clients.size;
  }
}

// Singleton instance
export const wsManager = new WebSocketManager();

// Helper functions to emit events
export function emitTransactionCreated(transaction: any): void {
  wsManager.broadcast({
    type: 'transaction:created',
    payload: transaction,
    timestamp: new Date().toISOString(),
  });
}

export function emitTransactionUpdated(transaction: any): void {
  wsManager.broadcast({
    type: 'transaction:updated',
    payload: transaction,
    timestamp: new Date().toISOString(),
  });
}

export function emitTransactionCompleted(transaction: any): void {
  wsManager.broadcast({
    type: 'transaction:completed',
    payload: transaction,
    timestamp: new Date().toISOString(),
  });
}

export function emitTransactionFailed(transaction: any): void {
  wsManager.broadcast({
    type: 'transaction:failed',
    payload: transaction,
    timestamp: new Date().toISOString(),
  });
}

export function emitCallbackReceived(callbackType: string, data: any): void {
  wsManager.broadcast({
    type: 'callback:received',
    payload: { callbackType, data },
    timestamp: new Date().toISOString(),
  });
}

export function emitLogCreated(log: any): void {
  wsManager.broadcast({
    type: 'log:created',
    payload: log,
    timestamp: new Date().toISOString(),
  });
}

export function emitRetryQueued(job: any): void {
  wsManager.broadcast({
    type: 'retry:queued',
    payload: job,
    timestamp: new Date().toISOString(),
  });
}

export function emitRetryCompleted(job: any): void {
  wsManager.broadcast({
    type: 'retry:completed',
    payload: job,
    timestamp: new Date().toISOString(),
  });
}

export function emitRetryFailed(job: any): void {
  wsManager.broadcast({
    type: 'retry:failed',
    payload: job,
    timestamp: new Date().toISOString(),
  });
}
