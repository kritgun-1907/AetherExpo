-- =====================================================
-- SUPABASE STORAGE SETUP FOR AETHER APP
-- Migration: 20250926_create_storage_buckets.sql
-- =====================================================

-- Create storage buckets for the app

-- 1. User Avatars Bucket
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true, -- Public bucket for user avatars
    false,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 2. Receipts Bucket (for carbon tracking from purchases)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
    'receipts',
    'receipts',
    false, -- Private bucket for user receipts
    false,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- 3. Challenge Images Bucket
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
    'challenge-images',
    'challenge-images',
    true, -- Public bucket for challenge images
    false,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 4. Carbon Offset Certificates Bucket
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
    'certificates',
    'certificates',
    false, -- Private bucket for offset certificates
    false,
    10485760, -- 10MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png']
) ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png'];

-- 5. App Assets Bucket (logos, icons, etc.)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
    'app-assets',
    'app-assets',
    true, -- Public bucket for app assets
    true, -- Enable AVIF auto-detection for better performance
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']
) ON CONFLICT (id) DO UPDATE SET
    public = true,
    avif_autodetection = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Avatars bucket policies
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Receipts bucket policies
CREATE POLICY "Users can view their own receipts"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'receipts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own receipts"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'receipts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own receipts"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'receipts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Challenge images bucket policies
CREATE POLICY "Challenge images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'challenge-images');

CREATE POLICY "Authenticated users can upload challenge images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'challenge-images' AND 
    auth.role() = 'authenticated'
);

-- Certificates bucket policies
CREATE POLICY "Users can view their own certificates"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'certificates' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "System can create certificates"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'certificates' AND 
    auth.role() = 'service_role'
);

-- App assets bucket policies
CREATE POLICY "App assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'app-assets');

CREATE POLICY "Only service role can manage app assets"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'app-assets' AND 
    auth.role() = 'service_role'
);

CREATE POLICY "Service role can update app assets"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'app-assets' AND 
    auth.role() = 'service_role'
);

CREATE POLICY "Service role can delete app assets"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'app-assets' AND 
    auth.role() = 'service_role'
);

-- =====================================================
-- UPDATE USER_PROFILES TABLE FOR AVATAR STORAGE
-- =====================================================

-- Update the avatar_url column to use storage URLs
DO $$ 
BEGIN
    -- Add storage_avatar_path column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' 
                   AND column_name = 'storage_avatar_path') THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN storage_avatar_path TEXT;
    END IF;
END $$;

-- Function to get full storage URL
CREATE OR REPLACE FUNCTION public.get_avatar_url(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    avatar_path TEXT;
    base_url TEXT;
BEGIN
    -- Get the Supabase project URL from environment
    base_url := current_setting('app.settings.supabase_url', true);
    
    -- Get the avatar path for the user
    SELECT storage_avatar_path INTO avatar_path
    FROM public.user_profiles
    WHERE id = user_id;
    
    IF avatar_path IS NOT NULL THEN
        RETURN base_url || '/storage/v1/object/public/avatars/' || avatar_path;
    ELSE
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CREATE STORAGE HELPER FUNCTIONS
-- =====================================================

-- Function to upload user avatar
CREATE OR REPLACE FUNCTION public.upload_avatar(
    user_id UUID,
    file_name TEXT,
    file_data BYTEA
)
RETURNS TEXT AS $$
DECLARE
    file_path TEXT;
    storage_url TEXT;
BEGIN
    -- Construct the file path
    file_path := user_id::TEXT || '/' || file_name;
    
    -- Update user profile with the storage path
    UPDATE public.user_profiles
    SET storage_avatar_path = file_path,
        updated_at = NOW()
    WHERE id = user_id;
    
    -- Return the storage path
    RETURN file_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SAMPLE DATA: Upload default avatars
-- =====================================================

-- Note: This would be done through the Supabase dashboard or API
-- Here we're just updating the paths as placeholders

UPDATE public.user_profiles
SET storage_avatar_path = CASE
    WHEN email LIKE 'sarah%' THEN 'default/avatar-female-1.png'
    WHEN email LIKE 'john%' THEN 'default/avatar-male-1.png'
    WHEN email LIKE 'emma%' THEN 'default/avatar-female-2.png'
    WHEN email LIKE 'mike%' THEN 'default/avatar-male-2.png'
    WHEN email LIKE 'lisa%' THEN 'default/avatar-female-3.png'
    WHEN email LIKE 'alice%' THEN 'default/avatar-female-4.png'
    WHEN email LIKE 'bob%' THEN 'default/avatar-male-3.png'
    WHEN email LIKE 'carol%' THEN 'default/avatar-female-5.png'
    WHEN email LIKE 'david%' THEN 'default/avatar-male-4.png'
    ELSE 'default/avatar-default.png'
END
WHERE storage_avatar_path IS NULL;