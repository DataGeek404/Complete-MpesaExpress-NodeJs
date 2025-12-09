import { NextRequest, NextResponse } from 'next/server';
import { initiateSTKPush } from '@/lib/mpesa/stk-push';
import { stkPushSchema, validateRequest } from '@/lib/validation';
import { logger, logError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    logger.info('API_STK_PUSH', 'Received STK Push request', { body });

    const validatedData = validateRequest(stkPushSchema, body);
    
    const response = await initiateSTKPush(validatedData);

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    await logError(
      'API_STK_PUSH_ERROR',
      error.message,
      error.stack
    );

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 400 }
    );
  }
}
