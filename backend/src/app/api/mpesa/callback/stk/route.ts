import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger, logError } from '@/lib/logger';
import { verifyWebhook, checkRateLimit } from '@/lib/webhook-verification';
import { emitTransactionUpdated, emitTransactionCompleted, emitTransactionFailed, emitCallbackReceived } from '@/lib/websocket-manager';
import type { STKCallbackBody } from '@/types/mpesa';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook origin
    const verification = await verifyWebhook(request, 'STK');
    
    if (!verification.valid) {
      logger.warn('CALLBACK_STK', 'Webhook verification failed', {
        reason: verification.reason,
        ip: verification.clientIP,
      });
      // Still return success to prevent M-Pesa retries
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Received' });
    }

    // Rate limiting
    if (!checkRateLimit(verification.clientIP)) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Rate limited' });
    }

    const body: STKCallbackBody = await request.json();
    
    logger.info('CALLBACK_STK', 'Received STK Push callback', { body });

    // Emit real-time event
    emitCallbackReceived('STK', body);

    // Store raw callback for audit
    await query(
      `INSERT INTO callback_history (callback_type, raw_payload, ip_address, user_agent, processed, created_at) 
       VALUES (?, ?, ?, ?, FALSE, NOW())`,
      ['STK', JSON.stringify(body), verification.clientIP, verification.userAgent]
    );

    const { stkCallback } = body.Body;
    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback;

    // Extract metadata if available
    let amount: number | null = null;
    let mpesaReceiptNumber: string | null = null;
    let transactionDate: string | null = null;
    let phoneNumber: string | null = null;

    if (CallbackMetadata?.Item) {
      for (const item of CallbackMetadata.Item) {
        switch (item.Name) {
          case 'Amount':
            amount = item.Value as number;
            break;
          case 'MpesaReceiptNumber':
            mpesaReceiptNumber = item.Value as string;
            break;
          case 'TransactionDate':
            transactionDate = String(item.Value);
            break;
          case 'PhoneNumber':
            phoneNumber = String(item.Value);
            break;
        }
      }
    }

    // Determine status based on result code
    const status = ResultCode === 0 ? 'completed' : ResultCode === 1032 ? 'cancelled' : 'failed';

    // Update transaction in database
    await query(
      `UPDATE transactions 
       SET result_code = ?, result_desc = ?, status = ?, transaction_id = ?, raw_callback = ?, updated_at = NOW()
       WHERE checkout_request_id = ?`,
      [
        ResultCode,
        ResultDesc,
        status,
        mpesaReceiptNumber,
        JSON.stringify(body),
        CheckoutRequestID,
      ]
    );

    // Get updated transaction for real-time notification
    const transactions = await query<any[]>(
      'SELECT * FROM transactions WHERE checkout_request_id = ?',
      [CheckoutRequestID]
    );

    if (transactions.length > 0) {
      const transaction = transactions[0];
      emitTransactionUpdated(transaction);
      
      if (status === 'completed') {
        emitTransactionCompleted(transaction);
      } else if (status === 'failed' || status === 'cancelled') {
        emitTransactionFailed(transaction);
      }
    }

    // Mark callback as processed
    await query(
      `UPDATE callback_history SET processed = TRUE, processing_result = ? WHERE raw_payload LIKE ? ORDER BY created_at DESC LIMIT 1`,
      [status, `%${CheckoutRequestID}%`]
    );

    logger.info('CALLBACK_STK', 'STK callback processed successfully', {
      checkoutRequestId: CheckoutRequestID,
      merchantRequestId: MerchantRequestID,
      resultCode: ResultCode,
      status,
      mpesaReceiptNumber,
    });

    // Return success response to M-Pesa
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Callback received successfully',
    });
  } catch (error: any) {
    await logError(
      'CALLBACK_STK_ERROR',
      error.message,
      error.stack
    );

    // Still return success to M-Pesa to prevent retries
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Callback received',
    });
  }
}
