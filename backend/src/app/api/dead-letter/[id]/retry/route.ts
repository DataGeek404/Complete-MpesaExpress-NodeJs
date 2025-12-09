import { NextRequest, NextResponse } from 'next/server';
import { retryDeadLetterItem } from '@/lib/retry-queue';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    const newJobId = await retryDeadLetterItem(id);

    return NextResponse.json({
      success: true,
      data: { newJobId },
      message: 'Item requeued for retry',
    });
  } catch (error: any) {
    logger.error('API_DEAD_LETTER_RETRY', 'Failed to retry item', { error: error.message });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
