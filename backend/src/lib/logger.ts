import { query } from './db';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  level: LogLevel;
  category: string;
  message: string;
  metadata?: Record<string, any>;
}

export async function log(entry: LogEntry): Promise<void> {
  const { level, category, message, metadata } = entry;
  
  // Console log with timestamp
  const timestamp = new Date().toISOString();
  const metaStr = metadata ? JSON.stringify(metadata) : '';
  console[level === 'debug' ? 'log' : level](
    `[${timestamp}] [${level.toUpperCase()}] [${category}] ${message}`,
    metaStr ? metadata : ''
  );

  // Save to database
  try {
    await query(
      `INSERT INTO logs (level, category, message, metadata, created_at) VALUES (?, ?, ?, ?, NOW())`,
      [level, category, message, metaStr || null]
    );
  } catch (error) {
    console.error('Failed to save log to database:', error);
  }
}

export async function logError(
  errorType: string,
  errorMessage: string,
  stackTrace?: string,
  requestData?: Record<string, any>
): Promise<void> {
  try {
    await query(
      `INSERT INTO error_events (error_type, error_message, stack_trace, request_data, created_at) VALUES (?, ?, ?, ?, NOW())`,
      [errorType, errorMessage, stackTrace || null, requestData ? JSON.stringify(requestData) : null]
    );
  } catch (error) {
    console.error('Failed to save error event to database:', error);
  }

  await log({
    level: 'error',
    category: errorType,
    message: errorMessage,
    metadata: { stackTrace, requestData },
  });
}

export const logger = {
  info: (category: string, message: string, metadata?: Record<string, any>) =>
    log({ level: 'info', category, message, metadata }),
  warn: (category: string, message: string, metadata?: Record<string, any>) =>
    log({ level: 'warn', category, message, metadata }),
  error: (category: string, message: string, metadata?: Record<string, any>) =>
    log({ level: 'error', category, message, metadata }),
  debug: (category: string, message: string, metadata?: Record<string, any>) =>
    log({ level: 'debug', category, message, metadata }),
};
