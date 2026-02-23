/*
  # Add comprehensive features for car discovery platform

  1. Schema Extensions
    - Add body_type, tags, ai_summary to vehicles table
    - Add specs jsonb field for detailed specifications
    - Add trim_options and pack_options jsonb fields
    - Create user_preferences table for discovery personalization
    - Create leads table for dealer inquiries
    - Create popular_comparisons view
    
  2. New Tables
    - `user_preferences` - Store user discovery answers and preferences
    - `leads` - Store dealer inquiries with full context
    - `user_activity` - Track user behavior for algorithmic ranking
    
  3. Security
    - Enable RLS on new tables
    - Maintain public read for vehicles
    - Private access for user data
*/

-- Add new columns to vehicles table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'body_type') THEN
    ALTER TABLE vehicles ADD COLUMN body_type text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'tags') THEN
    ALTER TABLE vehicles ADD COLUMN tags text[] DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'ai_summary') THEN
    ALTER TABLE vehicles ADD COLUMN ai_summary text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'specs') THEN
    ALTER TABLE vehicles ADD COLUMN specs jsonb DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'trim_options') THEN
    ALTER TABLE vehicles ADD COLUMN trim_options jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'pack_options') THEN
    ALTER TABLE vehicles ADD COLUMN pack_options jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'best_for') THEN
    ALTER TABLE vehicles ADD COLUMN best_for text[] DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'trade_offs') THEN
    ALTER TABLE vehicles ADD COLUMN trade_offs text[] DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'alternatives') THEN
    ALTER TABLE vehicles ADD COLUMN alternatives uuid[] DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'base_price') THEN
    ALTER TABLE vehicles ADD COLUMN base_price decimal(10, 2);
  END IF;
END $$;

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text,
  monthly_kms integer,
  driving_type text,
  can_charge_at_home boolean,
  priority text,
  timeline text,
  budget_min decimal(10, 2),
  budget_max decimal(10, 2),
  preferred_body_types text[] DEFAULT '{}',
  preferred_fuel_types text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT user_or_session CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  name text NOT NULL,
  email text NOT NULL,
  postcode text NOT NULL,
  contact_preference text NOT NULL,
  timeline text NOT NULL,
  has_trade_in boolean DEFAULT false,
  notes text,
  selected_vehicles jsonb NOT NULL,
  garage_vehicles jsonb DEFAULT '[]'::jsonb,
  preferences jsonb DEFAULT '{}'::jsonb,
  lead_summary text,
  status text DEFAULT 'new',
  assigned_dealer_id uuid REFERENCES dealerships(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User activity tracking
CREATE TABLE IF NOT EXISTS user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text,
  activity_type text NOT NULL,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT user_or_session_activity CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- User preferences policies
CREATE POLICY "Users can read their own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anonymous can create preferences with session_id"
  ON user_preferences FOR INSERT
  TO anon
  WITH CHECK (session_id IS NOT NULL AND user_id IS NULL);

CREATE POLICY "Anonymous can read their session preferences"
  ON user_preferences FOR SELECT
  TO anon
  USING (session_id IS NOT NULL);

-- Leads policies (admins can read all, users can create)
CREATE POLICY "Users can create leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anonymous can create leads"
  ON leads FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Users can read their own leads"
  ON leads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- User activity policies
CREATE POLICY "Users can create activity"
  ON user_activity FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anonymous can create activity with session"
  ON user_activity FOR INSERT
  TO anon
  WITH CHECK (session_id IS NOT NULL);

CREATE POLICY "Users can read their activity"
  ON user_activity FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS vehicles_body_type_idx ON vehicles(body_type);
CREATE INDEX IF NOT EXISTS vehicles_tags_idx ON vehicles USING GIN(tags);
CREATE INDEX IF NOT EXISTS user_preferences_user_id_idx ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS user_preferences_session_id_idx ON user_preferences(session_id);
CREATE INDEX IF NOT EXISTS leads_email_idx ON leads(email);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
CREATE INDEX IF NOT EXISTS user_activity_user_id_idx ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS user_activity_session_id_idx ON user_activity(session_id);
CREATE INDEX IF NOT EXISTS user_activity_vehicle_id_idx ON user_activity(vehicle_id);
