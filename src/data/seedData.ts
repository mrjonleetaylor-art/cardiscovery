// MIGRATION REFERENCE ONLY — not imported anywhere in the app.
// This data has been seeded into Supabase. Do not import this file.
export const seedVehicles = [
  {
    make: 'Tesla',
    model: 'Model 3',
    year: 2024,
    trim: 'Standard Range',
    base_price: 63900,
    price: 63900,
    mileage: 0,
    transmission: 'Single-Speed Direct Drive',
    engine: 'Electric Motor',
    fuel_type: 'electric',
    body_type: 'Sedan',
    features: ['Autopilot', 'Premium Audio', '15" Touchscreen', 'Glass Roof', 'Power Folding Mirrors'],
    tags: ['electric', 'performance', 'tech-forward', 'efficient'],
    ai_summary: 'Perfect entry point to Tesla ownership with impressive range and technology',
    best_for: ['Tech enthusiasts', 'Daily commuters', 'First EV buyers', 'City drivers'],
    trade_offs: ['Rear-wheel drive only', 'Standard interior materials', 'Basic autopilot features'],
    image_url: 'https://images.pexels.com/photos/13861/IMG_3425.jpg',
    trim_options: [
      { name: 'Standard Range', price_adjustment: 0, specs: { range: '491 km', acceleration: '5.8s 0-100km/h', top_speed: '225 km/h' } },
      { name: 'Long Range', price_adjustment: 10000, specs: { range: '629 km', acceleration: '4.4s 0-100km/h', top_speed: '233 km/h' } },
      { name: 'Performance', price_adjustment: 20000, specs: { range: '567 km', acceleration: '3.1s 0-100km/h', top_speed: '261 km/h' } }
    ],
    pack_options: [
      {
        category: 'Interior',
        name: 'Interior Color',
        price_adjustment: 0,
        options: [
          { name: 'Black', price: 0, description: 'Premium black textile seats' },
          { name: 'White', price: 1500, description: 'Premium white vegan leather seats' }
        ]
      },
      {
        category: 'Driver Assist',
        name: 'Autopilot',
        price_adjustment: 0,
        options: [
          { name: 'Basic Autopilot', price: 0, description: 'Traffic-Aware Cruise Control and Autosteer' },
          { name: 'Enhanced Autopilot', price: 5100, description: 'Navigate on Autopilot, Auto Lane Change, Autopark, Summon' },
          { name: 'Full Self-Driving', price: 10100, description: 'All Enhanced features plus Traffic Light and Stop Sign Control' }
        ]
      }
    ],
    specs: {
      performance: { acceleration: '5.8s 0-100km/h', top_speed: '225 km/h', power: '194 kW', torque: '420 Nm' },
      tech: {
        infotainment: '15.4" Touchscreen',
        connectivity: ['Bluetooth', 'WiFi', 'LTE', 'Premium Audio'],
        driver_assist: ['Autopilot', 'Collision Warning', 'Emergency Braking', 'Blind Spot Warning']
      },
      safety: { airbags: 8, safety_rating: '5 stars', features: ['ABS', 'Traction Control', 'Stability Control', 'Lane Keeping Assist'] },
      comfort: { seating_capacity: 5, cargo_space: '561L', features: ['Heated Front Seats', 'Glass Roof', 'Premium Audio', 'Climate Control'] },
      ownership: { warranty: '4 years/80,000 km', service_interval: '24 months', fuel_economy: '0L/100km' },
      dimensions: { length: '4720mm', width: '1850mm', height: '1440mm', wheelbase: '2875mm', weight: '1752kg' }
    }
  },
  {
    make: 'Tesla',
    model: 'Model Y',
    year: 2024,
    trim: 'Long Range',
    base_price: 73900,
    price: 73900,
    mileage: 0,
    transmission: 'Single-Speed Direct Drive',
    engine: 'Dual Motor AWD',
    fuel_type: 'electric',
    body_type: 'SUV',
    features: ['Autopilot', 'Premium Audio', '15" Touchscreen', 'Glass Roof', 'Power Liftgate', 'AWD'],
    tags: ['electric', 'suv', 'family', 'tech-forward'],
    ai_summary: 'Versatile electric SUV combining practicality with Tesla performance',
    best_for: ['Families', 'Adventure seekers', 'Tech enthusiasts', 'All-weather drivers'],
    trade_offs: ['Higher price point', 'Firm ride quality', 'Premium features cost extra'],
    image_url: 'https://images.pexels.com/photos/13861/IMG_3425.jpg',
    trim_options: [
      { name: 'Long Range', price_adjustment: 0, specs: { range: '533 km', acceleration: '5.0s 0-100km/h', top_speed: '217 km/h' } },
      { name: 'Performance', price_adjustment: 16000, specs: { range: '514 km', acceleration: '3.5s 0-100km/h', top_speed: '250 km/h' } }
    ],
    pack_options: [
      {
        category: 'Interior',
        name: 'Interior Color',
        price_adjustment: 0,
        options: [
          { name: 'Black', price: 0, description: 'Premium black textile seats' },
          { name: 'White', price: 1500, description: 'Premium white vegan leather seats' }
        ]
      },
      {
        category: 'Seating',
        name: 'Seating Configuration',
        price_adjustment: 0,
        options: [
          { name: '5-Seater', price: 0, description: 'Standard five-seat configuration' },
          { name: '7-Seater', price: 4300, description: 'Third row seating for two additional passengers' }
        ]
      },
      {
        category: 'Driver Assist',
        name: 'Autopilot',
        price_adjustment: 0,
        options: [
          { name: 'Basic Autopilot', price: 0, description: 'Traffic-Aware Cruise Control and Autosteer' },
          { name: 'Enhanced Autopilot', price: 5100, description: 'Navigate on Autopilot, Auto Lane Change, Autopark, Summon' },
          { name: 'Full Self-Driving', price: 10100, description: 'All Enhanced features plus Traffic Light and Stop Sign Control' }
        ]
      }
    ],
    specs: {
      performance: { acceleration: '5.0s 0-100km/h', top_speed: '217 km/h', power: '324 kW', torque: '527 Nm' },
      tech: {
        infotainment: '15.4" Touchscreen',
        connectivity: ['Bluetooth', 'WiFi', 'LTE', 'Premium Audio'],
        driver_assist: ['Autopilot', 'Collision Warning', 'Emergency Braking', 'Blind Spot Warning']
      },
      safety: { airbags: 8, safety_rating: '5 stars', features: ['ABS', 'Traction Control', 'Stability Control', 'Lane Keeping Assist'] },
      comfort: { seating_capacity: 5, cargo_space: '2158L', features: ['Heated Front & Rear Seats', 'Glass Roof', 'Premium Audio', 'Tri-Zone Climate'] },
      ownership: { warranty: '4 years/80,000 km', service_interval: '24 months', fuel_economy: '0L/100km' },
      dimensions: { length: '4751mm', width: '1921mm', height: '1624mm', wheelbase: '2890mm', weight: '2003kg' }
    }
  },
  {
    make: 'BMW',
    model: 'M4',
    year: 2024,
    trim: 'Competition',
    base_price: 159900,
    price: 159900,
    mileage: 0,
    transmission: '8-Speed Automatic',
    engine: '3.0L Twin-Turbo I6',
    fuel_type: 'gasoline',
    body_type: 'Coupe',
    features: ['M Sport Brakes', 'Harman Kardon Audio', 'Head-Up Display', 'Carbon Fiber Roof', 'Adaptive M Suspension'],
    tags: ['performance', 'luxury', 'sports-car', 'premium'],
    ai_summary: 'Track-ready performance coupe with everyday usability',
    best_for: ['Performance enthusiasts', 'Track day drivers', 'Luxury buyers', 'Speed seekers'],
    trade_offs: ['Firm ride', 'Higher running costs', 'Limited rear space'],
    image_url: 'https://images.pexels.com/photos/3752169/pexels-photo-3752169.jpeg',
    trim_options: [
      { name: 'M4', price_adjustment: -40000, specs: { power: '353 kW', acceleration: '4.2s 0-100km/h' } },
      { name: 'Competition', price_adjustment: 0, specs: { power: '375 kW', acceleration: '3.9s 0-100km/h' } },
      { name: 'CSL', price_adjustment: 60000, specs: { power: '405 kW', acceleration: '3.7s 0-100km/h' } }
    ],
    specs: {
      performance: { acceleration: '3.9s 0-100km/h', top_speed: '250 km/h', power: '375 kW', torque: '650 Nm' },
      tech: { infotainment: 'iDrive 8.5 with 12.3" Display', connectivity: ['Apple CarPlay', 'Android Auto', 'WiFi', '5G'] },
      safety: { airbags: 6, safety_rating: '5 stars', features: ['ABS', 'DSC', 'Active Protection'] },
      comfort: { seating_capacity: 4, cargo_space: '440L', features: ['M Sport Seats', 'Dual-Zone Climate', 'Ambient Lighting'] },
      ownership: { warranty: '3 years/unlimited km', service_interval: '12 months/15,000 km', fuel_economy: '10.2L/100km' },
      dimensions: { length: '4794mm', width: '1887mm', height: '1393mm', wheelbase: '2857mm', weight: '1725kg' }
    }
  },
  {
    make: 'BMW',
    model: 'X5',
    year: 2024,
    trim: 'xDrive40i',
    base_price: 135900,
    price: 135900,
    mileage: 0,
    transmission: '8-Speed Automatic',
    engine: '3.0L Turbo I6',
    fuel_type: 'gasoline',
    body_type: 'SUV',
    features: ['Panoramic Sunroof', 'Harman Kardon Audio', 'Head-Up Display', 'Air Suspension', 'Gesture Control'],
    tags: ['luxury', 'suv', 'family', 'spacious'],
    ai_summary: 'Luxury SUV blending comfort, technology, and capability',
    best_for: ['Families', 'Luxury buyers', 'Long-distance drivers', 'Tech enthusiasts'],
    trade_offs: ['Higher fuel consumption', 'Expensive servicing', 'Complex technology'],
    image_url: 'https://images.pexels.com/photos/3752169/pexels-photo-3752169.jpeg',
    specs: {
      performance: { acceleration: '5.5s 0-100km/h', top_speed: '243 km/h', power: '250 kW', torque: '450 Nm' },
      ownership: { warranty: '3 years/unlimited km', service_interval: '12 months/15,000 km', fuel_economy: '9.4L/100km' }
    }
  },
  {
    make: 'BMW',
    model: '3 Series',
    year: 2024,
    trim: '330i',
    base_price: 89900,
    price: 89900,
    mileage: 0,
    transmission: '8-Speed Automatic',
    engine: '2.0L Turbo I4',
    fuel_type: 'gasoline',
    body_type: 'Sedan',
    features: ['LED Headlights', 'Digital Cockpit', 'Apple CarPlay', 'Parking Sensors', 'Cruise Control'],
    tags: ['sport-sedan', 'luxury', 'performance', 'executive'],
    ai_summary: 'The ultimate driving machine balancing performance and luxury',
    best_for: ['Driving enthusiasts', 'Business professionals', 'Daily drivers', 'Premium buyers'],
    trade_offs: ['Premium fuel required', 'Firm sport suspension', 'Options can add up'],
    image_url: 'https://images.pexels.com/photos/3752169/pexels-photo-3752169.jpeg',
    specs: {
      performance: { acceleration: '5.8s 0-100km/h', top_speed: '250 km/h', power: '190 kW', torque: '400 Nm' },
      ownership: { warranty: '3 years/unlimited km', service_interval: '12 months/15,000 km', fuel_economy: '6.8L/100km' }
    }
  },
  {
    make: 'BMW',
    model: 'X3',
    year: 2024,
    trim: 'xDrive30i',
    base_price: 99900,
    price: 99900,
    mileage: 0,
    transmission: '8-Speed Automatic',
    engine: '2.0L Turbo I4',
    fuel_type: 'gasoline',
    body_type: 'SUV',
    features: ['Panoramic Sunroof', 'Power Tailgate', 'Ambient Lighting', 'Heated Seats', 'Navigation'],
    tags: ['suv', 'compact-luxury', 'versatile', 'awd'],
    ai_summary: 'Compact luxury SUV perfect for urban adventures',
    best_for: ['Small families', 'Urban drivers', 'Weekend adventurers', 'Premium seekers'],
    trade_offs: ['Tighter third row space', 'Higher running costs than rivals', 'Firm ride'],
    image_url: 'https://images.pexels.com/photos/3752169/pexels-photo-3752169.jpeg',
    specs: {
      performance: { acceleration: '6.0s 0-100km/h', top_speed: '230 km/h', power: '185 kW', torque: '350 Nm' },
      ownership: { warranty: '3 years/unlimited km', service_interval: '12 months/15,000 km', fuel_economy: '7.9L/100km' }
    }
  },
  {
    make: 'BMW',
    model: '5 Series',
    year: 2024,
    trim: '530i',
    base_price: 129900,
    price: 129900,
    mileage: 0,
    transmission: '8-Speed Automatic',
    engine: '2.0L Turbo I4',
    fuel_type: 'gasoline',
    body_type: 'Sedan',
    features: ['Executive Package', 'Gesture Control', 'Laser Lights', 'Massage Seats', '4-Zone Climate'],
    tags: ['executive', 'luxury', 'technology', 'comfort'],
    ai_summary: 'Executive sedan with cutting-edge technology and refined comfort',
    best_for: ['Business executives', 'Long-distance drivers', 'Tech enthusiasts', 'Comfort seekers'],
    trade_offs: ['Complex tech learning curve', 'Expensive options', 'Large footprint'],
    image_url: 'https://images.pexels.com/photos/3752169/pexels-photo-3752169.jpeg',
    specs: {
      performance: { acceleration: '6.2s 0-100km/h', top_speed: '250 km/h', power: '190 kW', torque: '400 Nm' },
      ownership: { warranty: '3 years/unlimited km', service_interval: '12 months/15,000 km', fuel_economy: '7.1L/100km' }
    }
  },
  {
    make: 'BMW',
    model: 'X7',
    year: 2024,
    trim: 'xDrive40i',
    base_price: 169900,
    price: 169900,
    mileage: 0,
    transmission: '8-Speed Automatic',
    engine: '3.0L Turbo I6',
    fuel_type: 'gasoline',
    body_type: 'SUV',
    features: ['7-Seater', 'Sky Lounge Panoramic Roof', 'Bowers & Wilkins Audio', 'Executive Lounge Seating', 'Air Suspension'],
    tags: ['luxury-suv', 'family', 'spacious', 'premium'],
    ai_summary: 'BMW flagship SUV offering ultimate space and luxury',
    best_for: ['Large families', 'Luxury seekers', 'Road trip enthusiasts', 'Status buyers'],
    trade_offs: ['High fuel consumption', 'Expensive to maintain', 'Large size in tight spaces'],
    image_url: 'https://images.pexels.com/photos/3752169/pexels-photo-3752169.jpeg',
    specs: {
      performance: { acceleration: '5.8s 0-100km/h', top_speed: '245 km/h', power: '250 kW', torque: '450 Nm' },
      ownership: { warranty: '3 years/unlimited km', service_interval: '12 months/15,000 km', fuel_economy: '10.7L/100km' }
    }
  },
  {
    make: 'BMW',
    model: 'iX',
    year: 2024,
    trim: 'xDrive40',
    base_price: 149900,
    price: 149900,
    mileage: 0,
    transmission: 'Single-Speed Automatic',
    engine: 'Dual Motor Electric',
    fuel_type: 'electric',
    body_type: 'SUV',
    features: ['Curved Display', 'Panoramic Roof', 'Bowers & Wilkins Audio', 'Crystal Controls', 'Air Suspension'],
    tags: ['electric', 'luxury-suv', 'tech-forward', 'sustainable'],
    ai_summary: 'BMW electric flagship combining luxury with zero emissions',
    best_for: ['EV enthusiasts', 'Luxury buyers', 'Tech lovers', 'Environmentally conscious'],
    trade_offs: ['Higher initial cost', 'Charging infrastructure needed', 'Polarizing design'],
    image_url: 'https://images.pexels.com/photos/3752169/pexels-photo-3752169.jpeg',
    specs: {
      performance: { acceleration: '6.1s 0-100km/h', top_speed: '200 km/h', power: '240 kW', torque: '630 Nm' },
      ownership: { warranty: '3 years/unlimited km', service_interval: '24 months', fuel_economy: '0L/100km' }
    }
  },
  {
    make: 'BMW',
    model: 'i4',
    year: 2024,
    trim: 'eDrive40',
    base_price: 119900,
    price: 119900,
    mileage: 0,
    transmission: 'Single-Speed Automatic',
    engine: 'Electric Motor',
    fuel_type: 'electric',
    body_type: 'Sedan',
    features: ['Curved Display', 'Sport Seats', 'Harman Kardon Audio', 'Adaptive Suspension', 'Heat Pump'],
    tags: ['electric', 'sport-sedan', 'tech-forward', 'performance'],
    ai_summary: 'Electric sports sedan delivering BMW driving dynamics with zero emissions',
    best_for: ['EV enthusiasts', 'Performance seekers', 'Tech adopters', 'Daily drivers'],
    trade_offs: ['Limited charging network', 'Firm sport suspension', 'Range anxiety for long trips'],
    image_url: 'https://images.pexels.com/photos/3752169/pexels-photo-3752169.jpeg',
    specs: {
      performance: { acceleration: '5.7s 0-100km/h', top_speed: '190 km/h', power: '250 kW', torque: '430 Nm' },
      ownership: { warranty: '3 years/unlimited km', service_interval: '24 months', fuel_economy: '0L/100km' }
    }
  },
  {
    make: 'BMW',
    model: 'M2',
    year: 2024,
    trim: 'Competition',
    base_price: 129900,
    price: 129900,
    mileage: 0,
    transmission: '8-Speed Automatic',
    engine: '3.0L Twin-Turbo I6',
    fuel_type: 'gasoline',
    body_type: 'Coupe',
    features: ['M Sport Brakes', 'Carbon Bucket Seats', 'Track Mode', 'Active M Differential', 'Harman Kardon Audio'],
    tags: ['performance', 'sports-car', 'compact', 'track-ready'],
    ai_summary: 'Pure driving machine offering track performance in a compact package',
    best_for: ['Track enthusiasts', 'Pure drivers', 'Canyon carvers', 'Weekend racers'],
    trade_offs: ['Firm ride', 'Limited practicality', 'Higher insurance costs'],
    image_url: 'https://images.pexels.com/photos/3752169/pexels-photo-3752169.jpeg',
    specs: {
      performance: { acceleration: '4.1s 0-100km/h', top_speed: '250 km/h', power: '338 kW', torque: '550 Nm' },
      ownership: { warranty: '3 years/unlimited km', service_interval: '12 months/15,000 km', fuel_economy: '9.8L/100km' }
    }
  },
  {
    make: 'BMW',
    model: 'X1',
    year: 2024,
    trim: 'sDrive20i',
    base_price: 69900,
    price: 69900,
    mileage: 0,
    transmission: '7-Speed Automatic',
    engine: '2.0L Turbo I4',
    fuel_type: 'gasoline',
    body_type: 'SUV',
    features: ['LED Headlights', 'Apple CarPlay', 'Parking Sensors', 'Ambient Lighting', 'Digital Cockpit'],
    tags: ['compact-suv', 'entry-luxury', 'efficient', 'practical'],
    ai_summary: 'Entry point to BMW luxury SUV ownership without compromising quality',
    best_for: ['First-time BMW buyers', 'Urban drivers', 'Small families', 'Efficiency seekers'],
    trade_offs: ['Front-wheel drive', 'Smaller cabin', 'Basic features in base trim'],
    image_url: 'https://images.pexels.com/photos/3752169/pexels-photo-3752169.jpeg',
    specs: {
      performance: { acceleration: '7.7s 0-100km/h', top_speed: '215 km/h', power: '141 kW', torque: '280 Nm' },
      ownership: { warranty: '3 years/unlimited km', service_interval: '12 months/15,000 km', fuel_economy: '6.4L/100km' }
    }
  }
];
