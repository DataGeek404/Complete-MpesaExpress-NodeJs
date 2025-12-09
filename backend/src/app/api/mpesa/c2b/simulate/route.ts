import { NextRequest, NextResponse } from 'next/server';
import { simulateC2B } from '@/lib/mpesa/c2b';
import { c2bSimulateSchema, validateRequest } from '@/lib/validation';
import { logger, logError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    logger.info('API_C2B_SIMULATE', 'Received C2B simulate request', { body });

    const validatedData = validateRequest(c2bSimulateSchema, body);
    
    const response = await simulateC2B(validatedData);

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    await logError(
      'API_C2B_SIMULATE_ERROR',
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
