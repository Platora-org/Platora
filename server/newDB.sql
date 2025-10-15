CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  email VARCHAR(100),
  password TEXT,
  phone VARCHAR(20),
  provider VARCHAR(20),
  role VARCHAR(20), -- 'customer' or 'restaurant' or 'admin' or 'delivery'
  google_id VARCHAR(255), -- for Google login
  account_status VARCHAR(20) DEFAULT 'active', -- e.g. 'active', 'suspended', 'deleted'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- customer_profiles
CREATE TABLE customer_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  preferences TEXT,
  address TEXT,
  date_of_birth DATE,
  gender VARCHAR(20) -- e.g. 'male', 'female', 'non-binary', etc.
);


CREATE TABLE deliveryagent (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'inactive'
);


-- restaurant_profiles
CREATE TABLE restaurant_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  restaurant_name VARCHAR(100),
  profile_image_url TEXT,
  cuisine_type VARCHAR(50)
);



-- menu_categories Table
create table menu_categories (
  id serial primary key,
  restaurant_id integer not null references restaurant_profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);


-- menu_items Table
create table menu_items (
  id serial primary key,
  restaurant_id integer not null references restaurant_profiles(id) on delete cascade,
  category_id integer references menu_categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null,
  image_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

--KYC Verification 
CREATE TABLE kyc_requests (
    id SERIAL PRIMARY KEY,
    restaurant_id INT REFERENCES users(id) ON DELETE CASCADE,
    business_reg_doc TEXT NOT NULL,
    nic_doc TEXT NOT NULL,
    bank_account_number VARCHAR(50) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    branch VARCHAR(100) NOT NULL,
    tin_number VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    rejection_reason TEXT,
    reviewed_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(restaurant_id)
);

CREATE INDEX idx_kyc_status ON kyc_requests(status);
CREATE INDEX idx_kyc_restaurant ON kyc_requests(restaurant_id);


-- Create wallets table
CREATE TABLE wallets (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,   -- links to customer/restaurant/admin
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('CUSTOMER','RESTAURANT','ADMIN')),

    currency VARCHAR(10) DEFAULT 'LKR',                   -- preferred currency
    balance_coins NUMERIC DEFAULT 0,                      -- coins (main internal currency)
    balance_money NUMERIC DEFAULT 0,                      -- optional: real money for refunds

    wallet_status VARCHAR(20) DEFAULT 'ACTIVE' 
        CHECK (wallet_status IN ('ACTIVE','SUSPENDED','FROZEN','CLOSED')),

    pin_hash TEXT,
    failed_pin_attempts INT DEFAULT 0,
    last_pin_attempt TIMESTAMP,
    daily_limit NUMERIC DEFAULT 50000,    -- LKR
    monthly_limit NUMERIC DEFAULT 1000000,-- LKR

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Trigger function to auto-update updated_at

CREATE OR REPLACE FUNCTION update_wallets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to wallets table
CREATE TRIGGER trg_update_wallets_updated_at
BEFORE UPDATE ON wallets
FOR EACH ROW
EXECUTE FUNCTION update_wallets_updated_at();


-- Function to auto-create customer wallet
CREATE OR REPLACE FUNCTION create_customer_wallet()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'customer' THEN
        INSERT INTO wallets (user_id, user_type, currency, balance_coins, balance_money)
        VALUES (NEW.id, 'CUSTOMER', 'LKR', 0, 0);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto wallet creation
CREATE TRIGGER trigger_create_customer_wallet
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_customer_wallet();


-- Create audit log table
CREATE TABLE kyc_audit_logs (
    id SERIAL PRIMARY KEY,
    kyc_id INT REFERENCES kyc_requests(id),
    admin_id INT REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- 'APPROVED', 'REJECTED', 'VIEWED'
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_kyc_audit_kyc ON kyc_audit_logs(kyc_id);
CREATE INDEX idx_kyc_audit_admin ON kyc_audit_logs(admin_id);
CREATE INDEX idx_kyc_audit_action ON kyc_audit_logs(action);
CREATE INDEX idx_kyc_audit_created ON kyc_audit_logs(created_at);


CREATE TABLE inventory_items (
    id SERIAL PRIMARY KEY,
    restaurant_id integer not null references restaurant_profiles(id) on delete cascade,
    name VARCHAR(100) NOT NULL CHECK (name ~ '^[A-Za-z0-9 ]+$'), -- no !@#$, only alphanumeric + spaces
    unit TEXT NOT NULL,
    quantity NUMERIC(12,2) NOT NULL DEFAULT 0,  -- allows fractional quantities (e.g., 0.5 kg)
    reorder_level NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE inventory_adjustments (
    id SERIAL PRIMARY KEY,
    restaurant_id integer not null references restaurant_profiles(id) on delete cascade,
    item_id INT REFERENCES inventory_items(id) ON DELETE SET NULL,
    item_name VARCHAR(100),
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('in','out')),
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    reason TEXT,
    created_at TIMESTAMP DEFAULT now()
);


-- Create transactions table
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('PURCHASE','SPEND','REFUND','TRANSFER')),
    amount_coins NUMERIC NOT NULL DEFAULT 0,        -- Can be negative for spending
    amount_money NUMERIC DEFAULT 0,                 -- Real money amount (for purchases)
    currency VARCHAR(10) DEFAULT 'LKR',
    
    -- Description and reference
    description TEXT NOT NULL,
    reference_id VARCHAR(100),                      -- External reference (Stripe payment ID, order ID, etc.)
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','COMPLETED','FAILED','CANCELLED')),
    
    -- Additional data (JSON format)
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created ON transactions(created_at);
CREATE INDEX idx_transactions_reference ON transactions(reference_id);

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_transactions_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_transactions_updated_at();

-- Add foreign exchange rates table for real-time currency conversion
CREATE TABLE exchange_rates (
    id SERIAL PRIMARY KEY,
    base_currency VARCHAR(10) NOT NULL DEFAULT 'LKR',
    target_currency VARCHAR(10) NOT NULL,
    rate NUMERIC(12,8) NOT NULL,
    source VARCHAR(50) DEFAULT 'manual',
    valid_from TIMESTAMP DEFAULT NOW(),
    valid_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(base_currency, target_currency, valid_from)
);

CREATE INDEX idx_exchange_rates_currencies ON exchange_rates(base_currency, target_currency);
CREATE INDEX idx_exchange_rates_valid ON exchange_rates(valid_from, valid_until);

-- Insert initial exchange rates (you can update these via API later)
INSERT INTO exchange_rates (base_currency, target_currency, rate) VALUES
('LKR', 'LKR', 1.0000),
('LKR', 'USD', 0.0031),
('LKR', 'EUR', 0.0028),
('LKR', 'GBP', 0.0024),
('LKR', 'AUD', 0.0047),
('LKR', 'JPY', 0.46);

-- Add constraint to transactions table
ALTER TABLE transactions ADD CONSTRAINT check_amount_coins_not_zero 
    CHECK (amount_coins != 0);


-- Add Stripe customer ID to users table
ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);

