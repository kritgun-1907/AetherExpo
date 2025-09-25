-- =====================================================
-- FRIENDS FEATURE MIGRATION - FIXED VERSION v2
-- Migration: 20250925_friends_feature_complete_fixed_v2.sql
-- =====================================================

-- Check if this migration has already been run
DO $$ 
BEGIN
    -- Check if migration already exists in schema_migrations
    IF EXISTS (
        SELECT 1 FROM supabase_migrations.schema_migrations 
        WHERE version = '20250925_friends_feature_complete_fixed_v2'
    ) THEN
        RAISE NOTICE 'Migration already applied, skipping...';
        RETURN;
    END IF;
END $$;

-- Ensure extensions are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;

-- =====================================================
-- 1. ENSURE USER_PROFILES TABLE HAS ALL REQUIRED COLUMNS
-- =====================================================

-- Add any missing columns to user_profiles for friends feature
DO $$ 
BEGIN
    -- Add full_name column if it doesn't exist (for username search)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'full_name') THEN
        ALTER TABLE public.user_profiles ADD COLUMN full_name TEXT;
        RAISE NOTICE 'Added full_name column to user_profiles';
    END IF;
    
    -- Add email column if it doesn't exist (for email search)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'email') THEN
        ALTER TABLE public.user_profiles ADD COLUMN email TEXT;
        RAISE NOTICE 'Added email column to user_profiles';
    END IF;
    
    -- Add avatar_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.user_profiles ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Added avatar_url column to user_profiles';
    END IF;
    
    -- Add eco_points column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'eco_points') THEN
        ALTER TABLE public.user_profiles ADD COLUMN eco_points INTEGER DEFAULT 0;
        RAISE NOTICE 'Added eco_points column to user_profiles';
    END IF;
    
    -- Add total_emissions column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'total_emissions') THEN
        ALTER TABLE public.user_profiles ADD COLUMN total_emissions DECIMAL DEFAULT 0;
        RAISE NOTICE 'Added total_emissions column to user_profiles';
    END IF;
    
    -- Add is_premium column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'is_premium') THEN
        ALTER TABLE public.user_profiles ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_premium column to user_profiles';
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'created_at') THEN
        ALTER TABLE public.user_profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to user_profiles';
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'updated_at') THEN
        ALTER TABLE public.user_profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to user_profiles';
    END IF;
END $$;

-- =====================================================
-- 2. CREATE USER_CONNECTIONS TABLE IF IT DOESN'T EXIST
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_connections') THEN
        CREATE TABLE public.user_connections (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            requester_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
            addressee_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(requester_id, addressee_id),
            -- Prevent self-connections
            CHECK (requester_id != addressee_id)
        );
        RAISE NOTICE 'Created user_connections table';
    ELSE
        RAISE NOTICE 'user_connections table already exists';
    END IF;
END $$;

-- =====================================================
-- 3. CREATE INDEXES FOR BETTER PERFORMANCE (IF NOT EXISTS)
-- =====================================================

-- User profiles search indexes
DO $$
BEGIN
    -- Check and create indexes only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_profiles_full_name_search') THEN
        CREATE INDEX idx_user_profiles_full_name_search ON public.user_profiles USING gin(to_tsvector('english', full_name));
        RAISE NOTICE 'Created full_name search index';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_profiles_email_search') THEN
        CREATE INDEX idx_user_profiles_email_search ON public.user_profiles(email);
        RAISE NOTICE 'Created email search index';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_profiles_full_name_ilike') THEN
        CREATE INDEX idx_user_profiles_full_name_ilike ON public.user_profiles(full_name text_pattern_ops);
        RAISE NOTICE 'Created full_name ilike index';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_profiles_email_ilike') THEN
        CREATE INDEX idx_user_profiles_email_ilike ON public.user_profiles(email text_pattern_ops);
        RAISE NOTICE 'Created email ilike index';
    END IF;

    -- User connections indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_connections_requester') THEN
        CREATE INDEX idx_user_connections_requester ON public.user_connections(requester_id);
        RAISE NOTICE 'Created requester index';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_connections_addressee') THEN
        CREATE INDEX idx_user_connections_addressee ON public.user_connections(addressee_id);
        RAISE NOTICE 'Created addressee index';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_connections_status') THEN
        CREATE INDEX idx_user_connections_status ON public.user_connections(status);
        RAISE NOTICE 'Created status index';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_connections_created_at') THEN
        CREATE INDEX idx_user_connections_created_at ON public.user_connections(created_at DESC);
        RAISE NOTICE 'Created created_at index';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_connections_user_status') THEN
        CREATE INDEX idx_user_connections_user_status ON public.user_connections(requester_id, addressee_id, status);
        RAISE NOTICE 'Created user_status composite index';
    END IF;

    -- Composite index for friend lookups
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_connections_friends_lookup') THEN
        CREATE INDEX idx_user_connections_friends_lookup 
        ON public.user_connections(requester_id, addressee_id) 
        WHERE status = 'accepted';
        RAISE NOTICE 'Created friends lookup index';
    END IF;
