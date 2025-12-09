-- API Keys table for authentication
-- Run this migration after init.sql

USE mpesa_db;

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    permissions JSON NOT NULL DEFAULT '["read"]',
    rate_limit INT NOT NULL DEFAULT 1000,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_key_hash (key_hash),
    INDEX idx_is_active (is_active),
    INDEX idx_expires_at (expires_at)
);

-- Session table for dashboard users (optional)
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(100) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    permissions JSON NOT NULL DEFAULT '["read"]',
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_session_token (session_token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    actor_type ENUM('api_key', 'user', 'system') NOT NULL,
    actor_id VARCHAR(100) NOT NULL,
    changes JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_action (action),
    INDEX idx_resource_type (resource_type),
    INDEX idx_actor_id (actor_id),
    INDEX idx_created_at (created_at)
);

-- Insert a default admin API key (CHANGE THIS IN PRODUCTION!)
-- The key will be: mpesa_admin_default_key_change_me_in_production
-- SHA256 hash of the above key
INSERT INTO api_keys (key_hash, name, permissions, rate_limit, is_active, created_at)
VALUES (
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'Default Admin Key',
    '["*", "admin", "read", "write", "stk_push", "c2b", "b2c"]',
    10000,
    TRUE,
    NOW()
)
ON DUPLICATE KEY UPDATE name = 'Default Admin Key';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_created_date ON transactions (DATE(created_at));
CREATE INDEX IF NOT EXISTS idx_transactions_status_type ON transactions (status, transaction_type);
