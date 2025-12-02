-- Create descending indexes on created_at columns for optimal sorting
-- This ensures efficient querying when sorting tables by created_at in descending order

-- Analytics events
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at_desc 
ON analytics_events (created_at DESC);

-- Callback requests
CREATE INDEX IF NOT EXISTS idx_callback_requests_created_at_desc 
ON callback_requests (created_at DESC);

-- Dosha calculations
CREATE INDEX IF NOT EXISTS idx_dosha_calculations_created_at_desc 
ON dosha_calculations (created_at DESC);

-- Dosha calculator2
CREATE INDEX IF NOT EXISTS idx_dosha_calculator2_created_at_desc 
ON dosha_calculator2 (created_at DESC);

-- Experiments
CREATE INDEX IF NOT EXISTS idx_experiments_created_at_desc 
ON experiments (created_at DESC);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_created_at_desc 
ON profiles (created_at DESC);

-- Seer API logs
CREATE INDEX IF NOT EXISTS idx_seer_api_logs_created_at_desc 
ON seer_api_logs (created_at DESC);

-- Traffic sources
CREATE INDEX IF NOT EXISTS idx_traffic_sources_created_at_desc 
ON traffic_sources (created_at DESC);

-- User roles
CREATE INDEX IF NOT EXISTS idx_user_roles_created_at_desc 
ON user_roles (created_at DESC);

-- Variant assignments
CREATE INDEX IF NOT EXISTS idx_variant_assignments_assigned_at_desc 
ON variant_assignments (assigned_at DESC);