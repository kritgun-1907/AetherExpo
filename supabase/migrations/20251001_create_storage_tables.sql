-- =====================================================
-- STORAGE RELATED TABLES FOR AETHER APP (FIXED)
-- Migration: 20251001_create_storage_tables_fixed.sql
-- =====================================================

-- First, let's check the challenges table structure and fix it if needed
DO $$ 
BEGIN
    -- Check if challenges table exists and what type its id column is
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'challenges'
    ) THEN
        -- Check if id is TEXT and convert to UUID if needed
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'challenges' 
            AND column_name = 'id' 
            AND data_type = 'text'
        ) THEN
            RAISE NOTICE 'Challenges table id is TEXT, will handle appropriately';
        END IF;
    END IF;
END $$;

-- 1. User Receipts Table (for carbon tracking from purchases)
CREATE TABLE IF NOT EXISTS public.user_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_name TEXT,
    file_size INTEGER,
    mime_type TEXT,
    metadata JSONB,
    carbon_calculated BOOLEAN DEFAULT FALSE,
    carbon_amount DECIMAL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Challenge Submissions Table (for challenge proof uploads)
-- Using TEXT for challenge_id to match the challenges table
CREATE TABLE IF NOT EXISTS public.challenge_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    challenge_id TEXT, -- Changed from UUID to TEXT to match challenges table
    storage_path TEXT,
    submission_type TEXT CHECK (submission_type IN ('photo', 'video', 'document', 'text')),
    submission_text TEXT,
    metadata JSONB,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.user_profiles(id),
    reviewed_at TIMESTAMPTZ,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint only if challenges table exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'challenges'
    ) THEN
        -- Add the foreign key constraint
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'challenge_submissions_challenge_id_fkey'
            AND table_name = 'challenge_submissions'
        ) THEN
            ALTER TABLE public.challenge_submissions
            ADD CONSTRAINT challenge_submissions_challenge_id_fkey
            FOREIGN KEY (challenge_id) REFERENCES public.challenges(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- 3. User Media Table (general media storage tracking)
CREATE TABLE IF NOT EXISTS public.user_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    bucket_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_name TEXT,
    file_size INTEGER,
    mime_type TEXT,
    media_type TEXT CHECK (media_type IN ('avatar', 'receipt', 'challenge', 'certificate', 'other')),
    is_public BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bucket_name, storage_path)
);

-- 4. Storage Statistics Table (track usage per user)
CREATE TABLE IF NOT EXISTS public.user_storage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE UNIQUE,
    total_storage_used BIGINT DEFAULT 0, -- in bytes
    avatar_storage_used BIGINT DEFAULT 0,
    receipt_storage_used BIGINT DEFAULT 0,
    challenge_storage_used BIGINT DEFAULT 0,
    certificate_storage_used BIGINT DEFAULT 0,
    file_count INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR BETTER PERFORMANCE
-- =====================================================

