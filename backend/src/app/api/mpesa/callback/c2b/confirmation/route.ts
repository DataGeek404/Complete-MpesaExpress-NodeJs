import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger, logError } from '@/lib/logger';
import { verifyWebhook, checkRateLimit } from '@/lib/webhook-verification';
import { emitTransactionCreated, emitCallbackReceived } from '@/lib/websocket-manager';
import type { C2BConfirmationRequest } from '@/types/mpesa';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook origin
    const verification = await verifyWebhook(request, 'C2B_CONFIRMATION');
    
    if (!verification.valid) {
      logger.warn('CALLBACK_C2B_CONFIRMATION', 'Webhook verification failed', {
        reason: verification.reason,
        ip: verification.clientIP,
      });
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Received' });
    }

    // Rate limiting
    if (!checkRateLimit(verification.clientIP)) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Rate limited' });
    }

    const body: C2BConfirmationRequest = await request.json();
    
    logger.info('CALLBACK_C2B_CONFIRMATION', 'Received C2B confirmation', { body });

    // Emit real-time event
    emitCallbackReceived('C2B_CONFIRMATION', body);

    // Store raw callback for audit
    await query(
      `INSERT INTO callback_history (callback_type, raw_payload, ip_address, user_agent, processed, created_at) 
       VALUES (?, ?, ?, ?, FALSE, NOW())`,
      ['C2B_CONFIRMATION', JSON.stringify(body), verification.clientIP, verification.userAgent]
    );

    const {
      TransactionType,
      TransID,
      TransTime,
      TransAmount,
      BusinessShortCode,
      BillRefNumber,
      OrgAccountBalance,
      ThirdPartyTransID,
      MSISDN,
      FirstName,
      MiddleName,
      LastName,
    } = body;

    // Save C2B transaction to database
    const result = await query<any>(
      `INSERT INTO transactions 
       (transaction_type, transaction_id, phone_number, amount, account_reference, transaction_desc, status, raw_callback, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        'C2B',
        TransID,
        MSISDN,
        parseFloat(TransAmount),
        BillRefNumber,
        `${TransactionType} from ${FirstName} ${MiddleName} ${LastName}`.trim(),
        'completed',
        JSON.stringify(body),
      ]
    );

    // Emit real-time notification for new transaction
    const transactions = await query<any[]>(
      'SELECT * FROM transactions WHERE transaction_id = ?',
      [TransID]
    );

    if (transactions.length > 0) {
      emitTransactionCreated(transactions[0]);
    }

    // Mark callback as processed
    await query(
      `UPDATE callback_history SET processed = TRUE, processing_result = 'completed' WHERE raw_payload LIKE ? ORDER BY created_at DESC LIMIT 1`,
      [`%${TransID}%`]
    );

    logger.info('CALLBACK_C2B_CONFIRMATION', 'C2B confirmation processed', {
      transId: TransID,
      amount: TransAmount,
      msisdn: MSISDN,
      billRefNumber: BillRefNumber,
    });

    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Confirmation received',
    });
  } catch (error: any) {
    await logError(
      'CALLBACK_C2B_CONFIRMATION_ERROR',
      error.message,
      error.stack
    );

    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Received',
    });
  }
}
