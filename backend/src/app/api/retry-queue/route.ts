import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getRetryQueueStats, processRetryQueue } from '@/lib/retry-queue';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');

    const offset = (page - 1) * limit;

    let whereClause = '';
    const params: any[] = [];

    if (status && status !== 'all') {
      whereClause = 'WHERE status = ?';
      params.push(status);
    }

    const countResult = await query<any[]>(
      `SELECT COUNT(*) as total FROM retry_queue ${whereClause}`,
      params
    );
    const total = countResult[0]?.total || 0;

    const jobs = await query<any[]>(
      `SELECT * FROM retry_queue ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    logger.error('API_RETRY_QUEUE', 'Failed to fetch retry queue', { error: error.message });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Manually trigger queue processing
export async function POST(request: NextRequest) {
  try {
    await processRetryQueue();
    return NextResponse.json({ success: true, message: 'Queue processing triggered' });
  } catch (error: any) {
    logger.error('API_RETRY_QUEUE', 'Failed to process queue', { error: error.message });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
