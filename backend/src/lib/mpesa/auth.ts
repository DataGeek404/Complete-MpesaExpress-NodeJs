import axios from 'axios';
import { getBaseUrl, MPESA_CONFIG } from './config';
import { logger } from '../logger';
import type { MpesaAuthResponse } from '@/types/mpesa';

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

export async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    logger.debug('MPESA_AUTH', 'Using cached access token');
    return cachedToken.token;
  }

  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error('M-Pesa consumer key and secret are required');
  }

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  try {
    logger.info('MPESA_AUTH', 'Requesting new access token');
    
    const response = await axios.get<MpesaAuthResponse>(
      `${getBaseUrl()}${MPESA_CONFIG.OAUTH_ENDPOINT}`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    const { access_token, expires_in } = response.data;
    
    // Cache the token with a 5-minute buffer before expiry
    const expiresInMs = (parseInt(expires_in) - 300) * 1000;
    cachedToken = {
      token: access_token,
      expiresAt: Date.now() + expiresInMs,
    };

    logger.info('MPESA_AUTH', 'Successfully obtained access token', {
      expiresIn: expires_in,
    });

    return access_token;
  } catch (error: any) {
    logger.error('MPESA_AUTH', 'Failed to obtain access token', {
      error: error.message,
      response: error.response?.data,
    });
    throw new Error(`Failed to get M-Pesa access token: ${error.message}`);
  }
}

export function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

export function generatePassword(shortCode: string, passkey: string, timestamp: string): string {
  const str = `${shortCode}${passkey}${timestamp}`;
  return Buffer.from(str).toString('base64');
}

export function clearTokenCache(): void {
  cachedToken = null;
  logger.info('MPESA_AUTH', 'Token cache cleared');
}
