import { NextResponse } from 'next/server';
import { getRetryQueueStats } from '@/lib/retry-queue';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const stats = await getRetryQueueStats();
    return NextResponse.json({ success: true, data: stats });
  } catch (error: any) {
    logger.error('API_RETRY_STATS', 'Failed to get stats', { error: error.message });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
