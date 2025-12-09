import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger, logError } from '@/lib/logger';
import { verifyWebhook, checkRateLimit } from '@/lib/webhook-verification';
import { emitTransactionUpdated, emitTransactionCompleted, emitTransactionFailed, emitCallbackReceived } from '@/lib/websocket-manager';
import type { B2CCallbackBody } from '@/types/mpesa';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook origin
    const verification = await verifyWebhook(request, 'B2C_RESULT');
    
    if (!verification.valid) {
      logger.warn('CALLBACK_B2C_RESULT', 'Webhook verification failed', {
        reason: verification.reason,
        ip: verification.clientIP,
      });
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Received' });
    }

    // Rate limiting
    if (!checkRateLimit(verification.clientIP)) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Rate limited' });
    }

    const body: B2CCallbackBody = await request.json();
    
    logger.info('CALLBACK_B2C_RESULT', 'Received B2C result callback', { body });

    // Emit real-time event
    emitCallbackReceived('B2C_RESULT', body);

    // Store raw callback for audit
    await query(
      `INSERT INTO callback_history (callback_type, raw_payload, ip_address, user_agent, processed, created_at) 
       VALUES (?, ?, ?, ?, FALSE, NOW())`,
      ['B2C_RESULT', JSON.stringify(body), verification.clientIP, verification.userAgent]
    );

    const { Result } = body;
    const {
      ResultType,
      ResultCode,
      ResultDesc,
      OriginatorConversationID,
      ConversationID,
      TransactionID,
      ResultParameters,
    } = Result;

    // Extract result parameters
    let transactionAmount: number | null = null;
    let transactionReceipt: string | null = null;
    let receiverPartyPublicName: string | null = null;

    if (ResultParameters?.ResultParameter) {
      for (const param of ResultParameters.ResultParameter) {
        switch (param.Key) {
          case 'TransactionAmount':
            transactionAmount = param.Value as number;
            break;
          case 'TransactionReceipt':
            transactionReceipt = param.Value as string;
            break;
          case 'ReceiverPartyPublicName':
            receiverPartyPublicName = param.Value as string;
            break;
        }
      }
    }

    // Determine status
    const status = ResultCode === 0 ? 'completed' : 'failed';

    // Update transaction in database
    await query(
      `UPDATE transactions 
       SET result_code = ?, result_desc = ?, status = ?, transaction_id = ?, raw_callback = ?, updated_at = NOW()
       WHERE conversation_id = ? OR originator_conversation_id = ?`,
      [
        ResultCode,
        ResultDesc,
        status,
        TransactionID || transactionReceipt,
        JSON.stringify(body),
        ConversationID,
        OriginatorConversationID,
      ]
    );

    // Get updated transaction for real-time notification
    const transactions = await query<any[]>(
      'SELECT * FROM transactions WHERE conversation_id = ? OR originator_conversation_id = ?',
      [ConversationID, OriginatorConversationID]
    );

    if (transactions.length > 0) {
      const transaction = transactions[0];
      emitTransactionUpdated(transaction);
      
      if (status === 'completed') {
        emitTransactionCompleted(transaction);
      } else {
        emitTransactionFailed(transaction);
      }
    }

    // Mark callback as processed
    await query(
      `UPDATE callback_history SET processed = TRUE, processing_result = ? WHERE raw_payload LIKE ? ORDER BY created_at DESC LIMIT 1`,
      [status, `%${ConversationID}%`]
    );

    logger.info('CALLBACK_B2C_RESULT', 'B2C result processed', {
      conversationId: ConversationID,
      transactionId: TransactionID,
      resultCode: ResultCode,
      status,
    });

    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Result received',
    });
  } catch (error: any) {
    await logError(
      'CALLBACK_B2C_RESULT_ERROR',
      error.message,
      error.stack
    );

    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Received',
    });
  }
}
