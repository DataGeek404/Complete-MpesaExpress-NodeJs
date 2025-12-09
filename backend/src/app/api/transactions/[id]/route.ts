import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    const transactions = await query<any[]>(
      'SELECT * FROM transactions WHERE id = ?',
      [id]
    );

    if (!transactions.length) {
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: transactions[0],
    });
  } catch (error: any) {
    logger.error('API_TRANSACTION', 'Failed to fetch transaction', { error: error.message });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