END $$;

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY AND CREATE POLICIES
-- =====================================================

-- Enable RLS on user_connections
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them (using IF EXISTS to avoid errors)
DROP POLICY IF EXISTS "Users can view connections involving them" ON public.user_connections;
DROP POLICY IF EXISTS "Users can insert own friend requests" ON public.user_connections;
DROP POLICY IF EXISTS "Users can update connections involving them" ON public.user_connections;
DROP POLICY IF EXISTS "Users can delete connections involving them" ON public.user_connections;

-- Create comprehensive RLS policies for user_connections
CREATE POLICY "Users can view connections involving them" ON public.user_connections
    FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can insert own friend requests" ON public.user_connections
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update connections involving them" ON public.user_connections
    FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can delete connections involving them" ON public.user_connections
    FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Handle user_profiles RLS policies more carefully
DO $$
BEGIN
    -- Check if RLS is enabled on user_profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'user_profiles' 
        AND n.nspname = 'public' 
        AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on user_profiles';
    END IF;
END $$;

-- Drop existing user_profiles policies
DROP POLICY IF EXISTS "Users can view all profiles for friend search" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- Allow authenticated users to search and view profiles
CREATE POLICY "Users can view all profiles for friend search" ON public.user_profiles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create insert and update policies
CREATE POLICY "Users can insert own profile" ON public.user_profiles 
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles 
    FOR UPDATE USING (auth.uid() = id);

-- =====================================================
-- 5. GRANT NECESSARY PERMISSIONS
-- =====================================================

GRANT ALL ON public.user_connections TO authenticated;
GRANT SELECT ON public.user_connections TO anon;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO anon;

-- =====================================================
-- 6. CREATE/REPLACE FUNCTIONS FOR FRIEND MANAGEMENT
-- =====================================================

-- Function to get friend count for a user
CREATE OR REPLACE FUNCTION public.get_friend_count(user_uuid UUID)
RETURNS INTEGER 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM public.user_connections 
        WHERE (requester_id = user_uuid OR addressee_id = user_uuid) 
        AND status = 'accepted'
    );
END;
$$;

-- Function to check if users are friends
CREATE OR REPLACE FUNCTION public.are_users_friends(user1_uuid UUID, user2_uuid UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_connections 
        WHERE ((requester_id = user1_uuid AND addressee_id = user2_uuid) 
               OR (requester_id = user2_uuid AND addressee_id = user1_uuid))
        AND status = 'accepted'
    );
END;
$$;

-- Function to get connection status between two users
CREATE OR REPLACE FUNCTION public.get_connection_status(user1_uuid UUID, user2_uuid UUID)
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT status 
        FROM public.user_connections 
        WHERE ((requester_id = user1_uuid AND addressee_id = user2_uuid) 
               OR (requester_id = user2_uuid AND addressee_id = user1_uuid))
        LIMIT 1
    );
END;
$$;

