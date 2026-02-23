export interface OverviewSpecs {
  bodyType?: string;
  fuelType?: string;
  drivetrain?: string;
  transmission?: string;
  seating?: number;
  warranty?: string;
}

export interface EfficiencySpecs {
  fuelEconomy?: string;
  realWorldEstimate?: string;
  fuelTank?: string;
  estimatedRange?: string;
  serviceInterval?: string;
  annualRunningCost?: string;
  ownershipSummary?: string;
}

export interface PerformanceSpecs {
  power?: string;
  torque?: string;
  zeroToHundred?: string;
  topSpeed?: string;
  weight?: string;
  powerToWeight?: string;
  suspension?: string;
  engine?: string;
  drivingCharacter?: string;
}

export interface ConnectivitySpecs {
  screenSize?: string;
  digitalCluster?: string;
  appleCarPlay?: string;
  androidAuto?: string;
  wirelessCharging?: string;
  soundSystem?: string;
  appSupport?: string;
  otaUpdates?: string;
  techSummary?: string;
}

export interface SafetySpecs {
  ancapRating?: string;
  adaptiveCruise?: string;
  blindSpotMonitoring?: string;
  laneKeepAssist?: string;
  aeb?: string;
  airbags?: number;
  rearCrossTraffic?: string;
  safetySummary?: string;
}

export interface StructuredSpecs {
  overview: OverviewSpecs;
  efficiency: EfficiencySpecs;
  performance: PerformanceSpecs;
  connectivity: ConnectivitySpecs;
  safety: SafetySpecs;
}

export interface SpecAdjustment {
  category: keyof StructuredSpecs;
  field: string;
  value: string | number;
}

export interface Pack {
  id: string;
  name: string;
  category: string;
  priceDelta: number;
  description?: string;
  features: string[];
  specAdjustments?: SpecAdjustment[];
}

export interface Trim {
  id: string;
  name: string;
  basePrice: number;
  specs: StructuredSpecs;
  packs: Pack[];
}

export interface StructuredVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  images: string[];
  tags?: string[];
  aiSummary?: string;
  bestFor?: string[];
  tradeOffs?: string[];
  positioningSummary?: string;
  trims: Trim[];
}

export interface ResolvedSpecs {
  specs: StructuredSpecs;
  totalPrice: number;
  selectedTrim: Trim;
  selectedPacks: Pack[];
}
