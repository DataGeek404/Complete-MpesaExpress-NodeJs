import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createApiKey, revokeApiKey, validateApiKey, hasPermission } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()).optional().default(['read']),
  rateLimitPerHour: z.number().positive().optional().default(1000),
  expiresInDays: z.number().positive().optional(),
});

// GET - List all API keys (requires admin permission)
export async function GET(request: NextRequest) {
  try {
    const apiKey = await validateApiKey(request);
    
    if (!apiKey || !hasPermission(apiKey, 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized or insufficient permissions' },
        { status: 401 }
      );
    }
    
    const keys = await query<any[]>(
      `SELECT id, name, permissions, rate_limit, is_active, last_used_at, expires_at, created_at 
       FROM api_keys 
       ORDER BY created_at DESC`
    );
    
    return NextResponse.json({
      success: true,
      data: {
        keys: keys.map((key) => ({
          ...key,
          permissions: typeof key.permissions === 'string' ? JSON.parse(key.permissions) : key.permissions,
        })),
      },
    });
  } catch (error: any) {
    logger.error('API_KEYS', 'Failed to list API keys', { error: error.message });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new API key (requires admin permission)
export async function POST(request: NextRequest) {
  try {
    const apiKey = await validateApiKey(request);
    
    if (!apiKey || !hasPermission(apiKey, 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized or insufficient permissions' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const validated = createKeySchema.parse(body);
    
    const result = await createApiKey(
      validated.name,
      validated.permissions,
      validated.rateLimitPerHour,
      validated.expiresInDays
    );
    
    return NextResponse.json({
      success: true,
      data: {
        key: result.key, // Only returned once!
        ...result.record,
      },
      message: 'API key created. Save this key securely - it will not be shown again.',
    });
  } catch (error: any) {
    logger.error('API_KEYS', 'Failed to create API key', { error: error.message });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

// DELETE - Revoke an API key (requires admin permission)
export async function DELETE(request: NextRequest) {
  try {
    const apiKey = await validateApiKey(request);
    
    if (!apiKey || !hasPermission(apiKey, 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized or insufficient permissions' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');
    
    if (!keyId) {
      return NextResponse.json(
        { success: false, error: 'Key ID is required' },
        { status: 400 }
      );
    }
    
    const success = await revokeApiKey(parseInt(keyId));
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'API key revoked successfully',
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to revoke API key' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    logger.error('API_KEYS', 'Failed to revoke API key', { error: error.message });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
