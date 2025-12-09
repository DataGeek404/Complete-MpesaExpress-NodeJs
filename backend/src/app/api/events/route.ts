import { NextRequest } from 'next/server';
import { wsManager } from '@/lib/websocket-manager';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  logger.info('SSE', 'New SSE connection request', { clientId });

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const connectMsg = `data: ${JSON.stringify({ 
        type: 'connected', 
        clientId,
        timestamp: new Date().toISOString() 
      })}\n\n`;
      controller.enqueue(encoder.encode(connectMsg));

      // Function to send messages to this client
      const sendMessage = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch (error) {
          logger.error('SSE', 'Failed to send message', { clientId, error });
        }
      };

      // Register the client
      wsManager.registerClient(clientId, sendMessage);

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          const ping = `data: ${JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() })}\n\n`;
          controller.enqueue(encoder.encode(ping));
          wsManager.updateClientPing(clientId);
        } catch (error) {
          clearInterval(heartbeat);
          wsManager.removeClient(clientId);
        }
      }, 30000);

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        wsManager.removeClient(clientId);
        logger.info('SSE', 'Client disconnected', { clientId });
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
