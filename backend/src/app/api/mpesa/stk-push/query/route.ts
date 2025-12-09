import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getAccessToken, generateTimestamp, generatePassword } from '@/lib/mpesa/auth';
import { getBaseUrl, MPESA_CONFIG } from '@/lib/mpesa/config';
import { logger, logError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checkoutRequestId } = body;

    if (!checkoutRequestId) {
      return NextResponse.json(
        { success: false, error: 'CheckoutRequestID is required' },
        { status: 400 }
      );
    }

    const shortCode = process.env.MPESA_SHORTCODE!;
    const passkey = process.env.MPESA_PASSKEY!;
    const timestamp = generateTimestamp();
    const password = generatePassword(shortCode, passkey, timestamp);

    const accessToken = await getAccessToken();

    logger.info('API_STK_QUERY', 'Querying STK Push status', { checkoutRequestId });

    const response = await axios.post(
      `${getBaseUrl()}${MPESA_CONFIG.STK_QUERY_ENDPOINT}`,
      {
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('API_STK_QUERY', 'STK Query response', { response: response.data });

    return NextResponse.json({
      success: true,
      data: response.data,
    });
  } catch (error: any) {
    await logError(
      'API_STK_QUERY_ERROR',
      error.message,
      error.stack
    );

    return NextResponse.json(
      {
        success: false,
        error: error.response?.data || error.message,
      },
      { status: 400 }
    );
  }
}
