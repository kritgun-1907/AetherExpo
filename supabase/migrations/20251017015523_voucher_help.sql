-- =====================================================
-- HELPER FUNCTIONS FOR GIFT VOUCHERS
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Function to safely award a gift voucher (creates profile if needed)
CREATE OR REPLACE FUNCTION public.award_gift_voucher(
    p_user_id UUID,
    p_voucher_type TEXT,
    p_amount INTEGER,
    p_provider JSONB,
    p_code TEXT,
    p_expires_at TIMESTAMPTZ
)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    voucher_type TEXT,
    amount INTEGER,
    code TEXT,
    status TEXT,
    awarded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
    -- Ensure user profile exists
    INSERT INTO public.user_profiles (id, email, created_at, updated_at)
    SELECT 
        p_user_id,
        (SELECT email FROM auth.users WHERE id = p_user_id),
        NOW(),
        NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM public.user_profiles WHERE id = p_user_id
    );
    
    -- Insert the voucher
    RETURN QUERY
    INSERT INTO public.gift_vouchers (
        user_id,
        voucher_type,
        amount,
        provider,
        code,
        status,
        expires_at
    ) VALUES (
        p_user_id,
        p_voucher_type,
        p_amount,
        p_provider,
        p_code,
        'active',
        p_expires_at
    )
    RETURNING 
        gift_vouchers.id,
        gift_vouchers.user_id,
        gift_vouchers.voucher_type,
        gift_vouchers.amount,
        gift_vouchers.code,
        gift_vouchers.status,
        gift_vouchers.awarded_at,
        gift_vouchers.expires_at;
    
    -- Update user's eco points
    UPDATE public.user_profiles
    SET 
        eco_points = COALESCE(eco_points, 0) + (p_amount * 10),
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$;

-- Function to calculate weekly emissions reduction
CREATE OR REPLACE FUNCTION public.get_weekly_reduction(p_user_id UUID)
RETURNS TABLE(
    current_week DECIMAL,
    previous_week DECIMAL,
    reduction DECIMAL,
    reduction_percentage DECIMAL,
    qualifies_for_reward BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_week_total DECIMAL := 0;
    v_previous_week_total DECIMAL := 0;
    v_reduction DECIMAL := 0;
    v_reduction_percentage DECIMAL := 0;
BEGIN
    -- Get current week emissions (last 7 days)
    SELECT COALESCE(SUM(amount), 0) INTO v_current_week_total
    FROM public.emissions
    WHERE user_id = p_user_id
    AND date >= CURRENT_DATE - INTERVAL '7 days'
    AND date < CURRENT_DATE;
    
    -- Get previous week emissions (7-14 days ago)
    SELECT COALESCE(SUM(amount), 0) INTO v_previous_week_total
    FROM public.emissions
    WHERE user_id = p_user_id
    AND date >= CURRENT_DATE - INTERVAL '14 days'
    AND date < CURRENT_DATE - INTERVAL '7 days';
    
    -- Calculate reduction
    v_reduction := v_previous_week_total - v_current_week_total;
    
    -- Calculate reduction percentage
    IF v_previous_week_total > 0 THEN
        v_reduction_percentage := (v_reduction / v_previous_week_total) * 100;
    ELSE
        v_reduction_percentage := 0;
    END IF;
    
    -- Return results
    RETURN QUERY SELECT 
        v_current_week_total,
        v_previous_week_total,
        v_reduction,
        v_reduction_percentage,
        (v_reduction > 0 AND v_reduction_percentage >= 10)::BOOLEAN;
END;
$$;

-- Function to mark voucher as used
CREATE OR REPLACE FUNCTION public.use_gift_voucher(
    p_voucher_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.gift_vouchers
    SET 
        status = 'used',
        used_at = NOW()
    WHERE id = p_voucher_id
    AND user_id = p_user_id
    AND status = 'active';
    
    RETURN FOUND;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.award_gift_voucher TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_reduction TO authenticated;
GRANT EXECUTE ON FUNCTION public.use_gift_voucher TO authenticated;

-- =====================================================
-- TEST THE FUNCTIONS
-- =====================================================

-- Test getting weekly reduction for current user
-- SELECT * FROM public.get_weekly_reduction(auth.uid());

-- Test awarding a voucher (replace with your user_id)
-- SELECT * FROM public.award_gift_voucher(
--     auth.uid(),
--     'amazon',
--     10,
--     '{"name": "Amazon", "logo": "https://logo.clearbit.com/amazon.com"}'::jsonb,
--     'ECO-TEST123',
--     NOW() + INTERVAL '90 days'
-- );