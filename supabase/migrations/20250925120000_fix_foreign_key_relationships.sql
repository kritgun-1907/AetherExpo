-- =====================================================
-- FIX FOREIGN KEY RELATIONSHIP BETWEEN USER_PROFILES AND EMISSIONS
-- Migration: 20250925_fix_foreign_key_relationships.sql
-- =====================================================

-- First, let's check if the emissions table exists and what columns it has
-- If it doesn't exist, we'll create it

-- Create emissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.emissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('transport', 'food', 'home', 'shopping')),
    subcategory TEXT,
    amount DECIMAL NOT NULL CHECK (amount >= 0),
    unit TEXT DEFAULT 'kg_co2e',
    description TEXT,
    metadata JSONB,
    emission_factor DECIMAL,
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'bank', 'api')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_profiles table if it doesn't exist (referencing auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    eco_points INTEGER DEFAULT 0,
    total_emissions DECIMAL DEFAULT 0,
    total_offsets DECIMAL DEFAULT 0,
    weekly_goal DECIMAL DEFAULT 50,
    streak_count INTEGER DEFAULT 0,
    last_activity_date DATE DEFAULT CURRENT_DATE,
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop existing foreign key constraint if it exists (to recreate it properly)
DO $$ 
BEGIN
    -- Check if the constraint exists and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'emissions_user_id_fkey' 
        AND table_name = 'emissions'
    ) THEN
        ALTER TABLE public.emissions DROP CONSTRAINT emissions_user_id_fkey;
    END IF;
    
    -- Also check for the constraint name that Supabase is looking for
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_profiles_id_fkey' 
        AND table_name = 'emissions'
    ) THEN
        ALTER TABLE public.emissions DROP CONSTRAINT user_profiles_id_fkey;
    END IF;
END $$;

-- Add the proper foreign key constraint with the expected name
ALTER TABLE public.emissions 
ADD CONSTRAINT user_profiles_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_emissions_user_id ON public.emissions(user_id);
CREATE INDEX IF NOT EXISTS idx_emissions_created_at ON public.emissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emissions_category ON public.emissions(category);
CREATE INDEX IF NOT EXISTS idx_user_profiles_total_emissions ON public.user_profiles(total_emissions ASC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_eco_points ON public.user_profiles(eco_points DESC);

-- Enable Row Level Security
ALTER TABLE public.emissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing RLS policies to recreate them
DROP POLICY IF EXISTS "Users can view own emissions" ON public.emissions;
DROP POLICY IF EXISTS "Users can insert own emissions" ON public.emissions;
DROP POLICY IF EXISTS "Users can update own emissions" ON public.emissions;
DROP POLICY IF EXISTS "Users can delete own emissions" ON public.emissions;

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.user_profiles;

-- Create RLS policies for emissions
CREATE POLICY "Users can view own emissions" ON public.emissions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emissions" ON public.emissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emissions" ON public.emissions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own emissions" ON public.emissions
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for user_profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Grant necessary permissions
GRANT ALL ON public.emissions TO authenticated;
GRANT SELECT ON public.emissions TO anon;

GRANT ALL ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO anon;

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_emissions_updated_at ON public.emissions;
CREATE TRIGGER update_emissions_updated_at
    BEFORE UPDATE ON public.emissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create a function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Create trigger for new user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert some sample data for testing (optional)
-- This will help test the leaderboard functionality
INSERT INTO public.user_profiles (id, email, full_name, total_emissions, eco_points)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'sarah.green@example.com', 'Sarah Green', 6.2, 150),
    ('00000000-0000-0000-0000-000000000002', 'john.eco@example.com', 'John Eco', 8.5, 120),
    ('00000000-0000-0000-0000-000000000003', 'emma.carbon@example.com', 'Emma Carbon', 5.8, 180),
    ('00000000-0000-0000-0000-000000000004', 'mike.clean@example.com', 'Mike Clean', 9.2, 100),
    ('00000000-0000-0000-0000-000000000005', 'lisa.pure@example.com', 'Lisa Pure', 7.3, 140)
ON CONFLICT (id) DO UPDATE SET
    total_emissions = EXCLUDED.total_emissions,
    eco_points = EXCLUDED.eco_points;

-- Insert corresponding emissions data
INSERT INTO public.emissions (user_id, category, amount, created_at)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'transport', 3.2, NOW() - INTERVAL '2 days'),
    ('00000000-0000-0000-0000-000000000001', 'food', 3.0, NOW() - INTERVAL '1 day'),
    ('00000000-0000-0000-0000-000000000002', 'transport', 5.5, NOW() - INTERVAL '3 days'),
    ('00000000-0000-0000-0000-000000000002', 'home', 3.0, NOW() - INTERVAL '1 day'),
    ('00000000-0000-0000-0000-000000000003', 'food', 2.8, NOW() - INTERVAL '2 days'),
    ('00000000-0000-0000-0000-000000000003', 'transport', 3.0, NOW() - INTERVAL '1 day'),
    ('00000000-0000-0000-0000-000000000004', 'transport', 6.2, NOW() - INTERVAL '2 days'),
    ('00000000-0000-0000-0000-000000000004', 'shopping', 3.0, NOW() - INTERVAL '1 day'),
    ('00000000-0000-0000-0000-000000000005', 'home', 4.3, NOW() - INTERVAL '3 days'),
    ('00000000-0000-0000-0000-000000000005', 'food', 3.0, NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;