-- =====================================================
-- RPC FUNCTIONS FOR EMISSION SYNC ACROSS SCREENS
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Drop existing functions to prevent return type conflicts
DROP FUNCTION IF EXISTS increment_user_emissions(UUID, DECIMAL);
DROP FUNCTION IF EXISTS update_user_streak(UUID);
DROP FUNCTION IF EXISTS get_user_emission_stats(UUID);
DROP FUNCTION IF EXISTS get_weekly_emissions_data(UUID);
DROP FUNCTION IF EXISTS sync_emission_data(UUID);
DROP FUNCTION IF EXISTS get_category_breakdown(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS add_test_emission(UUID, TEXT, DECIMAL);

-- Function to increment user emissions and update profile
CREATE OR REPLACE FUNCTION increment_user_emissions(
    p_user_id UUID,
    p_amount DECIMAL
)
RETURNS VOID AS $$
BEGIN
    -- Update user profile with new emission total
    UPDATE user_profiles
    SET 
        total_emissions = COALESCE(total_emissions, 0) + p_amount,
        last_activity_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Update or create daily summary
    INSERT INTO daily_emissions_summary (
        user_id,
        date,
        total_emissions,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        CURRENT_DATE,
        p_amount,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
        total_emissions = daily_emissions_summary.total_emissions + p_amount,
        updated_at = NOW();
    
    -- Check and update streak
    PERFORM update_user_streak(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user streak
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_streak_count INTEGER := 0;
    v_last_activity_date DATE;
    v_current_date DATE := CURRENT_DATE;
BEGIN
    -- Get last activity date
    SELECT last_activity_date INTO v_last_activity_date
    FROM user_profiles
    WHERE id = p_user_id;
    
    -- Calculate streak
    IF v_last_activity_date IS NULL THEN
        v_streak_count := 1;
    ELSIF v_last_activity_date = v_current_date THEN
        -- Already logged today, keep current streak
        SELECT streak_count INTO v_streak_count
        FROM user_profiles
        WHERE id = p_user_id;
    ELSIF v_last_activity_date = v_current_date - INTERVAL '1 day' THEN
        -- Logged yesterday, increment streak
        SELECT streak_count + 1 INTO v_streak_count
        FROM user_profiles
        WHERE id = p_user_id;
    ELSE
        -- Streak broken, reset to 1
        v_streak_count := 1;
    END IF;
    
    -- Update user profile
    UPDATE user_profiles
    SET 
        streak_count = v_streak_count,
        last_activity_date = v_current_date,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN v_streak_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user emission stats (for ProfileScreen)
CREATE OR REPLACE FUNCTION get_user_emission_stats(p_user_id UUID)
RETURNS TABLE(
    daily_emissions DECIMAL,
    weekly_emissions DECIMAL,
    monthly_emissions DECIMAL,
    all_time_emissions DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- Today
        COALESCE(SUM(CASE 
            WHEN e.created_at::DATE = CURRENT_DATE 
            THEN e.amount 
            ELSE 0 
        END), 0) as daily_emissions,
        
        -- This week (last 7 days)
        COALESCE(SUM(CASE 
            WHEN e.created_at >= CURRENT_DATE - INTERVAL '6 days' 
            THEN e.amount 
            ELSE 0 
        END), 0) as weekly_emissions,
        
        -- This month
        COALESCE(SUM(CASE 
            WHEN DATE_TRUNC('month', e.created_at) = DATE_TRUNC('month', CURRENT_DATE) 
            THEN e.amount 
            ELSE 0 
        END), 0) as monthly_emissions,
        
        -- All time
        COALESCE(SUM(e.amount), 0) as all_time_emissions
    FROM emissions e
    WHERE e.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get weekly emissions data (for charts)
CREATE OR REPLACE FUNCTION get_weekly_emissions_data(p_user_id UUID)
RETURNS TABLE(
    day_name TEXT,
    day_date DATE,
    emissions DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH days AS (
        SELECT 
            generate_series(
                CURRENT_DATE - INTERVAL '6 days',
                CURRENT_DATE,
                INTERVAL '1 day'
            )::DATE as date
    )
    SELECT
        TO_CHAR(d.date, 'Dy') as day_name,
        d.date as day_date,
        COALESCE(SUM(e.amount), 0) as emissions
    FROM days d
    LEFT JOIN emissions e ON e.created_at::DATE = d.date AND e.user_id = p_user_id
    GROUP BY d.date
    ORDER BY d.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync emission data across all screens
CREATE OR REPLACE FUNCTION sync_emission_data(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_daily DECIMAL;
    v_weekly DECIMAL;
    v_monthly DECIMAL;
    v_all_time DECIMAL;
    v_streak INTEGER;
    v_tokens INTEGER;
BEGIN
    -- Get emission stats
    SELECT * INTO v_daily, v_weekly, v_monthly, v_all_time
    FROM get_user_emission_stats(p_user_id);
    
    -- Get streak and tokens
    SELECT streak_count, eco_points INTO v_streak, v_tokens
    FROM user_profiles
    WHERE id = p_user_id;
    
    -- Build result JSON
    v_result := jsonb_build_object(
        'daily', v_daily,
        'weekly', v_weekly,
        'monthly', v_monthly,
        'all_time', v_all_time,
        'streak', COALESCE(v_streak, 0),
        'tokens', COALESCE(v_tokens, 0),
        'synced_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update daily summary when emission is added
CREATE OR REPLACE FUNCTION update_daily_summary_on_emission()
RETURNS TRIGGER AS $$
DECLARE
    v_category_field TEXT;
BEGIN
    -- Determine which category field to update
    v_category_field := LOWER(NEW.category) || '_emissions';
    
    -- Update or create daily summary
    INSERT INTO daily_emissions_summary (
        user_id,
        date,
        total_emissions,
        transport_emissions,
        food_emissions,
        home_emissions,
        shopping_emissions,
        created_at,
        updated_at
    ) VALUES (
        NEW.user_id,
        NEW.created_at::DATE,
        NEW.amount,
        CASE WHEN NEW.category = 'transport' THEN NEW.amount ELSE 0 END,
        CASE WHEN NEW.category = 'food' THEN NEW.amount ELSE 0 END,
        CASE WHEN NEW.category = 'home' THEN NEW.amount ELSE 0 END,
        CASE WHEN NEW.category = 'shopping' THEN NEW.amount ELSE 0 END,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
        total_emissions = daily_emissions_summary.total_emissions + NEW.amount,
        transport_emissions = daily_emissions_summary.transport_emissions + 
            CASE WHEN NEW.category = 'transport' THEN NEW.amount ELSE 0 END,
        food_emissions = daily_emissions_summary.food_emissions + 
            CASE WHEN NEW.category = 'food' THEN NEW.amount ELSE 0 END,
        home_emissions = daily_emissions_summary.home_emissions + 
            CASE WHEN NEW.category = 'home' THEN NEW.amount ELSE 0 END,
        shopping_emissions = daily_emissions_summary.shopping_emissions + 
            CASE WHEN NEW.category = 'shopping' THEN NEW.amount ELSE 0 END,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_daily_summary_trigger ON emissions;

-- Create trigger
CREATE TRIGGER update_daily_summary_trigger
    AFTER INSERT ON emissions
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_summary_on_emission();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_user_emissions(UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_streak(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_emission_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_emissions_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_emission_data(UUID) TO authenticated;

-- Create view for user emission stats (easier querying)
CREATE OR REPLACE VIEW user_emission_stats AS
SELECT 
    u.id as user_id,
    u.full_name,
    u.email,
    u.eco_points,
    u.streak_count,
    u.total_emissions,
    -- Today
    COALESCE((
        SELECT SUM(amount) 
        FROM emissions 
        WHERE user_id = u.id 
        AND created_at::DATE = CURRENT_DATE
    ), 0) as daily_emissions,
    -- This week
    COALESCE((
        SELECT SUM(amount) 
        FROM emissions 
        WHERE user_id = u.id 
        AND created_at >= CURRENT_DATE - INTERVAL '6 days'
    ), 0) as weekly_emissions,
    -- This month
    COALESCE((
        SELECT SUM(amount) 
        FROM emissions 
        WHERE user_id = u.id 
        AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    ), 0) as monthly_emissions
FROM user_profiles u;

-- Grant access to view
GRANT SELECT ON user_emission_stats TO authenticated;

-- =====================================================
-- NOTIFICATION SYSTEM FOR REAL-TIME UPDATES
-- =====================================================

-- Function to notify other screens when emission is added
CREATE OR REPLACE FUNCTION notify_emission_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Send notification via PostgreSQL NOTIFY
    PERFORM pg_notify(
        'emission_update',
        json_build_object(
            'user_id', NEW.user_id,
            'emission_id', NEW.id,
            'amount', NEW.amount,
            'category', NEW.category,
            'created_at', NEW.created_at
        )::text
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for real-time notifications
DROP TRIGGER IF EXISTS emission_update_notify ON emissions;
CREATE TRIGGER emission_update_notify
    AFTER INSERT ON emissions
    FOR EACH ROW
    EXECUTE FUNCTION notify_emission_update();

-- =====================================================
-- HELPER FUNCTION: Calculate Category Breakdown
-- =====================================================

CREATE OR REPLACE FUNCTION get_category_breakdown(
    p_user_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
    category TEXT,
    total_emissions DECIMAL,
    percentage DECIMAL,
    count INTEGER
) AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    v_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
    v_end_date := COALESCE(p_end_date, CURRENT_DATE);
    
    RETURN QUERY
    WITH totals AS (
        SELECT SUM(amount) as grand_total
        FROM emissions
        WHERE user_id = p_user_id
        AND created_at::DATE BETWEEN v_start_date AND v_end_date
    )
    SELECT
        e.category,
        SUM(e.amount) as total_emissions,
        CASE 
            WHEN (SELECT grand_total FROM totals) > 0 
            THEN (SUM(e.amount) / (SELECT grand_total FROM totals) * 100)
            ELSE 0
        END as percentage,
        COUNT(*)::INTEGER as count
    FROM emissions e
    WHERE e.user_id = p_user_id
    AND e.created_at::DATE BETWEEN v_start_date AND v_end_date
    GROUP BY e.category
    ORDER BY total_emissions DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_category_breakdown(UUID, DATE, DATE) TO authenticated;

-- =====================================================
-- TESTING: Sample data insertion function
-- =====================================================

-- Function to add test emission (useful for debugging)
CREATE OR REPLACE FUNCTION add_test_emission(
    p_user_id UUID,
    p_category TEXT DEFAULT 'transport',
    p_amount DECIMAL DEFAULT 5.0
)
RETURNS UUID AS $$
DECLARE
    v_emission_id UUID;
BEGIN
    INSERT INTO emissions (
        user_id,
        category,
        subcategory,
        amount,
        emission_factor,
        source,
        description,
        created_at
    ) VALUES (
        p_user_id,
        p_category,
        'test_activity',
        p_amount,
        0.21,
        'manual',
        'Test emission from database function',
        NOW()
    )
    RETURNING id INTO v_emission_id;
    
    -- Update user totals
    PERFORM increment_user_emissions(p_user_id, p_amount);
    
    RETURN v_emission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION add_test_emission(UUID, TEXT, DECIMAL) TO authenticated;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ All emission sync functions created successfully!';
    RAISE NOTICE '📊 Functions available:';
    RAISE NOTICE '   - increment_user_emissions(user_id, amount)';
    RAISE NOTICE '   - update_user_streak(user_id)';
    RAISE NOTICE '   - get_user_emission_stats(user_id)';
    RAISE NOTICE '   - get_weekly_emissions_data(user_id)';
    RAISE NOTICE '   - sync_emission_data(user_id)';
    RAISE NOTICE '   - get_category_breakdown(user_id, start_date, end_date)';
    RAISE NOTICE '   - add_test_emission(user_id, category, amount)';
    RAISE NOTICE '🔔 Real-time triggers enabled';
    RAISE NOTICE '📈 Views created: user_emission_stats';
END $$;