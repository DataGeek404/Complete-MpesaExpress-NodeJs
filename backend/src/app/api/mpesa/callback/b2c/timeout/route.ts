import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger, logError } from '@/lib/logger';
import { verifyWebhook, checkRateLimit } from '@/lib/webhook-verification';
import { emitTransactionFailed, emitCallbackReceived } from '@/lib/websocket-manager';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook origin
    const verification = await verifyWebhook(request, 'B2C_TIMEOUT');
    
    if (!verification.valid) {
      logger.warn('CALLBACK_B2C_TIMEOUT', 'Webhook verification failed', {
        reason: verification.reason,
        ip: verification.clientIP,
      });
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Received' });
    }

    // Rate limiting
    if (!checkRateLimit(verification.clientIP)) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Rate limited' });
    }

    const body = await request.json();
    
    logger.warn('CALLBACK_B2C_TIMEOUT', 'Received B2C timeout callback', { body });

    // Emit real-time event
    emitCallbackReceived('B2C_TIMEOUT', body);

    // Store raw callback for audit
    await query(
      `INSERT INTO callback_history (callback_type, raw_payload, ip_address, user_agent, processed, created_at) 
       VALUES (?, ?, ?, ?, FALSE, NOW())`,
      ['B2C_TIMEOUT', JSON.stringify(body), verification.clientIP, verification.userAgent]
    );

    // Extract conversation IDs if available
    const conversationId = body?.Result?.ConversationID;
    const originatorConversationId = body?.Result?.OriginatorConversationID;

    if (conversationId || originatorConversationId) {
      // Update transaction status to failed due to timeout
      await query(
        `UPDATE transactions 
         SET status = 'failed', result_desc = 'Transaction timed out', raw_callback = ?, updated_at = NOW()
         WHERE conversation_id = ? OR originator_conversation_id = ?`,
        [
          JSON.stringify(body),
          conversationId,
          originatorConversationId,
        ]
      );

      // Get updated transaction for real-time notification
      const transactions = await query<any[]>(
        'SELECT * FROM transactions WHERE conversation_id = ? OR originator_conversation_id = ?',
        [conversationId, originatorConversationId]
      );

      if (transactions.length > 0) {
        emitTransactionFailed(transactions[0]);
      }

      // Mark callback as processed
      await query(
        `UPDATE callback_history SET processed = TRUE, processing_result = 'timeout' WHERE raw_payload LIKE ? ORDER BY created_at DESC LIMIT 1`,
        [`%${conversationId || originatorConversationId}%`]
      );
    }

    logger.info('CALLBACK_B2C_TIMEOUT', 'B2C timeout processed');

    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Timeout received',
    });
  } catch (error: any) {
    await logError(
      'CALLBACK_B2C_TIMEOUT_ERROR',
      error.message,
      error.stack
    );

    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Received',
    });
  }
}
