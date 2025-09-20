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
  cuisine_type VARCHAR(50)
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

-- Trigger function to auto-update `updated_at`
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
