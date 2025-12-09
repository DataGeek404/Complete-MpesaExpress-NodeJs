#!/usr/bin/env node

/**
 * Retry Queue Processor
 * 
 * This script processes the retry queue in the background.
 * Run it as a separate process or cron job:
 * 
 * # Run once
 * node scripts/process-queue.js
 * 
 * # Run continuously every 30 seconds
 * node scripts/process-queue.js --watch
 * 
 * # Run via cron (every minute)
 * * * * * * cd /path/to/backend && node scripts/process-queue.js
 */

const mysql = require('mysql2/promise');
const axios = require('axios');

const INITIAL_DELAY_MS = parseInt(process.env.RETRY_INITIAL_DELAY_MS) || 1000;
const MAX_DELAY_MS = parseInt(process.env.RETRY_MAX_DELAY_MS) || 300000;
const BACKOFF_MULTIPLIER = 2;
const JITTER_FACTOR = 0.1;

async function getPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mpesa_db',
    waitForConnections: true,
    connectionLimit: 5,
  });
}

function calculateBackoffDelay(retryCount) {
  const baseDelay = INITIAL_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, retryCount);
  const cappedDelay = Math.min(baseDelay, MAX_DELAY_MS);
  const jitter = cappedDelay * JITTER_FACTOR * (Math.random() * 2 - 1);
  return Math.floor(cappedDelay + jitter);
}

async function processQueue(pool) {
  const [jobs] = await pool.execute(
    `SELECT * FROM retry_queue 
     WHERE status = 'pending' AND next_retry_at <= NOW() 
     ORDER BY next_retry_at ASC 
     LIMIT 10`
  );

  console.log(`Found ${jobs.length} jobs to process`);

  for (const job of jobs) {
    await processJob(pool, job);
  }
}

async function processJob(pool, job) {
  const jobId = job.id;

  try {
    // Mark as processing
    await pool.execute(
      `UPDATE retry_queue SET status = 'processing', updated_at = NOW() WHERE id = ?`,
      [jobId]
    );

    console.log(`Processing job ${jobId}: ${job.job_type}`);

    // Parse headers and payload if they're strings
    const headers = typeof job.headers === 'string' ? JSON.parse(job.headers) : job.headers;
    const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;

    // Execute the request
    const response = await axios({
      method: job.method,
      url: job.endpoint,
      headers: headers,
      data: payload,
      timeout: 30000,
    });

    // Success - mark as completed
    await pool.execute(
      `UPDATE retry_queue SET status = 'completed', updated_at = NOW() WHERE id = ?`,
      [jobId]
    );

    console.log(`Job ${jobId} completed successfully with status ${response.status}`);

  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    const newRetryCount = job.current_retry + 1;

    console.error(`Job ${jobId} failed (attempt ${newRetryCount}/${job.max_retries}): ${errorMessage}`);

    if (newRetryCount >= job.max_retries) {
      // Move to dead letter queue
      await moveToDeadLetter(pool, job, errorMessage);
    } else {
      // Schedule next retry
      const nextDelay = calculateBackoffDelay(newRetryCount);
      const nextRetryAt = new Date(Date.now() + nextDelay);

      await pool.execute(
        `UPDATE retry_queue 
         SET status = 'pending', current_retry = ?, next_retry_at = ?, last_error = ?, updated_at = NOW() 
         WHERE id = ?`,
        [newRetryCount, nextRetryAt, errorMessage, jobId]
      );

      console.log(`Job ${jobId} scheduled for retry at ${nextRetryAt.toISOString()}`);
    }
  }
}

async function moveToDeadLetter(pool, job, finalError) {
  const jobId = job.id;

  try {
    // Insert into dead letter queue
    await pool.execute(
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
    await pool.execute(
      `UPDATE retry_queue SET status = 'dead_letter', last_error = ?, updated_at = NOW() WHERE id = ?`,
      [finalError, jobId]
    );

    console.log(`Job ${jobId} moved to dead letter queue`);
  } catch (error) {
    console.error(`Failed to move job ${jobId} to dead letter queue:`, error.message);
  }
}

async function main() {
  const watchMode = process.argv.includes('--watch');
  const interval = parseInt(process.argv.find(arg => arg.startsWith('--interval='))?.split('=')[1]) || 30000;

  console.log('M-Pesa Retry Queue Processor');
  console.log('============================');
  console.log(`Mode: ${watchMode ? 'Watch (continuous)' : 'Single run'}`);
  if (watchMode) {
    console.log(`Interval: ${interval}ms`);
  }
  console.log('');

  const pool = await getPool();

  if (watchMode) {
    // Run continuously
    const run = async () => {
      try {
        await processQueue(pool);
      } catch (error) {
        console.error('Queue processing error:', error.message);
      }
      setTimeout(run, interval);
    };
    
    await run();
  } else {
    // Single run
    try {
      await processQueue(pool);
    } catch (error) {
      console.error('Queue processing error:', error.message);
      process.exit(1);
    }
    await pool.end();
    console.log('Done');
  }
}

main().catch(console.error);
