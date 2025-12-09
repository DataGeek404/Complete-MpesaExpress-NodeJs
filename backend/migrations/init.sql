-- M-Pesa Integration Database Schema
-- Run this SQL to create the required tables

CREATE DATABASE IF NOT EXISTS mpesa_db;
USE mpesa_db;

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_type ENUM('STK_PUSH', 'C2B', 'B2C') NOT NULL,
    checkout_request_id VARCHAR(100),
    merchant_request_id VARCHAR(100),
    conversation_id VARCHAR(100),
    originator_conversation_id VARCHAR(100),
    transaction_id VARCHAR(50),
    phone_number VARCHAR(20) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    account_reference VARCHAR(50),
    transaction_desc VARCHAR(100),
    result_code INT,
    result_desc VARCHAR(255),
    status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    raw_request JSON,
    raw_callback JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_checkout_request_id (checkout_request_id),
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_phone_number (phone_number),
    INDEX idx_status (status),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_created_at (created_at)
);

-- Logs table
CREATE TABLE IF NOT EXISTS logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    level ENUM('info', 'warn', 'error', 'debug') NOT NULL,
    category VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_level (level),
    INDEX idx_category (category),
    INDEX idx_created_at (created_at)
);

-- Error events table
CREATE TABLE IF NOT EXISTS error_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    request_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_error_type (error_type),
    INDEX idx_created_at (created_at)
);

-- Token cache table (for persistent token storage)
CREATE TABLE IF NOT EXISTS token_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token_type VARCHAR(50) NOT NULL,
    access_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_token_type (token_type)
);

-- Callback history table (for audit trail)
CREATE TABLE IF NOT EXISTS callback_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    callback_type ENUM('STK', 'C2B_VALIDATION', 'C2B_CONFIRMATION', 'B2C_RESULT', 'B2C_TIMEOUT') NOT NULL,
    raw_payload JSON NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processing_result TEXT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_callback_type (callback_type),
    INDEX idx_processed (processed),
    INDEX idx_created_at (created_at),
    INDEX idx_ip_address (ip_address)
);

-- Callback verification log (security audit)
CREATE TABLE IF NOT EXISTS callback_verification_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    callback_type VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent VARCHAR(500),
    verified BOOLEAN NOT NULL,
    failure_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_callback_type (callback_type),
    INDEX idx_ip_address (ip_address),
    INDEX idx_verified (verified),
    INDEX idx_created_at (created_at)
);

-- Retry queue table
CREATE TABLE IF NOT EXISTS retry_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_type VARCHAR(50) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL,
    headers JSON,
    payload JSON,
    max_retries INT NOT NULL DEFAULT 5,
    current_retry INT NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMP NOT NULL,
    last_error TEXT,
    status ENUM('pending', 'processing', 'completed', 'failed', 'dead_letter') DEFAULT 'pending',
    correlation_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_status (status),
    INDEX idx_next_retry_at (next_retry_at),
    INDEX idx_job_type (job_type),
    INDEX idx_correlation_id (correlation_id),
    INDEX idx_created_at (created_at)
);

-- Dead letter queue table
CREATE TABLE IF NOT EXISTS dead_letter_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    original_job_id INT NOT NULL,
    job_type VARCHAR(50) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL,
    headers JSON,
    payload JSON,
    max_retries INT NOT NULL,
    final_error TEXT,
    correlation_id VARCHAR(100),
    original_created_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_job_type (job_type),
    INDEX idx_correlation_id (correlation_id),
    INDEX idx_created_at (created_at)
);

-- Rate limiting table (optional, for persistent rate limiting)
CREATE TABLE IF NOT EXISTS rate_limits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    request_count INT NOT NULL DEFAULT 1,
    window_start TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_ip_endpoint_window (ip_address, endpoint, window_start),
    INDEX idx_ip_address (ip_address),
    INDEX idx_window_start (window_start)
);

-- API metrics table (for monitoring)
CREATE TABLE IF NOT EXISTS api_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INT NOT NULL,
    response_time_ms INT NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_endpoint (endpoint),
    INDEX idx_status_code (status_code),
    INDEX idx_created_at (created_at)
);
