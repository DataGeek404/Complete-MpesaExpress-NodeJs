import { NextRequest, NextResponse } from 'next/server';
import { query } from './db';
import { logger } from './logger';
import crypto from 'crypto';

// API Key authentication for dashboard and API endpoints
export interface ApiKey {
  id: number;
  key_hash: string;
  name: string;
  permissions: string[];
  rate_limit: number;
  is_active: boolean;
  last_used_at: Date | null;
  expires_at: Date | null;
  created_at: Date;
}

export interface AuthenticatedRequest extends NextRequest {
  apiKey?: ApiKey;
  userId?: string;
}

// Hash API key for storage
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Generate a new API key
export function generateApiKey(): string {
  const prefix = 'mpesa_';
  const randomPart = crypto.randomBytes(32).toString('hex');
  return `${prefix}${randomPart}`;
}

// Validate API key from request
export async function validateApiKey(request: NextRequest): Promise<ApiKey | null> {
  const apiKeyHeader = request.headers.get('x-api-key');
  const authHeader = request.headers.get('authorization');
  
  let apiKey: string | null = null;
  
  if (apiKeyHeader) {
    apiKey = apiKeyHeader;
  } else if (authHeader?.startsWith('Bearer ')) {
    apiKey = authHeader.slice(7);
  }
  
  if (!apiKey) {
    return null;
  }
  
  try {
    const keyHash = hashApiKey(apiKey);
    
    const results = await query<ApiKey[]>(
      `SELECT * FROM api_keys WHERE key_hash = ? AND is_active = TRUE`,
      [keyHash]
    );
    
    if (results.length === 0) {
      logger.warn('AUTH', 'Invalid API key attempted', { keyPrefix: apiKey.slice(0, 10) });
      return null;
    }
    
    const keyRecord = results[0];
    
    // Check expiration
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      logger.warn('AUTH', 'Expired API key attempted', { keyId: keyRecord.id });
      return null;
    }
    
    // Update last used timestamp
    await query(
      `UPDATE api_keys SET last_used_at = NOW() WHERE id = ?`,
      [keyRecord.id]
    );
    
    // Parse permissions
    if (typeof keyRecord.permissions === 'string') {
      keyRecord.permissions = JSON.parse(keyRecord.permissions);
    }
    
    return keyRecord;
  } catch (error: any) {
    logger.error('AUTH', 'API key validation error', { error: error.message });
    return null;
  }
}

// Check if API key has required permission
export function hasPermission(apiKey: ApiKey, requiredPermission: string): boolean {
  if (!apiKey.permissions || !Array.isArray(apiKey.permissions)) {
    return false;
  }
  return apiKey.permissions.includes('*') || apiKey.permissions.includes(requiredPermission);
}

// Authentication middleware wrapper
export function withAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>,
  options: { permissions?: string[] } = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const apiKey = await validateApiKey(request);
    
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or missing API key. Include your API key in the X-API-Key header.',
        },
        { status: 401 }
      );
    }
    
    // Check permissions if specified
    if (options.permissions && options.permissions.length > 0) {
      const hasRequiredPermission = options.permissions.some((perm) =>
        hasPermission(apiKey, perm)
      );
      
      if (!hasRequiredPermission) {
        logger.warn('AUTH', 'Insufficient permissions', {
          keyId: apiKey.id,
          required: options.permissions,
          has: apiKey.permissions,
        });
        
        return NextResponse.json(
          {
            success: false,
            error: 'Forbidden',
            message: 'Insufficient permissions for this operation.',
          },
          { status: 403 }
        );
      }
    }
    
    // Add API key to request
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.apiKey = apiKey;
    
    return handler(authenticatedRequest);
  };
}

// Rate limiting check
export async function checkRateLimit(
  apiKey: ApiKey,
  endpoint: string
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const windowStart = new Date();
  windowStart.setMinutes(0, 0, 0);
  
  try {
    const results = await query<any[]>(
      `SELECT request_count FROM rate_limits 
       WHERE ip_address = ? AND endpoint = ? AND window_start = ?`,
      [apiKey.id.toString(), endpoint, windowStart]
    );
    
    const currentCount = results[0]?.request_count || 0;
    const limit = apiKey.rate_limit || 1000;
    
    if (currentCount >= limit) {
      const resetAt = new Date(windowStart);
      resetAt.setHours(resetAt.getHours() + 1);
      
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }
    
    // Increment counter
    await query(
      `INSERT INTO rate_limits (ip_address, endpoint, request_count, window_start)
       VALUES (?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE request_count = request_count + 1`,
      [apiKey.id.toString(), endpoint, windowStart]
    );
    
    const resetAt = new Date(windowStart);
    resetAt.setHours(resetAt.getHours() + 1);
    
    return {
      allowed: true,
      remaining: limit - currentCount - 1,
      resetAt,
    };
  } catch (error: any) {
    logger.error('RATE_LIMIT', 'Rate limit check failed', { error: error.message });
    return { allowed: true, remaining: 999, resetAt: new Date() };
  }
}

// Create a new API key
export async function createApiKey(
  name: string,
  permissions: string[] = ['read'],
  rateLimitPerHour: number = 1000,
  expiresInDays?: number
): Promise<{ key: string; record: Partial<ApiKey> }> {
  const key = generateApiKey();
  const keyHash = hashApiKey(key);
  
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;
  
  await query(
    `INSERT INTO api_keys (key_hash, name, permissions, rate_limit, is_active, expires_at, created_at)
     VALUES (?, ?, ?, ?, TRUE, ?, NOW())`,
    [keyHash, name, JSON.stringify(permissions), rateLimitPerHour, expiresAt]
  );
  
  logger.info('AUTH', 'New API key created', { name, permissions });
  
  return {
    key,
    record: {
      name,
      permissions,
      rate_limit: rateLimitPerHour,
      is_active: true,
      expires_at: expiresAt,
    },
  };
}

// Revoke an API key
export async function revokeApiKey(keyId: number): Promise<boolean> {
  try {
    await query(
      `UPDATE api_keys SET is_active = FALSE WHERE id = ?`,
      [keyId]
    );
    
    logger.info('AUTH', 'API key revoked', { keyId });
    return true;
  } catch (error: any) {
    logger.error('AUTH', 'Failed to revoke API key', { keyId, error: error.message });
    return false;
  }
}
