-- =====================================================
-- FIX UUID EXTENSION AND CREATE TABLES SAFELY
-- =====================================================

-- Ensure extensions are available in the public schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;

-- Alternative: Use gen_random_uuid() if uuid-ossp doesn't work
-- This is built into modern PostgreSQL and doesn't require extensions

-- =====================================================
-- 1. USER SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Using built-in function
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    push_notifications BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    dark_mode BOOLEAN DEFAULT FALSE,
    units TEXT DEFAULT 'metric' CHECK (units IN ('metric', 'imperial')),
    privacy_level TEXT DEFAULT 'public' CHECK (privacy_level IN ('public', 'friends', 'private')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. ADD MISSING COLUMNS TO EXISTING TABLES
-- =====================================================

-- Add missing columns to user_profiles
DO $$ 
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'eco_points') THEN
        ALTER TABLE user_profiles ADD COLUMN eco_points INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'total_emissions') THEN
        ALTER TABLE user_profiles ADD COLUMN total_emissions DECIMAL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'total_offsets') THEN
        ALTER TABLE user_profiles ADD COLUMN total_offsets DECIMAL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'weekly_goal') THEN
        ALTER TABLE user_profiles ADD COLUMN weekly_goal DECIMAL DEFAULT 50;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'streak_count') THEN
        ALTER TABLE user_profiles ADD COLUMN streak_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'last_activity_date') THEN
        ALTER TABLE user_profiles ADD COLUMN last_activity_date DATE DEFAULT CURRENT_DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'is_premium') THEN
        ALTER TABLE user_profiles ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'full_name') THEN
        ALTER TABLE user_profiles ADD COLUMN full_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE user_profiles ADD COLUMN avatar_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'updated_at') THEN
        ALTER TABLE user_profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Add missing columns to emissions table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emissions' AND column_name = 'subcategory') THEN
        ALTER TABLE emissions ADD COLUMN subcategory TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emissions' AND column_name = 'unit') THEN
        ALTER TABLE emissions ADD COLUMN unit TEXT DEFAULT 'kg_co2e';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emissions' AND column_name = 'description') THEN
        ALTER TABLE emissions ADD COLUMN description TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emissions' AND column_name = 'metadata') THEN
        ALTER TABLE emissions ADD COLUMN metadata JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emissions' AND column_name = 'emission_factor') THEN
        ALTER TABLE emissions ADD COLUMN emission_factor DECIMAL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emissions' AND column_name = 'source') THEN
        ALTER TABLE emissions ADD COLUMN source TEXT DEFAULT 'manual';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emissions' AND column_name = 'updated_at') THEN
        ALTER TABLE emissions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Add check constraint for source column
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'emissions_source_check') THEN
        ALTER TABLE emissions ADD CONSTRAINT emissions_source_check CHECK (source IN ('manual', 'bank', 'api'));
    END IF;
    
    -- Add check constraint for category column
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'emissions_category_check') THEN
        ALTER TABLE emissions ADD CONSTRAINT emissions_category_check CHECK (category IN ('transport', 'food', 'home', 'shopping'));
    END IF;
END $$;

-- =====================================================
-- 3. CREATE NEW TABLES WITH gen_random_uuid()
-- =====================================================

-- Daily emissions summary
CREATE TABLE IF NOT EXISTS daily_emissions_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    transport_emissions DECIMAL DEFAULT 0,
    food_emissions DECIMAL DEFAULT 0,
    home_emissions DECIMAL DEFAULT 0,
    shopping_emissions DECIMAL DEFAULT 0,
    total_emissions DECIMAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Bank connections
CREATE TABLE IF NOT EXISTS user_bank_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    item_id TEXT NOT NULL,
    institution_name TEXT,
    account_ids TEXT[],
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    last_synced TIMESTAMPTZ,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
    error_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Carbon transactions
CREATE TABLE IF NOT EXISTS carbon_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    transaction_id TEXT UNIQUE NOT NULL,
    account_id TEXT NOT NULL,
    amount DECIMAL NOT NULL,
    date DATE NOT NULL,
    name TEXT,
    merchant_name TEXT,
    category TEXT[],
    carbon_emission DECIMAL DEFAULT 0,
    carbon_factor DECIMAL,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievement definitions
CREATE TABLE IF NOT EXISTS achievement_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    emoji TEXT DEFAULT '🏆',
    category TEXT CHECK (category IN ('emissions', 'streak', 'social', 'offset')),
    condition_type TEXT CHECK (condition_type IN ('threshold', 'streak', 'cumulative')),
    condition_value DECIMAL,
    reward_tokens INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievement_definitions(id),
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    tokens_earned INTEGER DEFAULT 0,
    UNIQUE(user_id, achievement_id)
);

-- User connections (friends)
CREATE TABLE IF NOT EXISTS user_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    addressee_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(requester_id, addressee_id)
);

-- Challenges
CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    emoji TEXT DEFAULT '🌱',
    challenge_type TEXT CHECK (challenge_type IN ('individual', 'group', 'global')),
    target_value DECIMAL,
    target_unit TEXT,
    start_date DATE,
    end_date DATE,
    reward_tokens INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User challenges
CREATE TABLE IF NOT EXISTS user_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    current_progress DECIMAL DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'abandoned')),
    UNIQUE(user_id, challenge_id)
);

-- Offset providers
CREATE TABLE IF NOT EXISTS offset_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    website_url TEXT,
    price_per_ton DECIMAL NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    project_types TEXT[],
    certifications TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Carbon offsets
CREATE TABLE IF NOT EXISTS carbon_offsets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    tons_co2 DECIMAL NOT NULL CHECK (tons_co2 > 0),
    price_per_ton DECIMAL NOT NULL,
    total_price DECIMAL NOT NULL,
    certificate_id TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'retired', 'cancelled')),
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- Voucher providers
CREATE TABLE IF NOT EXISTS voucher_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    category TEXT,
    denominations INTEGER[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gift vouchers
CREATE TABLE IF NOT EXISTS gift_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    voucher_type TEXT NOT NULL,
    provider JSONB,
    amount INTEGER NOT NULL,
    code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
    awarded_at TIMESTAMPTZ DEFAULT NOW(),
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL
);

-- User subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('basic', 'premium', 'enterprise')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('achievement', 'challenge', 'social', 'reminder', 'system')),
    read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User activity log
CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    screen TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. CREATE INDEXES SAFELY
-- =====================================================

DO $$
BEGIN
    -- User profiles indexes
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_user_profiles_email') THEN
        CREATE INDEX idx_user_profiles_email ON user_profiles(email);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_user_profiles_eco_points') THEN
        CREATE INDEX idx_user_profiles_eco_points ON user_profiles(eco_points DESC);
    END IF;

    -- Emissions indexes
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_emissions_user_date') THEN
        CREATE INDEX idx_emissions_user_date ON emissions(user_id, created_at DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_emissions_category') THEN
        CREATE INDEX idx_emissions_category ON emissions(category);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_daily_summary_user_date') THEN
        CREATE INDEX idx_daily_summary_user_date ON daily_emissions_summary(user_id, date DESC);
    END IF;

    -- Other indexes
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_notifications_user_unread') THEN
        CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE read = FALSE;
    END IF;
END $$;