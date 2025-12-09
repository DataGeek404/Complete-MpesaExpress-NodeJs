import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';
import { query } from './db';

export interface CorsOptions {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  maxAge?: number;
  credentials?: boolean;
}

const defaultCorsOptions: CorsOptions = {
  allowedOrigins: ['*'],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400,
  credentials: true,
};

// CORS middleware
export function withCors(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: CorsOptions = {}
) {
  const corsOptions = { ...defaultCorsOptions, ...options };
  
  return async (request: NextRequest): Promise<NextResponse> => {
    const origin = request.headers.get('origin') || '';
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      const headers = new Headers();
      
      if (corsOptions.allowedOrigins?.includes('*') || corsOptions.allowedOrigins?.includes(origin)) {
        headers.set('Access-Control-Allow-Origin', origin || '*');
      }
      
      headers.set('Access-Control-Allow-Methods', corsOptions.allowedMethods?.join(', ') || '');
      headers.set('Access-Control-Allow-Headers', corsOptions.allowedHeaders?.join(', ') || '');
      headers.set('Access-Control-Max-Age', String(corsOptions.maxAge));
      
      if (corsOptions.credentials) {
        headers.set('Access-Control-Allow-Credentials', 'true');
      }
      
      return new NextResponse(null, { status: 204, headers });
    }
    
    // Execute handler
    const response = await handler(request);
    
    // Add CORS headers to response
    if (corsOptions.allowedOrigins?.includes('*') || corsOptions.allowedOrigins?.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin || '*');
    }
    
    if (corsOptions.credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    if (corsOptions.exposedHeaders?.length) {
      response.headers.set('Access-Control-Expose-Headers', corsOptions.exposedHeaders.join(', '));
    }
    
    return response;
  };
}

// Request logging middleware
export function withLogging(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
    const startTime = Date.now();
    
    try {
      const response = await handler(request);
      const duration = Date.now() - startTime;
      
      // Log successful request
      logger.info('API_REQUEST', 'Request completed', {
        requestId,
        method: request.method,
        path: new URL(request.url).pathname,
        status: response.status,
        duration,
      });
      
      // Add request ID to response
      response.headers.set('X-Request-ID', requestId);
      
      // Record API metrics
      await recordMetrics({
        endpoint: new URL(request.url).pathname,
        method: request.method,
        statusCode: response.status,
        responseTimeMs: duration,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      });
      
      return response;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('API_REQUEST', 'Request failed', {
        requestId,
        method: request.method,
        path: new URL(request.url).pathname,
        error: error.message,
        duration,
      });
      
      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
          requestId,
        },
        { 
          status: 500,
          headers: { 'X-Request-ID': requestId },
        }
      );
    }
  };
}

// Record API metrics to database
async function recordMetrics(metrics: {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  ipAddress: string;
  userAgent: string;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO api_metrics (endpoint, method, status_code, response_time_ms, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        metrics.endpoint,
        metrics.method,
        metrics.statusCode,
        metrics.responseTimeMs,
        metrics.ipAddress,
        metrics.userAgent.slice(0, 500),
      ]
    );
  } catch (error) {
    // Don't fail request if metrics recording fails
    console.error('Failed to record API metrics:', error);
  }
}

// Security headers middleware
export function withSecurityHeaders(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const response = await handler(request);
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    
    return response;
  };
}

// Compose multiple middlewares
export function composeMiddleware(
  ...middlewares: Array<(handler: (request: NextRequest) => Promise<NextResponse>) => (request: NextRequest) => Promise<NextResponse>>
) {
  return (handler: (request: NextRequest) => Promise<NextResponse>) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}

// Input sanitization
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

// Validate content type
export function validateContentType(request: NextRequest, expected: string): boolean {
  const contentType = request.headers.get('content-type') || '';
  return contentType.includes(expected);
}