-- =====================================================
-- 7. CREATE TRIGGERS
-- =====================================================

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Create trigger for user_connections updated_at
DROP TRIGGER IF EXISTS update_user_connections_updated_at ON public.user_connections;
CREATE TRIGGER update_user_connections_updated_at
    BEFORE UPDATE ON public.user_connections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for user_profiles updated_at (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_user_profiles_updated_at'
        AND tgrelid = 'public.user_profiles'::regclass
    ) THEN
        CREATE TRIGGER update_user_profiles_updated_at
            BEFORE UPDATE ON public.user_profiles
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
        RAISE NOTICE 'Created user_profiles updated_at trigger';
    ELSE
        RAISE NOTICE 'user_profiles updated_at trigger already exists';
    END IF;
END $$;

-- =====================================================
-- 8. INSERT SAMPLE DATA FOR TESTING (ON CONFLICT DO UPDATE)
-- =====================================================

-- Insert some test users for friends functionality testing
INSERT INTO public.user_profiles (id, email, full_name, eco_points, total_emissions, is_premium)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'alice.green@example.com', 'Alice Green', 250, 12.5, FALSE),
    ('22222222-2222-2222-2222-222222222222', 'bob.eco@example.com', 'Bob Eco', 180, 15.2, TRUE),
    ('33333333-3333-3333-3333-333333333333', 'carol.sustainable@example.com', 'Carol Sustainable', 320, 8.7, FALSE),
    ('44444444-4444-4444-4444-444444444444', 'david.carbon@example.com', 'David Carbon', 150, 18.9, FALSE),
    ('55555555-5555-5555-5555-555555555555', 'emma.climate@example.com', 'Emma Climate', 400, 6.3, TRUE),
    ('66666666-6666-6666-6666-666666666666', 'frank.nature@example.com', 'Frank Nature', 210, 11.8, FALSE),
    ('77777777-7777-7777-7777-777777777777', 'grace.environment@example.com', 'Grace Environment', 290, 9.4, FALSE),
    ('88888888-8888-8888-8888-888888888888', 'henry.green@example.com', 'Henry Green', 160, 16.1, FALSE)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    eco_points = EXCLUDED.eco_points,
    total_emissions = EXCLUDED.total_emissions,
    is_premium = EXCLUDED.is_premium,
    updated_at = NOW();

-- Create some sample friend connections
INSERT INTO public.user_connections (requester_id, addressee_id, status, created_at, updated_at)
VALUES 
    ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'accepted', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'),
    ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'accepted', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
    ('22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'pending', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
    ('33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', 'accepted', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
    ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'pending', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
ON CONFLICT (requester_id, addressee_id) DO NOTHING;

-- =====================================================
-- 9. CREATE VIEW FOR EASY FRIEND QUERIES
-- =====================================================

-- Drop the view if it exists and recreate it
DROP VIEW IF EXISTS public.friends_view;

CREATE VIEW public.friends_view AS
SELECT 
    c.id as connection_id,
    c.requester_id,
    c.addressee_id,
    c.status,
    c.created_at as connected_at,
    c.updated_at,
    CASE 
        WHEN c.requester_id = auth.uid() THEN ap.id
        ELSE rp.id
    END as friend_id,
    CASE 
        WHEN c.requester_id = auth.uid() THEN ap.full_name
        ELSE rp.full_name
    END as friend_name,
    CASE 
        WHEN c.requester_id = auth.uid() THEN ap.email
        ELSE rp.email
    END as friend_email,
    CASE 
        WHEN c.requester_id = auth.uid() THEN ap.avatar_url
        ELSE rp.avatar_url
    END as friend_avatar_url,
    CASE 
        WHEN c.requester_id = auth.uid() THEN ap.eco_points
        ELSE rp.eco_points
    END as friend_eco_points,
    CASE 
        WHEN c.requester_id = auth.uid() THEN ap.total_emissions
        ELSE rp.total_emissions
    END as friend_total_emissions
FROM public.user_connections c
LEFT JOIN public.user_profiles rp ON c.requester_id = rp.id
LEFT JOIN public.user_profiles ap ON c.addressee_id = ap.id
WHERE (c.requester_id = auth.uid() OR c.addressee_id = auth.uid())
AND c.status = 'accepted';

-- Grant access to the view
GRANT SELECT ON public.friends_view TO authenticated;