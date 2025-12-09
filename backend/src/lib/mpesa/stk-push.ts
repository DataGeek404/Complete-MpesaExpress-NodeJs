import axios from 'axios';
import { getAccessToken, generateTimestamp, generatePassword } from './auth';
import { getBaseUrl, getCallbackUrl, MPESA_CONFIG } from './config';
import { logger, logError } from '../logger';
import { query } from '../db';
import type { STKPushRequest, STKPushResponse } from '@/types/mpesa';

export async function initiateSTKPush(request: STKPushRequest): Promise<STKPushResponse> {
  const { phoneNumber, amount, accountReference, transactionDesc } = request;
  
  const shortCode = process.env.MPESA_SHORTCODE || '174379';
  const passkey = process.env.MPESA_PASSKEY || '';
  const timestamp = generateTimestamp();
  const password = generatePassword(shortCode, passkey, timestamp);

  // Format phone number (remove leading 0 or +, ensure starts with 254)
  const formattedPhone = formatPhoneNumber(phoneNumber);

  const requestBody = {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: MPESA_CONFIG.TRANSACTION_TYPE.STK,
    Amount: Math.round(amount),
    PartyA: formattedPhone,
    PartyB: shortCode,
    PhoneNumber: formattedPhone,
    CallBackURL: getCallbackUrl('/stk'),
    AccountReference: accountReference.substring(0, 12),
    TransactionDesc: (transactionDesc || 'Payment').substring(0, 13),
  };

  try {
    logger.info('STK_PUSH', 'Initiating STK Push', {
      phoneNumber: formattedPhone,
      amount,
      accountReference,
    });

    const accessToken = await getAccessToken();
    
    const response = await axios.post<STKPushResponse>(
      `${getBaseUrl()}${MPESA_CONFIG.STK_PUSH_ENDPOINT}`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const { MerchantRequestID, CheckoutRequestID, ResponseCode, ResponseDescription, CustomerMessage } = response.data;

    // Save transaction to database
    await query(
      `INSERT INTO transactions 
       (transaction_type, checkout_request_id, merchant_request_id, phone_number, amount, account_reference, transaction_desc, status, raw_request, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        'STK_PUSH',
        CheckoutRequestID,
        MerchantRequestID,
        formattedPhone,
        amount,
        accountReference,
        transactionDesc || 'Payment',
        'pending',
        JSON.stringify(requestBody),
      ]
    );

    logger.info('STK_PUSH', 'STK Push initiated successfully', {
      checkoutRequestId: CheckoutRequestID,
      merchantRequestId: MerchantRequestID,
      responseCode: ResponseCode,
    });

    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.errorMessage || error.message;
    
    await logError(
      'STK_PUSH_ERROR',
      errorMessage,
      error.stack,
      { request: requestBody, response: error.response?.data }
    );

    throw new Error(`STK Push failed: ${errorMessage}`);
  }
}

export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle different formats
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (!cleaned.startsWith('254')) {
    cleaned = '254' + cleaned;
  }
  
  return cleaned;
}
