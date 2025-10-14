-- Create tables for Autopilot integration
-- Run this migration in your Supabase SQL editor

-- Table for storing successful Autopilot matches
CREATE TABLE IF NOT EXISTS autopilot_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    suggestion_id TEXT NOT NULL,
    emission_factor_id TEXT,
    factor_name TEXT,
    similarity_score DECIMAL(3,2) CHECK (similarity_score >= 0 AND similarity_score <= 1),
    emissions_calculated DECIMAL,
    emissions_unit TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes separately
CREATE INDEX IF NOT EXISTS idx_autopilot_user ON autopilot_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_autopilot_description ON autopilot_matches(description);
CREATE INDEX IF NOT EXISTS idx_autopilot_similarity ON autopilot_matches(similarity_score DESC);

-- Table for caching Autopilot suggestions
CREATE TABLE IF NOT EXISTS autopilot_suggestion_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text TEXT NOT NULL,
    unit_type TEXT NOT NULL,
    region TEXT DEFAULT 'GLOBAL',
    suggestions JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint for cache key
    UNIQUE(query_text, unit_type, region)
);

-- Table for user preferences and frequently used activities
CREATE TABLE IF NOT EXISTS user_activity_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    default_quantity DECIMAL,
    default_unit TEXT,
    unit_type TEXT,
    suggestion_id TEXT,
    emission_factor JSONB,
    use_count INTEGER DEFAULT 0,
    last_used TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for user_activity_templates
CREATE INDEX IF NOT EXISTS idx_templates_user ON user_activity_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_use_count ON user_activity_templates(use_count DESC);

-- Enable RLS
ALTER TABLE autopilot_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE autopilot_suggestion_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own matches" ON autopilot_matches
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read cache" ON autopilot_suggestion_cache
    FOR SELECT USING (expires_at > NOW());

CREATE POLICY "System can manage cache" ON autopilot_suggestion_cache
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage own templates" ON user_activity_templates
    FOR ALL USING (auth.uid() = user_id);

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_autopilot_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM autopilot_suggestion_cache
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get most used activities for a user
CREATE OR REPLACE FUNCTION get_user_top_activities(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    description TEXT,
    suggestion_id TEXT,
    use_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        am.description,
        am.suggestion_id,
        COUNT(*) as use_count
    FROM autopilot_matches am
    WHERE am.user_id = p_user_id
    GROUP BY am.description, am.suggestion_id
    ORDER BY use_count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get emission factor statistics
CREATE OR REPLACE FUNCTION get_emission_factor_stats(
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
    total_calculations BIGINT,
    avg_confidence DECIMAL,
    total_emissions DECIMAL,
    unique_activities BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_calculations,
        AVG(similarity_score) as avg_confidence,
        SUM(emissions_calculated) as total_emissions,
        COUNT(DISTINCT description) as unique_activities
    FROM autopilot_matches
    WHERE p_user_id IS NULL OR user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;