import { NextRequest } from 'next/server';
import { query } from './db';
import { logger } from './logger';
import crypto from 'crypto';

// M-Pesa Safaricom IP ranges (production)
// These should be verified with Safaricom documentation
const MPESA_IP_WHITELIST = [
  // Safaricom Production IPs
  '196.201.214.0/24',
  '196.201.214.200',
  '196.201.214.206',
  '196.201.214.207',
  '196.201.214.208',
  // Safaricom Sandbox IPs
  '196.201.212.0/24',
  '196.201.212.127',
  '196.201.212.128',
  '196.201.212.129',
  '196.201.212.138',
  // Additional known IPs
  '41.215.136.0/24',
  '41.215.137.0/24',
  // Localhost for testing
  '127.0.0.1',
  '::1',
  'localhost',
];

// Parse CIDR notation
function parseCIDR(cidr: string): { base: number; mask: number } | null {
  const parts = cidr.split('/');
  if (parts.length !== 2) return null;
  
  const ip = parts[0].split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  const mask = ~((1 << (32 - parseInt(parts[1]))) - 1) >>> 0;
  
  return { base: ip & mask, mask };
}

// Convert IP string to number
function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}

// Check if IP is in whitelist
function isIPWhitelisted(clientIP: string): boolean {
  // Skip verification if disabled
  if (process.env.MPESA_SKIP_IP_VERIFICATION === 'true') {
    logger.warn('WEBHOOK_VERIFY', 'IP verification skipped (dev mode)');
    return true;
  }

  // Handle IPv6 localhost
  if (clientIP === '::1' || clientIP === '::ffff:127.0.0.1') {
    return MPESA_IP_WHITELIST.includes('127.0.0.1');
  }

  // Strip IPv6 prefix if present
  const cleanIP = clientIP.replace('::ffff:', '');

  for (const whitelistEntry of MPESA_IP_WHITELIST) {
    // Direct match
    if (whitelistEntry === cleanIP) {
      return true;
    }

    // CIDR match
    if (whitelistEntry.includes('/')) {
      const cidr = parseCIDR(whitelistEntry);
      if (cidr) {
        const clientNum = ipToNumber(cleanIP);
        if ((clientNum & cidr.mask) === cidr.base) {
          return true;
        }
      }
    }
  }

  return false;
}

// Generate signature for verification
export function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

// Verify signature
function verifySignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return true; // Skip if not configured
  
  const expectedSignature = generateSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export interface WebhookVerificationResult {
  valid: boolean;
  reason?: string;
  clientIP: string;
  userAgent: string;
}

export async function verifyWebhook(
  request: NextRequest,
  callbackType: string
): Promise<WebhookVerificationResult> {
  // Extract client IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = forwarded?.split(',')[0]?.trim() || realIP || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  logger.info('WEBHOOK_VERIFY', 'Verifying webhook request', {
    clientIP,
    userAgent,
    callbackType,
  });

  // Verify IP address
  if (!isIPWhitelisted(clientIP)) {
    logger.warn('WEBHOOK_VERIFY', 'Request from non-whitelisted IP', {
      clientIP,
      callbackType,
    });

    // Log to callback history with failed verification
    await logCallbackAttempt(callbackType, clientIP, userAgent, false, 'IP not whitelisted');

    return {
      valid: false,
      reason: 'IP address not whitelisted',
      clientIP,
      userAgent,
    };
  }

  // Log successful verification
  await logCallbackAttempt(callbackType, clientIP, userAgent, true);

  return {
    valid: true,
    clientIP,
    userAgent,
  };
}

// Log callback attempt to database
async function logCallbackAttempt(
  callbackType: string,
  ipAddress: string,
  userAgent: string,
  verified: boolean,
  reason?: string
): Promise<void> {
  try {
    await query(
      `INSERT INTO callback_verification_log 
       (callback_type, ip_address, user_agent, verified, failure_reason, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [callbackType, ipAddress, userAgent, verified, reason || null]
    );
  } catch (error) {
    logger.error('WEBHOOK_VERIFY', 'Failed to log callback attempt', { error });
  }
}

// Rate limiting for callbacks
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(ip: string, limit: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    logger.warn('WEBHOOK_RATE_LIMIT', 'Rate limit exceeded', { ip, count: record.count });
    return false;
  }

  record.count++;
  return true;
}

// Clean up rate limit map periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 60000);
