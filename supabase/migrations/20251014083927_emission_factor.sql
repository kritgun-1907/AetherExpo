-- Create emission_factors table for storing dynamic factors
CREATE TABLE IF NOT EXISTS emission_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('transport', 'food', 'home', 'shopping')),
    emission_factor DECIMAL NOT NULL,
    unit TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    source TEXT DEFAULT 'climatiq',
    region TEXT DEFAULT 'GLOBAL',
    year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    metadata JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create emission_calculations table for analytics
CREATE TABLE IF NOT EXISTS emission_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    activity TEXT NOT NULL,
    amount DECIMAL NOT NULL,
    emissions DECIMAL NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('climatiq', 'fallback', 'custom')),
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indices
CREATE INDEX idx_emission_factors_category ON emission_factors(category);
CREATE INDEX idx_emission_factors_active ON emission_factors(is_active);
CREATE INDEX idx_emission_calculations_user ON emission_calculations(user_id);
CREATE INDEX idx_emission_calculations_date ON emission_calculations(calculated_at DESC);

-- Enable RLS
ALTER TABLE emission_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE emission_calculations ENABLE ROW LEVEL SECURITY;

-- Policies for emission_factors (read-only for users)
CREATE POLICY "Anyone can read active emission factors" ON emission_factors
    FOR SELECT USING (is_active = true);

-- Policies for emission_calculations
CREATE POLICY "Users can insert own calculations" ON emission_calculations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own calculations" ON emission_calculations
    FOR SELECT USING (auth.uid() = user_id);

-- Function to update emission factors periodically
CREATE OR REPLACE FUNCTION update_emission_factors_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_emission_factors_updated_at
    BEFORE UPDATE ON emission_factors
    FOR EACH ROW
    EXECUTE FUNCTION update_emission_factors_timestamp();

-- Insert some initial emission factors
INSERT INTO emission_factors (activity_id, category, emission_factor, unit, label, description, source, region)
VALUES 
    -- Transport
    ('car_petrol', 'transport', 0.21, 'km', 'Petrol Car', 'Average petrol car emissions', 'default', 'GLOBAL'),
    ('car_diesel', 'transport', 0.17, 'km', 'Diesel Car', 'Average diesel car emissions', 'default', 'GLOBAL'),
    ('car_electric', 'transport', 0.05, 'km', 'Electric Car', 'Average electric car emissions', 'default', 'GLOBAL'),
    ('bus', 'transport', 0.089, 'km', 'Bus', 'Public bus transportation', 'default', 'GLOBAL'),
    ('train', 'transport', 0.041, 'km', 'Train', 'Railway transportation', 'default', 'GLOBAL'),
    ('flight_domestic', 'transport', 0.255, 'km', 'Domestic Flight', 'Domestic air travel', 'default', 'GLOBAL'),
    
    -- Food
    ('beef', 'food', 27, 'kg', 'Beef', 'Beef production emissions', 'default', 'GLOBAL'),
    ('chicken', 'food', 6.9, 'kg', 'Chicken', 'Chicken production emissions', 'default', 'GLOBAL'),
    ('vegetables', 'food', 2, 'kg', 'Vegetables', 'Fresh vegetables', 'default', 'GLOBAL'),
    ('dairy', 'food', 1.9, 'L', 'Dairy', 'Dairy products', 'default', 'GLOBAL'),
    
    -- Home
    ('electricity', 'home', 0.233, 'kWh', 'Electricity', 'Grid electricity', 'default', 'GLOBAL'),
    ('gas', 'home', 2.04, 'm³', 'Natural Gas', 'Natural gas heating', 'default', 'GLOBAL'),
    ('water', 'home', 0.0003, 'L', 'Water', 'Water supply and treatment', 'default', 'GLOBAL'),
    
    -- Shopping
    ('clothing', 'shopping', 8.11, 'item', 'Clothing', 'Average clothing item', 'default', 'GLOBAL'),
    ('electronics', 'shopping', 70, 'item', 'Electronics', 'Small electronic devices', 'default', 'GLOBAL')
ON CONFLICT (activity_id) DO NOTHING;

-- Function to get emission factor with fallback
CREATE OR REPLACE FUNCTION get_emission_factor(
    p_category TEXT,
    p_activity TEXT,
    p_region TEXT DEFAULT 'GLOBAL'
)
RETURNS TABLE(
    emission_factor DECIMAL,
    unit TEXT,
    source TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT ef.emission_factor, ef.unit, ef.source
    FROM emission_factors ef
    WHERE ef.category = p_category 
    AND ef.activity_id = p_activity
    AND ef.region = p_region
    AND ef.is_active = true
    ORDER BY ef.updated_at DESC
    LIMIT 1;
    
    -- If no result, try GLOBAL region
    IF NOT FOUND AND p_region != 'GLOBAL' THEN
        RETURN QUERY
        SELECT ef.emission_factor, ef.unit, ef.source
        FROM emission_factors ef
        WHERE ef.category = p_category 
        AND ef.activity_id = p_activity
        AND ef.region = 'GLOBAL'
        AND ef.is_active = true
        ORDER BY ef.updated_at DESC
        LIMIT 1;
    END IF;
END;
$$ LANGUAGE plpgsql;