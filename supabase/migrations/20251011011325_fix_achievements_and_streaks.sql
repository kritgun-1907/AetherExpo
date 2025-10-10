-- =====================================================
-- FIX ACHIEVEMENTS AND STREAK COUNTER
-- Migration: 20250120_fix_achievements_and_streaks.sql
-- =====================================================

-- 1. INSERT DEFAULT ACHIEVEMENT DEFINITIONS
INSERT INTO public.achievement_definitions (
    id, name, description, emoji, category, 
    condition_type, condition_value, reward_tokens, is_active
) VALUES 
    ('00000001-0000-0000-0000-000000000001', 'First Steps', 'Log your first emission', '🌱', 'emissions', 'cumulative', 1, 10, true),
    ('00000001-0000-0000-0000-000000000002', 'Week Warrior', 'Maintain a 7-day streak', '🔥', 'streak', 'streak', 7, 50, true),
    ('00000001-0000-0000-0000-000000000003', 'Carbon Cutter', 'Reduce emissions by 10kg', '✂️', 'emissions', 'threshold', 10, 30, true),
    ('00000001-0000-0000-0000-000000000004', 'Eco Champion', 'Earn 100 eco points', '🏆', 'emissions', 'cumulative', 100, 100, true),
    ('00000001-0000-0000-0000-000000000005', 'Green Streak', '30-day streak', '🌟', 'streak', 'streak', 30, 200, true),
    ('00000001-0000-0000-0000-000000000006', 'Offset Hero', 'Purchase your first offset', '🦸', 'offset', 'cumulative', 1, 75, true),
    ('00000001-0000-0000-0000-000000000007', 'Social Butterfly', 'Add 5 friends', '🦋', 'social', 'cumulative', 5, 40, true),
    ('00000001-0000-0000-0000-000000000008', 'Challenge Master', 'Complete 3 challenges', '🎯', 'social', 'cumulative', 3, 60, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    emoji = EXCLUDED.emoji,
    is_active = true;

-- 2. CREATE FUNCTION TO CALCULATE STREAK
CREATE OR REPLACE FUNCTION public.calculate_user_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_streak INTEGER := 0;
    v_last_date DATE;
    v_current_date DATE;
    v_consecutive_days INTEGER := 0;
BEGIN
    -- Get all emission dates for the user in descending order
    FOR v_current_date IN
        SELECT DISTINCT DATE(created_at) as emission_date
        FROM public.emissions
        WHERE user_id = p_user_id
        ORDER BY emission_date DESC
    LOOP
        IF v_last_date IS NULL THEN
            -- First iteration
            v_consecutive_days := 1;
            v_last_date := v_current_date;
        ELSIF v_last_date - v_current_date = 1 THEN
            -- Consecutive day found
            v_consecutive_days := v_consecutive_days + 1;
            v_last_date := v_current_date;
        ELSE
            -- Streak broken
            EXIT;
        END IF;
    END LOOP;
    
    -- Check if the streak includes today or yesterday
    IF v_last_date IS NOT NULL AND 
       (v_last_date = CURRENT_DATE OR v_last_date = CURRENT_DATE - INTERVAL '1 day') THEN
        v_streak := v_consecutive_days;
    END IF;
    
    RETURN v_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CREATE FUNCTION TO UPDATE STREAK AND AWARD ACHIEVEMENTS
CREATE OR REPLACE FUNCTION public.update_user_streak_and_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_streak INTEGER;
    v_total_emissions DECIMAL;
    v_eco_points INTEGER;
    v_achievement RECORD;
BEGIN
    -- Calculate current streak
    v_streak := public.calculate_user_streak(p_user_id);
    
    -- Update user profile with new streak
    UPDATE public.user_profiles
    SET 
        streak_count = v_streak,
        last_activity_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Get user's current stats
    SELECT total_emissions, eco_points INTO v_total_emissions, v_eco_points
    FROM public.user_profiles
    WHERE id = p_user_id;
    
    -- Check and award achievements
    FOR v_achievement IN 
        SELECT * FROM public.achievement_definitions WHERE is_active = true
    LOOP
        -- Check if user already has this achievement
        IF NOT EXISTS (
            SELECT 1 FROM public.user_achievements 
            WHERE user_id = p_user_id AND achievement_id = v_achievement.id
        ) THEN
            -- Check achievement conditions
            IF (v_achievement.condition_type = 'streak' AND v_streak >= v_achievement.condition_value) OR
               (v_achievement.condition_type = 'cumulative' AND v_achievement.category = 'emissions' AND v_eco_points >= v_achievement.condition_value) OR
               (v_achievement.condition_type = 'threshold' AND v_total_emissions <= v_achievement.condition_value)
            THEN
                -- Award achievement
                INSERT INTO public.user_achievements (user_id, achievement_id, tokens_earned)
                VALUES (p_user_id, v_achievement.id, v_achievement.reward_tokens);
                
                -- Update user's eco points
                UPDATE public.user_profiles
                SET eco_points = eco_points + v_achievement.reward_tokens
                WHERE id = p_user_id;
                
                -- Create notification
                INSERT INTO public.notifications (user_id, title, message, type)
                VALUES (
                    p_user_id,
                    'Achievement Unlocked!',
                    'You earned: ' || v_achievement.name || ' - ' || v_achievement.description,
                    'achievement'
                );
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. CREATE TRIGGER TO UPDATE STREAK AFTER EMISSION
CREATE OR REPLACE FUNCTION public.on_emission_inserted()
RETURNS TRIGGER AS $$
BEGIN
    -- Update streak and check achievements
    PERFORM public.update_user_streak_and_achievements(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_streak_on_emission ON public.emissions;
CREATE TRIGGER update_streak_on_emission
    AFTER INSERT ON public.emissions
    FOR EACH ROW
    EXECUTE FUNCTION public.on_emission_inserted();

-- 5. FIX THE USER_ACHIEVEMENTS VIEW FOR PROPER JOINS
CREATE OR REPLACE VIEW public.user_achievements_view AS
SELECT 
    ua.id,
    ua.user_id,
    ua.earned_at,
    ua.tokens_earned,
    ad.name,
    ad.description,
    ad.emoji,
    ad.category
FROM public.user_achievements ua
INNER JOIN public.achievement_definitions ad ON ua.achievement_id = ad.id
WHERE ad.is_active = true;

-- Grant permissions
GRANT SELECT ON public.user_achievements_view TO authenticated;

-- 6. DROP AND RECREATE RPC FUNCTION FOR GETTING LEADERBOARD WITH EMISSIONS
-- Drop the existing function to allow changing the return type
DROP FUNCTION IF EXISTS public.get_leaderboard_with_emissions(TEXT, DATE);

CREATE OR REPLACE FUNCTION public.get_leaderboard_with_emissions(
    time_range TEXT DEFAULT 'weekly',
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days'
)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    eco_points INTEGER,
    total_emissions DECIMAL,
    recent_emissions DECIMAL,
    streak_count INTEGER,
    avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.full_name,
        p.email,
        p.eco_points,
        p.total_emissions,
        COALESCE(
            (SELECT SUM(e.amount) 
             FROM public.emissions e 
             WHERE e.user_id = p.id 
             AND e.created_at >= start_date::TIMESTAMP
            ), 0
        ) as recent_emissions,
        p.streak_count,
        p.avatar_url
    FROM public.user_profiles p
    ORDER BY 
        CASE 
            WHEN time_range = 'all-time' THEN p.total_emissions
            ELSE COALESCE(
                (SELECT SUM(e.amount) 
                 FROM public.emissions e 
                 WHERE e.user_id = p.id 
                 AND e.created_at >= start_date::TIMESTAMP
                ), 0
            )
        END ASC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. UPDATE EXISTING USERS' STREAKS
DO $$
DECLARE
    v_user RECORD;
BEGIN
    -- Update streak for all existing users
    FOR v_user IN SELECT id FROM public.user_profiles
    LOOP
        PERFORM public.update_user_streak_and_achievements(v_user.id);
    END LOOP;
END $$;

-- 8. AWARD SAMPLE ACHIEVEMENTS FOR TESTING (OPTIONAL)
-- This will give some users achievements to display
INSERT INTO public.user_achievements (user_id, achievement_id, tokens_earned, earned_at)
SELECT 
    p.id as user_id,
    a.id as achievement_id,
    a.reward_tokens,
    NOW() - INTERVAL '1 day' * (RANDOM() * 30)::INTEGER
FROM 
    public.user_profiles p
    CROSS JOIN public.achievement_definitions a
WHERE 
    p.eco_points > 0
    AND a.name IN ('First Steps', 'Week Warrior')
    AND RANDOM() < 0.5  -- 50% chance to have each achievement
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_user_streak(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_streak_and_achievements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_with_emissions(TEXT, DATE) TO authenticated;