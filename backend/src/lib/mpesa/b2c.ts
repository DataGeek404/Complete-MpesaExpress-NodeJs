import axios from 'axios';
import { getAccessToken } from './auth';
import { getBaseUrl, getCallbackUrl, MPESA_CONFIG } from './config';
import { logger, logError } from '../logger';
import { query } from '../db';
import type { B2CResponse } from '@/types/mpesa';

export interface B2CPaymentOptions {
  amount: number;
  phoneNumber: string;
  remarks: string;
  occasion?: string;
  commandID?: 'BusinessPayment' | 'SalaryPayment' | 'PromotionPayment';
}

export async function initiateB2CPayment(options: B2CPaymentOptions): Promise<B2CResponse> {
  const {
    amount,
    phoneNumber,
    remarks,
    occasion = '',
    commandID = 'BusinessPayment',
  } = options;

  const shortCode = process.env.MPESA_BUSINESS_SHORTCODE || process.env.MPESA_SHORTCODE || '174379';
  const initiatorName = process.env.MPESA_INITIATOR_NAME || 'testapi';
  const securityCredential = process.env.MPESA_SECURITY_CREDENTIAL || '';

  // Format phone number
  let formattedPhone = phoneNumber.replace(/\D/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '254' + formattedPhone.substring(1);
  } else if (!formattedPhone.startsWith('254')) {
    formattedPhone = '254' + formattedPhone;
  }

  const requestBody = {
    InitiatorName: initiatorName,
    SecurityCredential: securityCredential,
    CommandID: commandID,
    Amount: Math.round(amount),
    PartyA: shortCode,
    PartyB: formattedPhone,
    Remarks: remarks.substring(0, 100),
    QueueTimeOutURL: getCallbackUrl('/b2c/timeout'),
    ResultURL: getCallbackUrl('/b2c/result'),
    Occasion: occasion.substring(0, 100),
  };

  try {
    logger.info('B2C_PAYMENT', 'Initiating B2C payment', {
      phoneNumber: formattedPhone,
      amount,
      commandID,
    });

    const accessToken = await getAccessToken();

    const response = await axios.post<B2CResponse>(
      `${getBaseUrl()}${MPESA_CONFIG.B2C_ENDPOINT}`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const { ConversationID, OriginatorConversationID, ResponseCode, ResponseDescription } = response.data;

    // Save transaction to database
    await query(
      `INSERT INTO transactions 
       (transaction_type, conversation_id, originator_conversation_id, phone_number, amount, transaction_desc, status, raw_request, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        'B2C',
        ConversationID,
        OriginatorConversationID,
        formattedPhone,
        amount,
        remarks,
        'pending',
        JSON.stringify(requestBody),
      ]
    );

    logger.info('B2C_PAYMENT', 'B2C payment initiated successfully', {
      conversationId: ConversationID,
      originatorConversationId: OriginatorConversationID,
      responseCode: ResponseCode,
    });

    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.errorMessage || error.message;
    
    await logError(
      'B2C_PAYMENT_ERROR',
      errorMessage,
      error.stack,
      { request: { ...requestBody, SecurityCredential: '[REDACTED]' }, response: error.response?.data }
    );

    throw new Error(`B2C payment failed: ${errorMessage}`);
  }
}
