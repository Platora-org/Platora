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
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
