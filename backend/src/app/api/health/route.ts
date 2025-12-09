import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { wsManager } from '@/lib/websocket-manager';

const startTime = Date.now();

export async function GET() {
  try {
    // Check database connection
    await query('SELECT 1');

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      connections: {
        sse: wsManager.getClientCount(),
      },
      environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    }, { status: 503 });
  }
}