-- Add payment_intents table to track Stripe payment intents
CREATE TABLE payment_intents (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_payment_intent_id VARCHAR(255) NOT NULL UNIQUE,
    amount_coins INT NOT NULL,
    amount_money NUMERIC NOT NULL,
    currency VARCHAR(10) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'requires_capture', 'canceled', 'succeeded'
    client_secret TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

CREATE INDEX idx_payment_intents_user ON payment_intents(user_id);
CREATE INDEX idx_payment_intents_stripe_id ON payment_intents(stripe_payment_intent_id);
CREATE INDEX idx_payment_intents_status ON payment_intents(status);
CREATE INDEX idx_payment_intents_created ON payment_intents(created_at);

-- Trigger for payment_intents updated_at
CREATE OR REPLACE FUNCTION update_payment_intents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_payment_intents_updated_at
BEFORE UPDATE ON payment_intents
FOR EACH ROW
EXECUTE FUNCTION update_payment_intents_updated_at();

-- Add webhook_events table to track Stripe webhook deliveries
CREATE TABLE webhook_events (
    id SERIAL PRIMARY KEY,
    stripe_event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

CREATE INDEX idx_webhook_events_stripe_id ON webhook_events(stripe_event_id);
CREATE INDEX idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX idx_webhook_events_created ON webhook_events(created_at);

-- Update transactions table to include Stripe-specific fields
ALTER TABLE transactions ADD COLUMN stripe_payment_intent_id VARCHAR(255);
ALTER TABLE transactions ADD COLUMN payment_method VARCHAR(50); -- 'stripe', 'manual', 'refund', etc.
CREATE INDEX idx_transactions_stripe_payment_intent ON transactions(stripe_payment_intent_id);
CREATE INDEX idx_transactions_payment_method ON transactions(payment_method);

-- Add constraints to ensure data integrity
ALTER TABLE transactions ADD CONSTRAINT check_stripe_payment_intent_format 
    CHECK (stripe_payment_intent_id IS NULL OR stripe_payment_intent_id LIKE 'pi_%');

ALTER TABLE payment_intents ADD CONSTRAINT check_stripe_payment_intent_id_format 
    CHECK (stripe_payment_intent_id LIKE 'pi_%');

-- Add function to automatically create payment intent records
CREATE OR REPLACE FUNCTION log_stripe_payment_intent()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if this is a Stripe transaction with a payment intent ID
    IF NEW.payment_method = 'stripe' AND NEW.stripe_payment_intent_id IS NOT NULL THEN
        INSERT INTO payment_intents (
            user_id,
            stripe_payment_intent_id,
            amount_coins,
            amount_money,
            currency,
            status,
            processed_at,
            metadata
        )
        VALUES (
            NEW.user_id,
            NEW.stripe_payment_intent_id,
            NEW.amount_coins,
            NEW.amount_money,
            NEW.currency,
            CASE WHEN NEW.status = 'COMPLETED' THEN 'succeeded' ELSE 'processing' END,
            CASE WHEN NEW.status = 'COMPLETED' THEN NOW() ELSE NULL END,
            NEW.metadata
        )
        ON CONFLICT (stripe_payment_intent_id) DO UPDATE SET
            status = CASE WHEN NEW.status = 'COMPLETED' THEN 'succeeded' ELSE 'processing' END,
            processed_at = CASE WHEN NEW.status = 'COMPLETED' THEN NOW() ELSE payment_intents.processed_at END,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically log payment intents
CREATE TRIGGER trg_log_stripe_payment_intent
AFTER INSERT OR UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION log_stripe_payment_intent();

-- Add wallet limits for better financial control
CREATE TABLE wallet_spending_limits (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    period VARCHAR(20) NOT NULL CHECK (period IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')),
    limit_amount NUMERIC NOT NULL,
    currency VARCHAR(10) DEFAULT 'LKR',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, period, currency)
);

CREATE INDEX idx_wallet_limits_user ON wallet_spending_limits(user_id);
CREATE INDEX idx_wallet_limits_period ON wallet_spending_limits(period);
CREATE INDEX idx_wallet_limits_active ON wallet_spending_limits(is_active);

-- Insert default spending limits for existing users
INSERT INTO wallet_spending_limits (user_id, period, limit_amount, currency)
SELECT 
    id as user_id,
    'DAILY' as period,
    50000 as limit_amount, -- 50,000 LKR daily limit
    'LKR' as currency
FROM users 
WHERE role IN ('customer', 'restaurant')
ON CONFLICT (user_id, period, currency) DO NOTHING;

INSERT INTO wallet_spending_limits (user_id, period, limit_amount, currency)
SELECT 
    id as user_id,
    'MONTHLY' as period,
    1000000 as limit_amount, -- 1,000,000 LKR monthly limit
    'LKR' as currency
FROM users 
WHERE role IN ('customer', 'restaurant')
ON CONFLICT (user_id, period, currency) DO NOTHING;

-- Add function to check spending limits
CREATE OR REPLACE FUNCTION check_spending_limits(
    p_user_id INT,
    p_amount NUMERIC,
    p_currency VARCHAR DEFAULT 'LKR'
) RETURNS TABLE (
    period VARCHAR,
    limit_amount NUMERIC,
    current_spent NUMERIC,
    remaining NUMERIC,
    exceeded BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wsl.period,
        wsl.limit_amount,
        COALESCE(spent.total, 0) as current_spent,
        (wsl.limit_amount - COALESCE(spent.total, 0) - p_amount) as remaining,
        ((COALESCE(spent.total, 0) + p_amount) > wsl.limit_amount) as exceeded
    FROM wallet_spending_limits wsl
    LEFT JOIN (
        SELECT 
            wsl2.period,
            SUM(t.amount_money) as total
        FROM wallet_spending_limits wsl2
        LEFT JOIN transactions t ON (
            t.user_id = p_user_id 
            AND t.transaction_type = 'PURCHASE'
            AND t.status = 'COMPLETED'
            AND t.currency = p_currency
            AND (
                (wsl2.period = 'DAILY' AND DATE(t.created_at) = CURRENT_DATE) OR
                (wsl2.period = 'WEEKLY' AND t.created_at >= DATE_TRUNC('week', CURRENT_DATE)) OR
                (wsl2.period = 'MONTHLY' AND t.created_at >= DATE_TRUNC('month', CURRENT_DATE)) OR
                (wsl2.period = 'YEARLY' AND t.created_at >= DATE_TRUNC('year', CURRENT_DATE))
            )
        )
        WHERE wsl2.user_id = p_user_id 
            AND wsl2.currency = p_currency
            AND wsl2.is_active = TRUE
        GROUP BY wsl2.period
    ) spent ON spent.period = wsl.period
    WHERE wsl.user_id = p_user_id 
        AND wsl.currency = p_currency
        AND wsl.is_active = TRUE
    ORDER BY 
        CASE wsl.period 
            WHEN 'DAILY' THEN 1 
            WHEN 'WEEKLY' THEN 2 
            WHEN 'MONTHLY' THEN 3 
            WHEN 'YEARLY' THEN 4 
        END;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status_type ON transactions(status, transaction_type);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);

-- Add security_logs table for comprehensive audit logging
CREATE TABLE IF NOT EXISTS security_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_action ON security_logs(action);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_security_logs_ip_address ON security_logs(ip_address);

-- Add rate_limit_logs table for tracking API rate limiting
CREATE TABLE IF NOT EXISTS rate_limit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    attempts INT DEFAULT 1,
    window_start TIMESTAMP DEFAULT NOW(),
    blocked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_user_ip ON rate_limit_logs(user_id, ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_endpoint ON rate_limit_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_window ON rate_limit_logs(window_start);

-- Add wallet_settings table for user-specific wallet configurations
CREATE TABLE IF NOT EXISTS wallet_settings (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    daily_spend_limit NUMERIC DEFAULT 10000,
    monthly_spend_limit NUMERIC DEFAULT 300000,
    require_pin_for_spending BOOLEAN DEFAULT TRUE,
    require_pin_amount_threshold NUMERIC DEFAULT 1000,
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    spending_alerts BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_settings_user_id ON wallet_settings(user_id);

-- Add transaction_disputes table for handling payment disputes
CREATE TABLE IF NOT EXISTS transaction_disputes (
    id SERIAL PRIMARY KEY,
    transaction_id INT REFERENCES transactions(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    dispute_type VARCHAR(50) NOT NULL, -- 'chargeback', 'refund_request', 'unauthorized', 'fraud'
    status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'INVESTIGATING', 'RESOLVED', 'REJECTED'
    amount_disputed NUMERIC NOT NULL,
    reason TEXT NOT NULL,
    evidence JSONB DEFAULT '{}',
    admin_notes TEXT,
    resolved_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transaction_disputes_transaction_id ON transaction_disputes(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_disputes_user_id ON transaction_disputes(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_disputes_status ON transaction_disputes(status);
CREATE INDEX IF NOT EXISTS idx_transaction_disputes_type ON transaction_disputes(dispute_type);

-- Add failed_login_attempts table for enhanced security tracking
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255),
    ip_address INET NOT NULL,
    attempt_time TIMESTAMP DEFAULT NOW(),
    user_agent TEXT,
    reason VARCHAR(100) -- 'invalid_password', 'account_locked', 'invalid_email'
);

CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_email ON failed_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_ip ON failed_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_time ON failed_login_attempts(attempt_time);

-- Add wallet_backup_codes table for recovery options
CREATE TABLE IF NOT EXISTS wallet_backup_codes (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    backup_code_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    used_at TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '90 days')
);

CREATE INDEX IF NOT EXISTS idx_wallet_backup_codes_user_id ON wallet_backup_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_backup_codes_expires ON wallet_backup_codes(expires_at);

-- Enhanced exchange_rates table with better tracking
ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS last_updated_by INT REFERENCES users(id);
ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS update_source VARCHAR(100) DEFAULT 'manual';
ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3,2) DEFAULT 1.0;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_exchange_rates_last_updated ON exchange_rates(valid_from DESC);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_source ON exchange_rates(update_source);

-- Enhanced transactions table with additional security fields
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS risk_score NUMERIC(3,2) DEFAULT 0.0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS verification_method VARCHAR(50);

-- Add indexes for new transaction fields
CREATE INDEX IF NOT EXISTS idx_transactions_ip_address ON transactions(ip_address);
CREATE INDEX IF NOT EXISTS idx_transactions_risk_score ON transactions(risk_score);
CREATE INDEX IF NOT EXISTS idx_transactions_verified ON transactions(verified_at);

-- Enhanced wallets table with additional security features
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP DEFAULT NOW();
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS last_ip_address INET;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS pin_created_at TIMESTAMP;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS pin_expires_at TIMESTAMP;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS security_level VARCHAR(20) DEFAULT 'STANDARD';
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS backup_email VARCHAR(255);

-- Add indexes for new wallet fields
CREATE INDEX IF NOT EXISTS idx_wallets_last_activity ON wallets(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_wallets_security_level ON wallets(security_level);
CREATE INDEX IF NOT EXISTS idx_wallets_2fa_enabled ON wallets(two_factor_enabled);

-- Add notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    push_enabled BOOLEAN DEFAULT TRUE,
    transaction_alerts BOOLEAN DEFAULT TRUE,
    security_alerts BOOLEAN DEFAULT TRUE,
    promotional_emails BOOLEAN DEFAULT TRUE,
    weekly_summary BOOLEAN DEFAULT TRUE,
    spending_limit_alerts BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Add device_sessions table for tracking user devices
CREATE TABLE IF NOT EXISTS device_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    device_type VARCHAR(50), -- 'mobile', 'desktop', 'tablet'
    browser VARCHAR(100),
    os VARCHAR(100),
    ip_address INET,
    session_token_hash TEXT,
    last_activity TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days'),
    is_trusted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_device_sessions_user_id ON device_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_device_id ON device_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_expires ON device_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_device_sessions_token ON device_sessions(session_token_hash);

-- Add wallet_limits_history table to track limit changes
CREATE TABLE IF NOT EXISTS wallet_limits_history (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    old_daily_limit NUMERIC,
    new_daily_limit NUMERIC,
    old_monthly_limit NUMERIC,
    new_monthly_limit NUMERIC,
    changed_by INT REFERENCES users(id),
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_limits_history_user_id ON wallet_limits_history(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_limits_history_changed_by ON wallet_limits_history(changed_by);

-- Add comprehensive spending analytics view
CREATE OR REPLACE VIEW wallet_analytics AS
SELECT 
    w.user_id,
    w.balance_coins,
    w.balance_money,
    w.wallet_status,
    w.created_at as wallet_created,
    COUNT(t.id) as total_transactions,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'PURCHASE' AND t.status = 'COMPLETED' THEN t.amount_coins ELSE 0 END), 0) as total_purchased,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'SPEND' AND t.status = 'COMPLETED' THEN ABS(t.amount_coins) ELSE 0 END), 0) as total_spent,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'REFUND' AND t.status = 'COMPLETED' THEN t.amount_coins ELSE 0 END), 0) as total_refunded,
    COALESCE(AVG(CASE WHEN t.transaction_type = 'SPEND' AND t.status = 'COMPLETED' THEN ABS(t.amount_coins) END), 0) as avg_spend_amount,
    COUNT(CASE WHEN t.transaction_type = 'SPEND' AND t.status = 'COMPLETED' AND t.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as monthly_transactions,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'SPEND' AND t.status = 'COMPLETED' AND t.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN ABS(t.amount_coins) ELSE 0 END), 0) as monthly_spent
