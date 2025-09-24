-- =====================================================
-- CREATE CARBON ACTIVITIES TABLE - FIXED VERSION
-- =====================================================
-- This table stores detailed activity tracking data

-- Ensure UUID extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

-- Create the table
CREATE TABLE IF NOT EXISTS public.carbon_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('transport', 'energy', 'food', 'consumption')),
    activity_type TEXT NOT NULL,
    activity_name TEXT NOT NULL,
    amount DECIMAL NOT NULL,
    unit TEXT NOT NULL,
    carbon_kg DECIMAL NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_carbon_activities_user_id ON public.carbon_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_carbon_activities_category ON public.carbon_activities(category);
CREATE INDEX IF NOT EXISTS idx_carbon_activities_created_at ON public.carbon_activities(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.carbon_activities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own carbon activities" ON public.carbon_activities;
DROP POLICY IF EXISTS "Users can insert own carbon activities" ON public.carbon_activities;
DROP POLICY IF EXISTS "Users can update own carbon activities" ON public.carbon_activities;
DROP POLICY IF EXISTS "Users can delete own carbon activities" ON public.carbon_activities;

-- Create RLS policies
CREATE POLICY "Users can view own carbon activities" ON public.carbon_activities
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own carbon activities" ON public.carbon_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own carbon activities" ON public.carbon_activities
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own carbon activities" ON public.carbon_activities
    FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions (no sequence needed for UUID primary key)
GRANT ALL ON public.carbon_activities TO authenticated;
GRANT ALL ON public.carbon_activities TO anon;

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_carbon_activities_updated_at ON public.carbon_activities;
CREATE TRIGGER update_carbon_activities_updated_at
    BEFORE UPDATE ON public.carbon_activities
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();