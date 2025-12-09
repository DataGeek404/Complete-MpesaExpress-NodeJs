import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger, logError } from '@/lib/logger';
import { verifyWebhook, checkRateLimit } from '@/lib/webhook-verification';
import { emitCallbackReceived } from '@/lib/websocket-manager';
import type { C2BValidationRequest } from '@/types/mpesa';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook origin
    const verification = await verifyWebhook(request, 'C2B_VALIDATION');
    
    if (!verification.valid) {
      logger.warn('CALLBACK_C2B_VALIDATION', 'Webhook verification failed', {
        reason: verification.reason,
        ip: verification.clientIP,
      });
      // For validation, we should reject if verification fails
      return NextResponse.json({
        ResultCode: 'C2B00012',
        ResultDesc: 'Invalid request source',
      });
    }

    // Rate limiting
    if (!checkRateLimit(verification.clientIP)) {
      return NextResponse.json({
        ResultCode: 'C2B00012',
        ResultDesc: 'Rate limited',
      });
    }

    const body: C2BValidationRequest = await request.json();
    
    logger.info('CALLBACK_C2B_VALIDATION', 'Received C2B validation request', { body });

    // Emit real-time event
    emitCallbackReceived('C2B_VALIDATION', body);

    // Store raw callback for audit
    await query(
      `INSERT INTO callback_history (callback_type, raw_payload, ip_address, user_agent, processed, created_at) 
       VALUES (?, ?, ?, ?, FALSE, NOW())`,
      ['C2B_VALIDATION', JSON.stringify(body), verification.clientIP, verification.userAgent]
    );

    const {
      TransactionType,
      TransID,
      TransTime,
      TransAmount,
      BusinessShortCode,
      BillRefNumber,
      MSISDN,
      FirstName,
      MiddleName,
      LastName,
    } = body;

    // Implement your validation logic here
    // Examples:
    // - Check if the bill reference exists in your system
    // - Check if the amount matches expected amount
    // - Check if the phone number is registered
    // - Apply business rules
    
    let isValid = true;
    let rejectionReason = '';

    // Example validation rules (customize as needed):
    
    // 1. Check minimum amount
    const amount = parseFloat(TransAmount);
    if (amount < 1) {
      isValid = false;
      rejectionReason = 'Amount too low';
    }

    // 2. Check maximum amount
    if (amount > 150000) {
      isValid = false;
      rejectionReason = 'Amount exceeds limit';
    }

    // 3. Validate bill reference format (if required)
    // if (BillRefNumber && !/^[A-Z0-9]{6,12}$/i.test(BillRefNumber)) {
    //   isValid = false;
    //   rejectionReason = 'Invalid bill reference format';
    // }

    // Mark callback as processed
    await query(
      `UPDATE callback_history SET processed = TRUE, processing_result = ? WHERE raw_payload LIKE ? ORDER BY created_at DESC LIMIT 1`,
      [isValid ? 'accepted' : 'rejected', `%${TransID}%`]
    );
    
    if (isValid) {
      logger.info('CALLBACK_C2B_VALIDATION', 'Validation successful', {
        transId: TransID,
        amount: TransAmount,
        msisdn: MSISDN,
      });

      return NextResponse.json({
        ResultCode: 0,
        ResultDesc: 'Accepted',
      });
    } else {
      logger.warn('CALLBACK_C2B_VALIDATION', 'Validation rejected', {
        transId: TransID,
        reason: rejectionReason,
      });

      return NextResponse.json({
        ResultCode: 'C2B00011',
        ResultDesc: rejectionReason || 'Rejected',
      });
    }
  } catch (error: any) {
    await logError(
      'CALLBACK_C2B_VALIDATION_ERROR',
      error.message,
      error.stack
    );

    return NextResponse.json({
      ResultCode: 'C2B00012',
      ResultDesc: 'System error',
    });
  }
}
