import { query } from './db';
import { logger, logError } from './logger';
import axios, { AxiosRequestConfig } from 'axios';

export interface RetryJob {
  id?: number;
  job_type: string;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  payload: any;
  max_retries: number;
  current_retry: number;
  next_retry_at: Date;
  last_error?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter';
  correlation_id?: string;
  created_at?: Date;
  updated_at?: Date;
}

// Exponential backoff configuration
const INITIAL_DELAY_MS = 1000; // 1 second
const MAX_DELAY_MS = 300000; // 5 minutes
const BACKOFF_MULTIPLIER = 2;
const JITTER_FACTOR = 0.1;

// Calculate next retry delay with exponential backoff and jitter
export function calculateBackoffDelay(retryCount: number): number {
  const baseDelay = INITIAL_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, retryCount);
  const cappedDelay = Math.min(baseDelay, MAX_DELAY_MS);
  
  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * JITTER_FACTOR * (Math.random() * 2 - 1);
  return Math.floor(cappedDelay + jitter);
}

// Add job to retry queue
export async function addToRetryQueue(job: Omit<RetryJob, 'id' | 'current_retry' | 'next_retry_at' | 'status' | 'created_at' | 'updated_at'>): Promise<number> {
  const nextRetryAt = new Date(Date.now() + calculateBackoffDelay(0));
  
  const result = await query<any>(
    `INSERT INTO retry_queue 
     (job_type, endpoint, method, headers, payload, max_retries, current_retry, next_retry_at, status, correlation_id, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'pending', ?, NOW(), NOW())`,
    [
      job.job_type,
      job.endpoint,
      job.method,
      JSON.stringify(job.headers),
      JSON.stringify(job.payload),
      job.max_retries,
      nextRetryAt,
      job.correlation_id || null,
    ]
  );

  logger.info('RETRY_QUEUE', 'Job added to retry queue', {
    jobType: job.job_type,
    endpoint: job.endpoint,
    correlationId: job.correlation_id,
    nextRetryAt,
  });

  return result.insertId;
}

// Process retry queue
export async function processRetryQueue(): Promise<void> {
  try {
    // Get pending jobs that are ready to retry
    const jobs = await query<RetryJob[]>(
      `SELECT * FROM retry_queue 
       WHERE status = 'pending' AND next_retry_at <= NOW() 
       ORDER BY next_retry_at ASC 
       LIMIT 10`
    );

    for (const job of jobs) {
      await processJob(job);
    }
  } catch (error: any) {
    logger.error('RETRY_QUEUE', 'Failed to process retry queue', { error: error.message });
  }
}

// Process individual job
async function processJob(job: RetryJob): Promise<void> {
  const jobId = job.id!;

  try {
    // Mark as processing
    await query(
      `UPDATE retry_queue SET status = 'processing', updated_at = NOW() WHERE id = ?`,
      [jobId]
    );

    logger.info('RETRY_QUEUE', 'Processing retry job', {
      jobId,
      jobType: job.job_type,
      retryCount: job.current_retry,
    });

    // Execute the request
    const config: AxiosRequestConfig = {
      method: job.method as any,
      url: job.endpoint,
      headers: typeof job.headers === 'string' ? JSON.parse(job.headers) : job.headers,
      data: typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload,
      timeout: 30000,
    };

    const response = await axios(config);

    // Success - mark as completed
    await query(
      `UPDATE retry_queue SET status = 'completed', updated_at = NOW() WHERE id = ?`,
      [jobId]
    );

    logger.info('RETRY_QUEUE', 'Retry job completed successfully', {
      jobId,
      jobType: job.job_type,
      statusCode: response.status,
    });

  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message;
    const newRetryCount = job.current_retry + 1;

    logger.warn('RETRY_QUEUE', 'Retry job failed', {
      jobId,
      jobType: job.job_type,
      retryCount: newRetryCount,
      error: errorMessage,
    });

    if (newRetryCount >= job.max_retries) {
      // Move to dead letter queue
      await moveToDeadLetterQueue(job, errorMessage);
    } else {
      // Schedule next retry
      const nextDelay = calculateBackoffDelay(newRetryCount);
      const nextRetryAt = new Date(Date.now() + nextDelay);

      await query(
        `UPDATE retry_queue 
         SET status = 'pending', current_retry = ?, next_retry_at = ?, last_error = ?, updated_at = NOW() 
         WHERE id = ?`,
        [newRetryCount, nextRetryAt, errorMessage, jobId]
      );

      logger.info('RETRY_QUEUE', 'Job scheduled for retry', {
        jobId,
        nextRetryAt,
        delayMs: nextDelay,
      });
    }
  }
}