-- User receipts indexes
CREATE INDEX IF NOT EXISTS idx_user_receipts_user_id ON public.user_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_receipts_uploaded_at ON public.user_receipts(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_receipts_carbon_calculated ON public.user_receipts(carbon_calculated) WHERE carbon_calculated = FALSE;

-- Challenge submissions indexes
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_user_id ON public.challenge_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_challenge_id ON public.challenge_submissions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_status ON public.challenge_submissions(status);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_created_at ON public.challenge_submissions(created_at DESC);

-- User media indexes
CREATE INDEX IF NOT EXISTS idx_user_media_user_id ON public.user_media(user_id);
CREATE INDEX IF NOT EXISTS idx_user_media_bucket_name ON public.user_media(bucket_name);
CREATE INDEX IF NOT EXISTS idx_user_media_media_type ON public.user_media(media_type);
CREATE INDEX IF NOT EXISTS idx_user_media_created_at ON public.user_media(created_at DESC);

-- Storage stats indexes
CREATE INDEX IF NOT EXISTS idx_user_storage_stats_user_id ON public.user_storage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_storage_stats_total_storage ON public.user_storage_stats(total_storage_used DESC);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.user_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_storage_stats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own receipts" ON public.user_receipts;
DROP POLICY IF EXISTS "Users can insert own receipts" ON public.user_receipts;
DROP POLICY IF EXISTS "Users can update own receipts" ON public.user_receipts;
DROP POLICY IF EXISTS "Users can delete own receipts" ON public.user_receipts;

DROP POLICY IF EXISTS "Users can view own submissions" ON public.challenge_submissions;
DROP POLICY IF EXISTS "Users can insert own submissions" ON public.challenge_submissions;
DROP POLICY IF EXISTS "Users can update own pending submissions" ON public.challenge_submissions;

DROP POLICY IF EXISTS "Users can view own media" ON public.user_media;
DROP POLICY IF EXISTS "Users can insert own media" ON public.user_media;
DROP POLICY IF EXISTS "Users can update own media" ON public.user_media;
DROP POLICY IF EXISTS "Users can delete own media" ON public.user_media;

DROP POLICY IF EXISTS "Users can view own storage stats" ON public.user_storage_stats;
DROP POLICY IF EXISTS "System can manage storage stats" ON public.user_storage_stats;

-- User receipts policies
CREATE POLICY "Users can view own receipts" ON public.user_receipts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own receipts" ON public.user_receipts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own receipts" ON public.user_receipts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own receipts" ON public.user_receipts
    FOR DELETE USING (auth.uid() = user_id);

-- Challenge submissions policies
CREATE POLICY "Users can view own submissions" ON public.challenge_submissions
    FOR SELECT USING (
        auth.uid() = user_id OR 
        (EXISTS (
            SELECT 1 FROM public.challenges 
            WHERE challenges.id = challenge_submissions.challenge_id 
            AND challenges.created_by = auth.uid()
        ))
    );

CREATE POLICY "Users can insert own submissions" ON public.challenge_submissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending submissions" ON public.challenge_submissions
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- User media policies
CREATE POLICY "Users can view own media" ON public.user_media
    FOR SELECT USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY "Users can insert own media" ON public.user_media
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own media" ON public.user_media
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own media" ON public.user_media
    FOR DELETE USING (auth.uid() = user_id);

-- Storage stats policies
CREATE POLICY "Users can view own storage stats" ON public.user_storage_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage storage stats" ON public.user_storage_stats
    FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- FUNCTIONS FOR STORAGE MANAGEMENT
-- =====================================================

-- Function to update storage statistics
CREATE OR REPLACE FUNCTION public.update_storage_stats(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_size BIGINT;
    v_avatar_size BIGINT;
    v_receipt_size BIGINT;
    v_challenge_size BIGINT;
    v_certificate_size BIGINT;
    v_file_count INTEGER;
BEGIN
    -- Calculate sizes from user_media table
    SELECT 
        COALESCE(SUM(file_size), 0),
        COALESCE(SUM(CASE WHEN media_type = 'avatar' THEN file_size ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN media_type = 'receipt' THEN file_size ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN media_type = 'challenge' THEN file_size ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN media_type = 'certificate' THEN file_size ELSE 0 END), 0),
        COUNT(*)::INTEGER
    INTO 
        v_total_size,
        v_avatar_size,
        v_receipt_size,
        v_challenge_size,
        v_certificate_size,
        v_file_count
    FROM public.user_media
    WHERE user_id = p_user_id;

    -- Upsert storage stats
    INSERT INTO public.user_storage_stats (
        user_id,
        total_storage_used,
        avatar_storage_used,
        receipt_storage_used,
        challenge_storage_used,
        certificate_storage_used,
        file_count,
        last_calculated_at,
        updated_at
    ) VALUES (
        p_user_id,
        v_total_size,
        v_avatar_size,
        v_receipt_size,
        v_challenge_size,
        v_certificate_size,
        v_file_count,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_storage_used = EXCLUDED.total_storage_used,
        avatar_storage_used = EXCLUDED.avatar_storage_used,
        receipt_storage_used = EXCLUDED.receipt_storage_used,
        challenge_storage_used = EXCLUDED.challenge_storage_used,
        certificate_storage_used = EXCLUDED.certificate_storage_used,
        file_count = EXCLUDED.file_count,
        last_calculated_at = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track media upload
CREATE OR REPLACE FUNCTION public.track_media_upload(
    p_user_id UUID,
    p_bucket_name TEXT,
    p_storage_path TEXT,
    p_file_name TEXT,
    p_file_size INTEGER,
    p_mime_type TEXT,
    p_media_type TEXT,
    p_is_public BOOLEAN DEFAULT FALSE,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_media_id UUID;
BEGIN
    -- Insert media record
    INSERT INTO public.user_media (
        user_id,
        bucket_name,
        storage_path,
        file_name,
        file_size,
        mime_type,
        media_type,
        is_public,
        metadata
    ) VALUES (
        p_user_id,
        p_bucket_name,
        p_storage_path,
        p_file_name,
        p_file_size,
        p_mime_type,
        p_media_type,
        p_is_public,
        p_metadata
    )
    ON CONFLICT (bucket_name, storage_path) DO UPDATE SET
        file_size = EXCLUDED.file_size,
        mime_type = EXCLUDED.mime_type,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
    RETURNING id INTO v_media_id;

    -- Update storage statistics
    PERFORM public.update_storage_stats(p_user_id);

    RETURN v_media_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update storage stats when media is deleted
CREATE OR REPLACE FUNCTION public.on_media_deleted()
RETURNS TRIGGER AS $$
BEGIN
    -- Update storage statistics for the user
    PERFORM public.update_storage_stats(OLD.user_id);
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_storage_on_media_delete ON public.user_media;
CREATE TRIGGER update_storage_on_media_delete
    AFTER DELETE ON public.user_media
    FOR EACH ROW
    EXECUTE FUNCTION public.on_media_deleted();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON public.user_receipts TO authenticated;
GRANT ALL ON public.challenge_submissions TO authenticated;
GRANT ALL ON public.user_media TO authenticated;
GRANT ALL ON public.user_storage_stats TO authenticated;

GRANT SELECT ON public.user_receipts TO anon;
GRANT SELECT ON public.challenge_submissions TO anon;
GRANT SELECT ON public.user_media TO anon;
GRANT SELECT ON public.user_storage_stats TO anon;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.update_storage_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_media_upload(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, BOOLEAN, JSONB) TO authenticated;