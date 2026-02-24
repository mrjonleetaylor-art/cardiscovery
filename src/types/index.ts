export type JSONPrimitive = string | number | boolean | null;
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;
export interface JSONObject {
  [key: string]: JSONValue;
}
export type JSONArray = JSONValue[];

export interface TrimOption {
  name: string;
  price_adjustment: number;
  specs?: Record<string, string>;
}

export interface PackOption {
  category: string;
  name: string;
  price_adjustment: number;
  options: {
    name: string;
    price: number;
    description?: string;
  }[];
}

export interface VehicleSpecs {
  performance?: {
    acceleration?: string;
    top_speed?: string;
    power?: string;
    torque?: string;
  };
  tech?: {
    infotainment?: string;
    connectivity?: string[];
    driver_assist?: string[];
  };
  safety?: {
    airbags?: number;
    safety_rating?: string;
    features?: string[];
  };
  comfort?: {
    seating_capacity?: number;
    cargo_space?: string;
    features?: string[];
  };
  ownership?: {
    warranty?: string;
    service_interval?: string;
    fuel_economy?: string;
  };
  dimensions?: {
    length?: string;
    width?: string;
    height?: string;
    wheelbase?: string;
    weight?: string;
  };
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  trim?: string;
  vin?: string;
  price?: number;
  base_price?: number;
  mileage?: number;
  transmission?: string;
  engine?: string;
  fuel_type?: string;
  body_type?: string;
  exterior_color?: string;
  interior_color?: string;
  features?: string[];
  tags?: string[];
  ai_summary?: string;
  best_for?: string[];
  trade_offs?: string[];
  alternatives?: string[];
  image_url?: string;
  dealership_id?: string;
  specs?: VehicleSpecs;
  trim_options?: TrimOption[];
  pack_options?: PackOption[];
  created_at: string;
  updated_at: string;
}

export interface Dealership {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  created_at: string;
}

export interface GarageItem {
  id: string;
  user_id: string;
  vehicle_id: string;
  notes?: string;
  added_at: string;
  vehicle?: Vehicle;
}

export interface Comparison {
  id: string;
  user_id: string;
  vehicle_ids: string[];
  created_at: string;
}

export interface User {
  id: string;
  email: string;
}

export interface UserPreferences {
  id: string;
  user_id?: string;
  session_id?: string;
  monthly_kms?: number;
  driving_type?: string;
  can_charge_at_home?: boolean;
  priority?: string;
  timeline?: string;
  budget_min?: number;
  budget_max?: number;
  preferred_body_types?: string[];
  preferred_fuel_types?: string[];
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  user_id?: string;
  session_id?: string;
  name: string;
  email: string;
  postcode: string;
  contact_preference: string;
  timeline: string;
  has_trade_in: boolean;
  notes?: string;
  selected_vehicles: JSONValue;
  garage_vehicles: JSONValue;
  preferences: JSONValue;
  lead_summary?: string;
  status: string;
  assigned_dealer_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UserActivity {
  id: string;
  user_id?: string;
  session_id?: string;
  activity_type: string;
  vehicle_id: string;
  metadata?: JSONValue;
  created_at: string;
}
