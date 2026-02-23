/*
  # Create initial schema for car lookup application

  1. New Tables
    - `vehicles` - Store car inventory data
      - `id` (uuid, primary key)
      - `make` (text) - Car manufacturer
      - `model` (text) - Car model
      - `year` (integer) - Model year
      - `trim` (text) - Trim level
      - `vin` (text, unique) - Vehicle Identification Number
      - `price` (decimal) - Current price
      - `mileage` (integer) - Current mileage
      - `transmission` (text) - Transmission type
      - `engine` (text) - Engine specifications
      - `fuel_type` (text) - Fuel type (gas, electric, hybrid, etc)
      - `exterior_color` (text) - Exterior color
      - `interior_color` (text) - Interior color
      - `features` (text[]) - List of features
      - `image_url` (text) - Main vehicle image
      - `dealership_id` (uuid, foreign key)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `dealerships` - Store dealership information
      - `id` (uuid, primary key)
      - `name` (text) - Dealership name
      - `address` (text) - Physical address
      - `phone` (text) - Contact phone
      - `website` (text) - Dealership website
      - `created_at` (timestamp)

    - `user_garage` - User's saved/favorited vehicles
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `vehicle_id` (uuid, foreign key)
      - `notes` (text) - User notes about the vehicle
      - `added_at` (timestamp)

    - `vehicle_comparisons` - Track vehicle comparisons
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `vehicle_ids` (uuid[]) - Array of vehicle IDs being compared
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Public read access for vehicles and dealerships
    - Authenticated users can manage their garage and comparisons

  3. Important Notes
    - Vehicles table has public read access for browsing
    - User garage is private per user
    - Comparisons are tracked for user experience
    - All tables include timestamps for audit trails
*/

CREATE TABLE IF NOT EXISTS dealerships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  phone text,
  website text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  trim text,
  vin text UNIQUE,
  price decimal(10, 2),
  mileage integer,
  transmission text,
  engine text,
  fuel_type text,
  exterior_color text,
  interior_color text,
  features text[] DEFAULT '{}',
  image_url text,
  dealership_id uuid REFERENCES dealerships(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_garage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  notes text,
  added_at timestamptz DEFAULT now(),
  UNIQUE(user_id, vehicle_id)
);

CREATE TABLE IF NOT EXISTS vehicle_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_ids uuid[] NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dealerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_garage ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealerships are publicly readable"
  ON dealerships FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Vehicles are publicly readable"
  ON vehicles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can read their own garage"
  ON user_garage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add vehicles to their garage"
  ON user_garage FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own garage entries"
  ON user_garage FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own garage entries"
  ON user_garage FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read their own comparisons"
  ON vehicle_comparisons FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create comparisons"
  ON vehicle_comparisons FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comparisons"
  ON vehicle_comparisons FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS vehicles_make_model_idx ON vehicles(make, model);
CREATE INDEX IF NOT EXISTS vehicles_year_idx ON vehicles(year);
CREATE INDEX IF NOT EXISTS vehicles_price_idx ON vehicles(price);
CREATE INDEX IF NOT EXISTS user_garage_user_id_idx ON user_garage(user_id);
CREATE INDEX IF NOT EXISTS vehicle_comparisons_user_id_idx ON vehicle_comparisons(user_id);
