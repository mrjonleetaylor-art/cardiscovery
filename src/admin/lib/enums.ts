export interface EnumOption {
  value: string;
  label: string;
  synonyms?: string[];
}

function enumMatchKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s/g, '');
}

export const BODY_TYPES: EnumOption[] = [
  { value: 'sedan', label: 'Sedan', synonyms: ['saloon'] },
  { value: 'wagon', label: 'Wagon', synonyms: ['estate'] },
  { value: 'hatch', label: 'Hatch', synonyms: ['hatchback'] },
  { value: 'suv', label: 'SUV', synonyms: ['crossover'] },
  { value: 'ute', label: 'Ute', synonyms: ['pickup', 'pick up'] },
  { value: 'coupe', label: 'Coupe', synonyms: ['coupé'] },
  { value: 'convertible', label: 'Convertible', synonyms: ['cabriolet', 'roadster'] },
  { value: 'van', label: 'Van' },
  { value: 'people_mover', label: 'People Mover', synonyms: ['people mover', 'mpv', 'minivan'] },
];

export const FUEL_TYPES: EnumOption[] = [
  {
    value: 'petrol',
    label: 'Petrol',
    synonyms: ['gasoline', 'gas', 'unleaded', 'petrol turbo', 'turbo petrol'],
  },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Electric', synonyms: ['ev', 'bev', 'battery electric'] },
  { value: 'hybrid', label: 'Hybrid', synonyms: ['hev', 'self charging hybrid', 'self-charging hybrid'] },
  { value: 'phev', label: 'PHEV', synonyms: ['plug in hybrid', 'plug-in hybrid'] },
];

export const DRIVETRAINS: EnumOption[] = [
  { value: 'fwd', label: 'FWD', synonyms: ['front wheel drive', 'front-wheel drive'] },
  { value: 'rwd', label: 'RWD', synonyms: ['rear wheel drive', 'rear-wheel drive'] },
  { value: 'awd', label: 'AWD', synonyms: ['all wheel drive', 'all-wheel drive'] },
  { value: 'four_wd', label: '4WD', synonyms: ['4wd', '4x4', 'four wheel drive', 'four-wheel drive'] },
];

export const TRANSMISSIONS: EnumOption[] = [
  { value: 'manual', label: 'Manual', synonyms: ['mt'] },
  {
    value: 'automatic',
    label: 'Automatic',
    synonyms: [
      'auto',
      '8 speed auto',
      '8-speed automatic',
      '7 speed auto',
      '6 speed auto',
      'torque converter auto',
      '6-speed automatic',
      'automatic 6 speed',
      'automatic 8 speed',
      'automatic (6-speed)',
    ],
  },
  { value: 'dct', label: 'DCT', synonyms: ['dual clutch', 'dual-clutch', 'dual clutch transmission'] },
  { value: 'cvt', label: 'CVT', synonyms: ['continuously variable', 'continuously variable transmission'] },
  {
    value: 'single_speed',
    label: 'Single-speed',
    synonyms: ['single speed', 'single-speed automatic', 'single-speed direct drive', '1-speed', '1 speed'],
  },
];

export function normalizeEnum(
  input: string | null | undefined,
  enumList: EnumOption[],
): string | null {
  if (!input || !input.trim()) return null;
  const key = enumMatchKey(input);
  for (const option of enumList) {
    if (enumMatchKey(option.value) === key) return option.value;
    if (enumMatchKey(option.label) === key) return option.value;
    for (const synonym of option.synonyms ?? []) {
      if (enumMatchKey(synonym) === key) return option.value;
    }
  }
  return null;
}

export function suggestEnumLabel(
  input: string | null | undefined,
  enumList: EnumOption[],
): string | null {
  if (!input || !input.trim()) return null;
  const key = enumMatchKey(input);

  for (const option of enumList) {
    const candidates = [option.value, option.label, ...(option.synonyms ?? [])];
    for (const candidate of candidates) {
      const candidateKey = enumMatchKey(candidate);
      if (!candidateKey) continue;
      if (key.includes(candidateKey) || candidateKey.includes(key)) {
        return option.label;
      }
    }
  }

  return null;
}

export function isValidEnum(value: string | null | undefined, enumList: EnumOption[]): boolean {
  if (!value) return false;
  return enumList.some((option) => option.value === value);
}

export function labelFor(value: string | null | undefined, enumList: EnumOption[]): string {
  if (!value) return '';
  const direct = enumList.find((option) => option.value === value);
  if (direct) return direct.label;
  const normalized = normalizeEnum(value, enumList);
  if (!normalized) return value;
  return enumList.find((option) => option.value === normalized)?.label ?? value;
}

export function allowedEnumLabels(enumList: EnumOption[]): string {
  return enumList.map((option) => option.label).join(', ');
}

export function runEnumNormalizationSmokeTest(): string[] {
  const failures: string[] = [];
  const assertNormalization = (input: string, expected: string, enumList: EnumOption[], name: string) => {
    const actual = normalizeEnum(input, enumList);
    if (actual !== expected) {
      failures.push(`${name}: "${input}" -> ${String(actual)} (expected ${expected})`);
    }
  };

  assertNormalization('Petrol Turbo', 'petrol', FUEL_TYPES, 'fuel');
  assertNormalization('Turbo Petrol', 'petrol', FUEL_TYPES, 'fuel');
  assertNormalization('Unleaded', 'petrol', FUEL_TYPES, 'fuel');
  assertNormalization('Gasoline', 'petrol', FUEL_TYPES, 'fuel');
  assertNormalization('EV', 'electric', FUEL_TYPES, 'fuel');
  assertNormalization('BEV', 'electric', FUEL_TYPES, 'fuel');

  assertNormalization('6-speed automatic', 'automatic', TRANSMISSIONS, 'transmission');
  assertNormalization('8-speed auto', 'automatic', TRANSMISSIONS, 'transmission');
  assertNormalization('Automatic (6-speed)', 'automatic', TRANSMISSIONS, 'transmission');
  assertNormalization('Auto', 'automatic', TRANSMISSIONS, 'transmission');
  assertNormalization('DCT', 'dct', TRANSMISSIONS, 'transmission');
  assertNormalization('Dual clutch', 'dct', TRANSMISSIONS, 'transmission');
  assertNormalization('Dual-clutch', 'dct', TRANSMISSIONS, 'transmission');
  assertNormalization('Single-speed direct drive', 'single_speed', TRANSMISSIONS, 'transmission');
  assertNormalization('Single speed', 'single_speed', TRANSMISSIONS, 'transmission');
  assertNormalization('1-speed', 'single_speed', TRANSMISSIONS, 'transmission');

  return failures;
}
