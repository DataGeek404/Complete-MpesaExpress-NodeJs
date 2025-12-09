import { NextRequest, NextResponse } from 'next/server';
import { registerC2BUrls } from '@/lib/mpesa/c2b';
import { logger, logError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    
    logger.info('API_C2B_REGISTER', 'Received C2B register request', { body });

    const response = await registerC2BUrls({
      responseType: body.responseType || 'Completed',
    });

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    await logError(
      'API_C2B_REGISTER_ERROR',
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