// Move job to dead letter queue
async function moveToDeadLetterQueue(job: RetryJob, finalError: string): Promise<void> {
  const jobId = job.id!;

  try {
    // Insert into dead letter queue
    await query(
      `INSERT INTO dead_letter_queue 
       (original_job_id, job_type, endpoint, method, headers, payload, max_retries, final_error, correlation_id, original_created_at, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        jobId,
        job.job_type,
        job.endpoint,
        job.method,
        typeof job.headers === 'string' ? job.headers : JSON.stringify(job.headers),
        typeof job.payload === 'string' ? job.payload : JSON.stringify(job.payload),
        job.max_retries,
        finalError,
        job.correlation_id || null,
        job.created_at,
      ]
    );

    // Update original job status
    await query(
      `UPDATE retry_queue SET status = 'dead_letter', last_error = ?, updated_at = NOW() WHERE id = ?`,
      [finalError, jobId]
    );

    await logError('DEAD_LETTER_QUEUE', `Job moved to dead letter queue: ${job.job_type}`, finalError);

    logger.error('RETRY_QUEUE', 'Job moved to dead letter queue', {
      jobId,
      jobType: job.job_type,
      finalError,
    });
  } catch (error: any) {
    logger.error('RETRY_QUEUE', 'Failed to move job to dead letter queue', { error: error.message });
  }
}

// Get dead letter queue items
export async function getDeadLetterQueue(limit: number = 50, offset: number = 0): Promise<any[]> {
  return query<any[]>(
    `SELECT * FROM dead_letter_queue ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

// Retry a dead letter item
export async function retryDeadLetterItem(deadLetterId: number): Promise<number> {
  const items = await query<any[]>(
    `SELECT * FROM dead_letter_queue WHERE id = ?`,
    [deadLetterId]
  );

  if (!items.length) {
    throw new Error('Dead letter item not found');
  }

  const item = items[0];

  // Add back to retry queue
  const newJobId = await addToRetryQueue({
    job_type: item.job_type,
    endpoint: item.endpoint,
    method: item.method,
    headers: typeof item.headers === 'string' ? JSON.parse(item.headers) : item.headers,
    payload: typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload,
    max_retries: item.max_retries,
    correlation_id: item.correlation_id,
  });

  // Remove from dead letter queue
  await query(`DELETE FROM dead_letter_queue WHERE id = ?`, [deadLetterId]);

  logger.info('RETRY_QUEUE', 'Dead letter item requeued', { deadLetterId, newJobId });

  return newJobId;
}

// Get retry queue stats
export async function getRetryQueueStats(): Promise<{
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  deadLetter: number;
}> {
  const stats = await query<any[]>(`
    SELECT status, COUNT(*) as count 
    FROM retry_queue 
    GROUP BY status
  `);

  const deadLetterCount = await query<any[]>(`SELECT COUNT(*) as count FROM dead_letter_queue`);

  const result = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    deadLetter: deadLetterCount[0]?.count || 0,
  };

  for (const stat of stats) {
    const status = stat.status as keyof typeof result;
    if (status in result) {
      result[status] = stat.count;
    }
  }

  return result;
}

// HTTP client with automatic retry
export async function httpWithRetry(
  config: {
    jobType: string;
    endpoint: string;
    method: string;
    headers?: Record<string, string>;
    payload?: any;
    maxRetries?: number;
    correlationId?: string;
  }
): Promise<any> {
  try {
    const response = await axios({
      method: config.method as any,
      url: config.endpoint,
      headers: config.headers,
      data: config.payload,
      timeout: 30000,
    });

    return response.data;
  } catch (error: any) {
    // Queue for retry
    await addToRetryQueue({
      job_type: config.jobType,
      endpoint: config.endpoint,
      method: config.method,
      headers: config.headers || {},
      payload: config.payload,
      max_retries: config.maxRetries || 5,
      correlation_id: config.correlationId,
    });

    throw error;
  }
}
