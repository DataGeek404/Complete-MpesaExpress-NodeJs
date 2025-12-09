import axios from 'axios';
import { getAccessToken } from './auth';
import { getBaseUrl, getCallbackUrl, MPESA_CONFIG } from './config';
import { logger, logError } from '../logger';
import type { C2BRegisterResponse } from '@/types/mpesa';

export interface C2BRegisterOptions {
  responseType?: 'Completed' | 'Cancelled';
}

export async function registerC2BUrls(options: C2BRegisterOptions = {}): Promise<C2BRegisterResponse> {
  const shortCode = process.env.MPESA_SHORTCODE || '174379';
  const { responseType = 'Completed' } = options;

  const requestBody = {
    ShortCode: shortCode,
    ResponseType: responseType,
    ConfirmationURL: getCallbackUrl('/c2b/confirmation'),
    ValidationURL: getCallbackUrl('/c2b/validation'),
  };

  try {
    logger.info('C2B_REGISTER', 'Registering C2B URLs', {
      shortCode,
      confirmationURL: requestBody.ConfirmationURL,
      validationURL: requestBody.ValidationURL,
    });

    const accessToken = await getAccessToken();

    const response = await axios.post<C2BRegisterResponse>(
      `${getBaseUrl()}${MPESA_CONFIG.C2B_REGISTER_ENDPOINT}`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('C2B_REGISTER', 'C2B URLs registered successfully', {
      responseCode: response.data.ResponseCode,
      responseDescription: response.data.ResponseDescription,
    });

    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.errorMessage || error.message;
    
    await logError(
      'C2B_REGISTER_ERROR',
      errorMessage,
      error.stack,
      { request: requestBody, response: error.response?.data }
    );

    throw new Error(`C2B registration failed: ${errorMessage}`);
  }
}

export interface C2BSimulateOptions {
  commandID?: 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline';
  amount: number;
  msisdn: string;
  billRefNumber?: string;
}

export async function simulateC2B(options: C2BSimulateOptions): Promise<any> {
  const shortCode = process.env.MPESA_SHORTCODE || '174379';
  const { commandID = 'CustomerPayBillOnline', amount, msisdn, billRefNumber } = options;

  // Format phone number
  let formattedMsisdn = msisdn.replace(/\D/g, '');
  if (formattedMsisdn.startsWith('0')) {
    formattedMsisdn = '254' + formattedMsisdn.substring(1);
  } else if (!formattedMsisdn.startsWith('254')) {
    formattedMsisdn = '254' + formattedMsisdn;
  }

  const requestBody = {
    ShortCode: shortCode,
    CommandID: commandID,
    Amount: Math.round(amount),
    Msisdn: formattedMsisdn,
    BillRefNumber: billRefNumber || 'Test',
  };

  try {
    logger.info('C2B_SIMULATE', 'Simulating C2B transaction', {
      shortCode,
      commandID,
      amount,
      msisdn: formattedMsisdn,
    });

    const accessToken = await getAccessToken();

    const response = await axios.post(
      `${getBaseUrl()}${MPESA_CONFIG.C2B_SIMULATE_ENDPOINT}`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('C2B_SIMULATE', 'C2B simulation successful', response.data);

    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.errorMessage || error.message;
    
    await logError(
      'C2B_SIMULATE_ERROR',
      errorMessage,
      error.stack,
      { request: requestBody, response: error.response?.data }
    );

    throw new Error(`C2B simulation failed: ${errorMessage}`);
  }
}