FROM wallets w
LEFT JOIN transactions t ON w.user_id = t.user_id
GROUP BY w.user_id, w.balance_coins, w.balance_money, w.wallet_status, w.created_at;

-- Add security metrics view
CREATE OR REPLACE VIEW security_metrics AS
SELECT 
    w.user_id,
    w.wallet_status,
    w.failed_pin_attempts,
    w.last_pin_attempt,
    w.pin_hash IS NOT NULL as has_pin,
    w.two_factor_enabled,
    w.security_level,
    COUNT(sl.id) as total_security_events,
    COUNT(CASE WHEN sl.action = 'PIN_FAILED' AND sl.created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as recent_failed_pins,
    COUNT(CASE WHEN sl.action LIKE '%SUSPICIOUS%' THEN 1 END) as suspicious_activities,
    MAX(sl.created_at) as last_security_event
FROM wallets w
LEFT JOIN security_logs sl ON w.user_id = sl.user_id
GROUP BY w.user_id, w.wallet_status, w.failed_pin_attempts, w.last_pin_attempt, w.pin_hash, w.two_factor_enabled, w.security_level;

-- Add constraints to ensure positive balances (fixed: remove IF NOT EXISTS)
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS check_positive_balance;
ALTER TABLE wallets ADD CONSTRAINT check_positive_balance 
    CHECK (balance_coins >= 0 AND balance_money >= 0);

-- Add constraint for valid wallet status (fixed: remove IF NOT EXISTS)
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS check_valid_wallet_status;
ALTER TABLE wallets ADD CONSTRAINT check_valid_wallet_status 
    CHECK (wallet_status IN ('ACTIVE', 'SUSPENDED', 'FROZEN', 'CLOSED'));

-- Add constraint for valid security level (fixed: remove IF NOT EXISTS)
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS check_valid_security_level;
ALTER TABLE wallets ADD CONSTRAINT check_valid_security_level 
    CHECK (security_level IN ('BASIC', 'STANDARD', 'ENHANCED', 'PREMIUM'));

-- Create index for better transaction querying
CREATE INDEX IF NOT EXISTS idx_transactions_user_type_status ON transactions(user_id, transaction_type, status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_date ON transactions(DATE(created_at));

-- Create partial indexes for active wallets
CREATE INDEX IF NOT EXISTS idx_wallets_active ON wallets(user_id) WHERE wallet_status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_transactions_completed ON transactions(user_id, created_at) WHERE status = 'COMPLETED';

-- ===============================
-- FUNCTIONS
-- ===============================

-- Function for wallet_settings updated_at
CREATE OR REPLACE FUNCTION update_wallet_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for transaction_disputes updated_at
CREATE OR REPLACE FUNCTION update_transaction_disputes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update wallet last activity
CREATE OR REPLACE FUNCTION update_wallet_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE wallets 
    SET last_activity_at = NOW() 
    WHERE user_id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for notification_preferences updated_at
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log wallet limit changes
CREATE OR REPLACE FUNCTION log_wallet_limit_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.daily_limit IS DISTINCT FROM NEW.daily_limit OR OLD.monthly_limit IS DISTINCT FROM NEW.monthly_limit THEN
        INSERT INTO wallet_limits_history (
            user_id, old_daily_limit, new_daily_limit, 
            old_monthly_limit, new_monthly_limit, created_at
        )
        VALUES (
            NEW.user_id, OLD.daily_limit, NEW.daily_limit,
            OLD.monthly_limit, NEW.monthly_limit, NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old logs
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Clean up security logs older than 1 year
    DELETE FROM security_logs WHERE created_at < NOW() - INTERVAL '1 year';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up failed login attempts older than 30 days
    DELETE FROM failed_login_attempts WHERE attempt_time < NOW() - INTERVAL '30 days';
    
    -- Clean up expired device sessions
    DELETE FROM device_sessions WHERE expires_at < NOW();
    
    -- Clean up old rate limit logs
    DELETE FROM rate_limit_logs WHERE created_at < NOW() - INTERVAL '7 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate risk score for transactions
CREATE OR REPLACE FUNCTION calculate_transaction_risk_score(
    p_user_id INT,
    p_amount NUMERIC,
    p_ip_address INET,
    p_transaction_type VARCHAR
) RETURNS NUMERIC AS $$
DECLARE
    risk_score NUMERIC := 0.0;
    user_avg_amount NUMERIC;
    recent_transaction_count INT;
    ip_transaction_count INT;
BEGIN
    -- Base risk score
    risk_score := 0.1;
    
    -- Check amount vs user's average
    SELECT AVG(ABS(amount_coins)) INTO user_avg_amount 
    FROM transactions 
    WHERE user_id = p_user_id 
      AND status = 'COMPLETED' 
      AND created_at >= NOW() - INTERVAL '90 days';
    
    IF user_avg_amount IS NOT NULL AND p_amount > (user_avg_amount * 3) THEN
        risk_score := risk_score + 0.3;
    END IF;
    
    -- Check for high frequency transactions
    SELECT COUNT(*) INTO recent_transaction_count
    FROM transactions 
    WHERE user_id = p_user_id 
      AND created_at >= NOW() - INTERVAL '1 hour';
    
    IF recent_transaction_count > 5 THEN
        risk_score := risk_score + 0.2;
    END IF;
    
    -- Check IP address history
    SELECT COUNT(DISTINCT user_id) INTO ip_transaction_count
    FROM transactions 
    WHERE ip_address = p_ip_address 
      AND created_at >= NOW() - INTERVAL '24 hours';
    
    IF ip_transaction_count > 3 THEN
        risk_score := risk_score + 0.4;
    END IF;
    
    -- Cap at 1.0
    IF risk_score > 1.0 THEN
        risk_score := 1.0;
    END IF;
    
    RETURN risk_score;
END;
$$ LANGUAGE plpgsql;

-- Function for automatic wallet creation for new customers
CREATE OR REPLACE FUNCTION create_customer_wallet_and_settings()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'customer' THEN
        -- Create wallet
        INSERT INTO wallets (user_id, user_type, currency, balance_coins, balance_money)
        VALUES (NEW.id, 'CUSTOMER', 'LKR', 0, 0);
        
        -- Create wallet settings
        INSERT INTO wallet_settings (user_id)
        VALUES (NEW.id);
        
        -- Create notification preferences
        INSERT INTO notification_preferences (user_id)
        VALUES (NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- TRIGGERS
-- ===============================

-- Drop existing triggers first
DROP TRIGGER IF EXISTS trg_update_wallet_settings_updated_at ON wallet_settings;
DROP TRIGGER IF EXISTS trg_update_transaction_disputes_updated_at ON transaction_disputes;
DROP TRIGGER IF EXISTS trg_update_wallet_activity ON transactions;
DROP TRIGGER IF EXISTS trg_update_notification_preferences_updated_at ON notification_preferences;
DROP TRIGGER IF EXISTS trg_log_wallet_limit_changes ON wallets;
DROP TRIGGER IF EXISTS trigger_create_customer_wallet ON users;
DROP TRIGGER IF EXISTS trigger_create_customer_wallet_and_settings ON users;
DROP TRIGGER IF EXISTS trg_update_wallets_updated_at ON wallets;
DROP TRIGGER IF EXISTS trg_update_transactions_updated_at ON transactions;
DROP TRIGGER IF EXISTS trg_update_payment_intents_updated_at ON payment_intents;

-- Create triggers
CREATE TRIGGER trg_update_wallet_settings_updated_at
BEFORE UPDATE ON wallet_settings
FOR EACH ROW
EXECUTE FUNCTION update_wallet_settings_updated_at();

CREATE TRIGGER trg_update_transaction_disputes_updated_at
BEFORE UPDATE ON transaction_disputes
FOR EACH ROW
EXECUTE FUNCTION update_transaction_disputes_updated_at();

CREATE TRIGGER trg_update_wallet_activity
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_wallet_last_activity();

CREATE TRIGGER trg_update_notification_preferences_updated_at
BEFORE UPDATE ON notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_notification_preferences_updated_at();

CREATE TRIGGER trg_log_wallet_limit_changes
AFTER UPDATE ON wallets
FOR EACH ROW
EXECUTE FUNCTION log_wallet_limit_changes();

CREATE TRIGGER trigger_create_customer_wallet_and_settings
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_customer_wallet_and_settings();

-- Optional: Add updated_at triggers for main tables if needed
CREATE TRIGGER trg_update_wallets_updated_at
BEFORE UPDATE ON wallets
FOR EACH ROW
EXECUTE FUNCTION update_wallets_updated_at();

CREATE TRIGGER trg_update_transactions_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_transactions_updated_at();

ALTER TABLE transactions ADD COLUMN processed_at TIMESTAMP;

-- 1. First create payout_history (no dependencies on other new tables)
CREATE TABLE payout_history (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurant_profiles(id),
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  total_coins INTEGER NOT NULL,
  amount_lkr DECIMAL(12,2) NOT NULL,
  bank_account VARCHAR(100),
  bank_name VARCHAR(100),
  payout_date TIMESTAMP,
  proof_url TEXT,
  processed_by INTEGER REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Then create restaurant_earnings (references payout_history)
CREATE TABLE restaurant_earnings (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurant_profiles(id),
  transaction_id INTEGER NOT NULL REFERENCES transactions(id),
  order_id INTEGER,
  reservation_id INTEGER,
  gross_coins INTEGER NOT NULL,
  commission_coins INTEGER NOT NULL,
  net_coins INTEGER NOT NULL,
  payout_status VARCHAR(20) DEFAULT 'pending',
  payout_id INTEGER REFERENCES payout_history(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Finally create platform_revenue
CREATE TABLE platform_revenue (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id),
  restaurant_id INTEGER NOT NULL REFERENCES restaurant_profiles(id),
  commission_coins INTEGER NOT NULL,
  commission_percentage DECIMAL(5,2) DEFAULT 5.00,
  settled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Add indexes for performance
CREATE INDEX idx_restaurant_earnings_restaurant ON restaurant_earnings(restaurant_id);
CREATE INDEX idx_restaurant_earnings_payout_status ON restaurant_earnings(payout_status);
CREATE INDEX idx_platform_revenue_restaurant ON platform_revenue(restaurant_id);
CREATE INDEX idx_payout_history_restaurant ON payout_history(restaurant_id);
CREATE INDEX idx_payout_history_period ON payout_history(period_year, period_month);
-------------------------------------------------------------------------------------------------------    

-- food_court_table Table
CREATE TABLE IF NOT EXISTS food_court_table (
  id          SERIAL PRIMARY KEY,
  table_code  TEXT UNIQUE NOT NULL,
  capacity    INTEGER NOT NULL,
  price      INTEGER NOT NULL,
  pos_x       INTEGER DEFAULT 40,
  pos_y       INTEGER DEFAULT 40,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);


  

-- Time slots master
CREATE TABLE IF NOT EXISTS reservation_time_slots (
  id       SERIAL PRIMARY KEY,
  label    TEXT NOT NULL UNIQUE,   -- e.g. '10:00 AM - 12:00 PM'
  sort_idx INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE reservation_time_slots
  ADD COLUMN IF NOT EXISTS start_time TIME;

-- Blackout header: either full day or some slots
CREATE TABLE IF NOT EXISTS reservation_blackouts (
  id         SERIAL PRIMARY KEY,
  date       DATE NOT NULL UNIQUE,     -- one row per date (unique so we can upsert)
  full_day   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Blacked-out slots for partial-day blackouts
CREATE TABLE IF NOT EXISTS reservation_blackout_slots (
  id           SERIAL PRIMARY KEY,  
  blackout_id  INTEGER NOT NULL REFERENCES reservation_blackouts(id) ON DELETE CASCADE,
  slot_id      INTEGER NOT NULL REFERENCES reservation_time_slots(id) ON DELETE CASCADE,
  CONSTRAINT reservation_blackout_slots_unique UNIQUE (blackout_id, slot_id)
);



CREATE TABLE reservations (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reserved_date    DATE NOT NULL,
  slot_id          INTEGER NOT NULL REFERENCES reservation_time_slots(id) ON DELETE RESTRICT,
  guests           INTEGER NOT NULL CHECK (guests > 0),
  special_request  TEXT,
  status           TEXT NOT NULL DEFAULT 'booked',
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reservations ADD COLUMN stored_tables JSONB;

-- === BOOKED TABLES ===
CREATE TABLE IF NOT EXISTS reservation_tables (
  id               BIGSERIAL PRIMARY KEY,
  reservation_id   INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  table_id         INTEGER NOT NULL REFERENCES food_court_table(id) ON DELETE RESTRICT,
  reserved_date    DATE    NOT NULL,
  slot_id          INTEGER NOT NULL REFERENCES reservation_time_slots(id) ON DELETE RESTRICT
);



UPDATE reservation_time_slots SET start_time = TIME '10:00' WHERE label ILIKE '%10:00 AM%';
UPDATE reservation_time_slots SET start_time = TIME '12:30' WHERE label ILIKE '%12:30 PM%';
UPDATE reservation_time_slots SET start_time = TIME '15:00' WHERE label ILIKE '%3:00 PM%';
UPDATE reservation_time_slots SET start_time = TIME '17:30' WHERE label ILIKE '%5:30 PM%';
UPDATE reservation_time_slots SET start_time = TIME '18:00' WHERE label ILIKE '%6:00 PM%';


 



CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    menu_item_id INT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    inventory_item_id INT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    quantity_required DECIMAL(10,2) NOT NULL CHECK (quantity_required > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (menu_item_id, inventory_item_id) -- prevent duplicate ingredient per recipe
);

--orders table
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customer_profiles(id) ON DELETE CASCADE,
  type VARCHAR(20) DEFAULT 'pickup',  -- pickup or delivery
  status VARCHAR(20) DEFAULT 'pending',  -- pending, completed, cancelled
  total_amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE restaurant_orders (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  restaurant_id INTEGER REFERENCES restaurant_profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, denied, preparing, ready, delivered
  subtotal NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  restaurant_order_id INTEGER REFERENCES restaurant_orders(id) ON DELETE CASCADE,
  menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price NUMERIC(10,2) NOT NULL, -- store price at the time of order
  created_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    order_id INT,
    sender VARCHAR(50) NOT NULL,
    recipient VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- carts table
CREATE TABLE carts (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customer_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- cart_items table
CREATE TABLE cart_items (
  id SERIAL PRIMARY KEY,
  cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT cart_item_unique UNIQUE (cart_id, menu_item_id) -- ✅ correct uniqueness
);


CREATE TABLE password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create refunds table with INTEGER IDs
CREATE TABLE IF NOT EXISTS refunds (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id),
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  reservation_id INTEGER REFERENCES reservations(id) ON DELETE CASCADE,
  restaurant_id INTEGER REFERENCES restaurant_profiles(id) ON DELETE SET NULL,
  refund_amount_coins DECIMAL(15, 2) NOT NULL CHECK (refund_amount_coins > 0),
  refund_reason TEXT NOT NULL,
  refund_type VARCHAR(50) NOT NULL CHECK (refund_type IN ('ORDER_CANCEL', 'ORDER_REJECT', 'RESERVATION_CANCEL')),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  metadata JSONB DEFAULT '{}',
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure either order_id or reservation_id is present
  CONSTRAINT check_reference CHECK (
    (order_id IS NOT NULL AND reservation_id IS NULL) OR
    (order_id IS NULL AND reservation_id IS NOT NULL)
  )
);

-- Create indexes for better query performance
CREATE INDEX idx_refunds_user_id ON refunds(user_id);
CREATE INDEX idx_refunds_transaction_id ON refunds(transaction_id);
CREATE INDEX idx_refunds_order_id ON refunds(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_refunds_reservation_id ON refunds(reservation_id) WHERE reservation_id IS NOT NULL;
CREATE INDEX idx_refunds_restaurant_id ON refunds(restaurant_id) WHERE restaurant_id IS NOT NULL;
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_refunds_created_at ON refunds(created_at DESC);
CREATE INDEX idx_refunds_refund_type ON refunds(refund_type);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_refunds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_refunds_updated_at
  BEFORE UPDATE ON refunds
  FOR EACH ROW
  EXECUTE FUNCTION update_refunds_updated_at();

-- Add comment to table
COMMENT ON TABLE refunds IS 'Stores refund records for cancelled orders and reservations';
COMMENT ON COLUMN refunds.refund_type IS 'ORDER_CANCEL: Customer cancelled order before preparing, ORDER_REJECT: Restaurant rejected order, RESERVATION_CANCEL: Customer cancelled reservation >24hrs before';
COMMENT ON COLUMN refunds.status IS 'PENDING: Refund initiated, COMPLETED: Coins refunded, FAILED: Refund failed, CANCELLED: Refund cancelled';

-- Add refund tracking columns to restaurant_earnings only
ALTER TABLE restaurant_earnings
ADD COLUMN IF NOT EXISTS refund_id INTEGER,
ADD COLUMN IF NOT EXISTS is_reversed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS original_earning_id INTEGER;

-- Add foreign key constraints after columns are created
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'restaurant_earnings_refund_id_fkey'
  ) THEN
    ALTER TABLE restaurant_earnings 
    ADD CONSTRAINT restaurant_earnings_refund_id_fkey 
    FOREIGN KEY (refund_id) REFERENCES refunds(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'restaurant_earnings_original_earning_id_fkey'
  ) THEN
    ALTER TABLE restaurant_earnings 
    ADD CONSTRAINT restaurant_earnings_original_earning_id_fkey 
    FOREIGN KEY (original_earning_id) REFERENCES restaurant_earnings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes for restaurant_earnings refund tracking
CREATE INDEX IF NOT EXISTS idx_restaurant_earnings_refund_id 
  ON restaurant_earnings(refund_id) WHERE refund_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_restaurant_earnings_is_reversed 
  ON restaurant_earnings(is_reversed) WHERE is_reversed = true;

-- Add comments for restaurant_earnings
COMMENT ON COLUMN restaurant_earnings.refund_id IS 'Links to refund if this is a reversal entry';
COMMENT ON COLUMN restaurant_earnings.is_reversed IS 'True if this is a reversal/refund entry (negative values)';
COMMENT ON COLUMN restaurant_earnings.original_earning_id IS 'References the original earning record that is being reversed';

-- Check current constraint
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name='refunds' AND kcu.column_name='order_id';

-- If it's pointing to wrong table, drop and recreate:
ALTER TABLE refunds DROP CONSTRAINT refunds_order_id_fkey;

-- Add correct constraint pointing to restaurant_orders
ALTER TABLE refunds 
ADD CONSTRAINT refunds_order_id_fkey 
FOREIGN KEY (order_id) 
REFERENCES restaurant_orders(id);

-- Create new function for order_items trigger
CREATE OR REPLACE FUNCTION update_transaction_reference_for_order_items()
RETURNS TRIGGER AS $$
DECLARE
  order_user_id INTEGER;
  order_created_at TIMESTAMP;
BEGIN
  -- Get the user_id and creation time from the restaurant_order
  SELECT cp.user_id, o.created_at
  INTO order_user_id, order_created_at
  FROM restaurant_orders ro
  JOIN orders o ON ro.order_id = o.id
  JOIN customer_profiles cp ON o.customer_id = cp.id
  WHERE ro.id = NEW.restaurant_order_id;
  
  -- Update transaction that matches this specific menu_item
  UPDATE transactions t
  SET 
    reference_id = NEW.restaurant_order_id::TEXT,
    metadata = jsonb_set(
      jsonb_set(
        COALESCE(t.metadata, '{}'::jsonb),
        '{restaurant_order_id}',
        to_jsonb(NEW.restaurant_order_id)
      ),
      '{original_menu_item_id}',
      to_jsonb(t.reference_id::INTEGER)
    ),
    updated_at = NOW()
  WHERE t.reference_id = NEW.menu_item_id::TEXT
    AND t.user_id = order_user_id
    AND t.transaction_type = 'SPEND'
    AND t.status = 'COMPLETED'
    AND t.created_at >= (order_created_at - INTERVAL '3 minutes')
    AND t.created_at <= (order_created_at + INTERVAL '3 minutes')
    AND t.metadata->>'restaurant_order_id' IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger on order_items table
CREATE TRIGGER trigger_update_transaction_reference_items
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_transaction_reference_for_order_items();

-- Verify new trigger created
SELECT tgname, tgrelid::regclass as table_name, tgenabled
FROM pg_trigger 
WHERE tgname = 'trigger_update_transaction_reference_items';

-- ============================================
-- STEP 3: FIX EXISTING DATA (One-time update)
-- ============================================

-- Update all existing transactions
UPDATE transactions t
SET 
  reference_id = oi.restaurant_order_id::TEXT,
  metadata = jsonb_set(
    jsonb_set(
      COALESCE(t.metadata, '{}'::jsonb),
      '{restaurant_order_id}',
      to_jsonb(oi.restaurant_order_id)
    ),
    '{original_menu_item_id}',
    to_jsonb(t.reference_id::INTEGER)
  ),
  updated_at = NOW()
FROM order_items oi
JOIN restaurant_orders ro ON oi.restaurant_order_id = ro.id
JOIN orders o ON ro.order_id = o.id
JOIN customer_profiles cp ON o.customer_id = cp.id
WHERE t.reference_id = oi.menu_item_id::TEXT
  AND t.user_id = cp.user_id
  AND t.transaction_type = 'SPEND'
  AND t.status = 'COMPLETED'
  AND t.metadata->>'restaurant_order_id' IS NULL;

-- ============================================
-- STEP 4: VERIFY EVERYTHING WORKS
-- ============================================

-- Check how many transactions were updated
SELECT COUNT(*) as updated_transactions
FROM transactions
WHERE metadata->>'restaurant_order_id' IS NOT NULL;

-- View sample of updated transactions
SELECT 
  id,
  reference_id as new_reference,
  metadata->>'restaurant_order_id' as ro_id,
  metadata->>'original_menu_item_id' as original_item,
  description,
  updated_at
FROM transactions
WHERE metadata->>'restaurant_order_id' IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

-- Check if any transactions still need updating
SELECT COUNT(*) as still_needs_update
FROM transactions t
WHERE t.transaction_type = 'SPEND'
  AND t.status = 'COMPLETED'
  AND t.reference_id ~ '^[0-9]+$'
  AND t.metadata->>'restaurant_order_id' IS NULL
  AND EXISTS (
    SELECT 1 FROM order_items oi 
    WHERE oi.menu_item_id::TEXT = t.reference_id
  );

  -- Make sure orders table has type column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'pickup';

CREATE TABLE deliveries (
  id SERIAL PRIMARY KEY,
  order_id INTEGER UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  delivery_agent_id INTEGER REFERENCES deliveryagent(id) ON DELETE SET NULL,
  otp_code VARCHAR(6) NOT NULL,
  status VARCHAR(20) DEFAULT 'assigned', -- 'assigned', 'picked_up', 'delivered'
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_deliveries_order_id ON deliveries(order_id);
CREATE INDEX idx_deliveries_agent_id ON deliveries(delivery_agent_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);


CREATE TABLE order_delivery_details (
  id SERIAL PRIMARY KEY,
  order_id INTEGER UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  delivery_address TEXT NOT NULL,
  contact_number VARCHAR(15) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_order_delivery_details_order_id ON order_delivery_details(order_id);