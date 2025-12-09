import { NextRequest, NextResponse } from 'next/server';
import { initiateB2CPayment } from '@/lib/mpesa/b2c';
import { b2cPaymentSchema, validateRequest } from '@/lib/validation';
import { logger, logError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    logger.info('API_B2C', 'Received B2C payment request', { body });

    const validatedData = validateRequest(b2cPaymentSchema, body);
    
    const response = await initiateB2CPayment(validatedData);

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    await logError(
      'API_B2C_ERROR',
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
