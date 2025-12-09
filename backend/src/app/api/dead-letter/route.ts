export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDeadLetterQueue } from '@/lib/retry-queue';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const items = await getDeadLetterQueue(limit, offset);

    return NextResponse.json({
      success: true,
      data: { items },
    });
  } catch (error: any) {
    logger.error('API_DEAD_LETTER', 'Failed to fetch dead letter queue', { error: error.message });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
