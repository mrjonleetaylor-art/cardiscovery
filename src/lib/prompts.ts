import { StructuredVehicle } from '../types/specs';

/**
 * Builds the prompt for the AI comparison narrator.
 * Passes a condensed summary of each vehicle and instructs Claude to write
 * 2-3 sentences of plain-English analysis.
 */
export function buildComparisonPrompt(
  v1: StructuredVehicle,
  v2: StructuredVehicle,
): string {
  const summarise = (v: StructuredVehicle) => {
    const trim = v.trims[0];
    const s = trim?.specs;
    return {
      vehicle: `${v.year} ${v.make} ${v.model}`,
      trim: trim?.name ?? 'Base',
      price: trim?.basePrice ? `$${trim.basePrice.toLocaleString()}` : 'unknown',
      fuelType: s?.overview.fuelType ?? null,
      drivetrain: s?.overview.drivetrain ?? null,
      seats: s?.overview.seating ?? null,
      fuelEconomy: s?.efficiency.fuelEconomy ?? null,
      estimatedRange: s?.efficiency.estimatedRange ?? null,
      annualRunningCost: s?.efficiency.annualRunningCost ?? null,
      ancapRating: s?.safety.ancapRating ?? null,
      bootSpace: s?.dimensions?.bootSpace ?? null,
      towingCapacity: s?.dimensions?.towingCapacity ?? null,
    };
  };

  return `You are an automotive analyst. A buyer is comparing two vehicles. Write 2-3 sentences of plain-English analysis about what the data means for a real buying decision. Cover which car wins on value, practicality, or performance, and who each is best suited for.

Vehicle A: ${JSON.stringify(summarise(v1))}
Vehicle B: ${JSON.stringify(summarise(v2))}

Rules:
- Direct and analytical tone. No marketing language. No emoji.
- 2-3 sentences only.
- Plain text only — no JSON, no markdown, no bullet points, no headers.`;
}

/**
 * Builds the prompt sent to Claude for vehicle recommendations.
 * Only passes a condensed vehicle summary — no full spec dump.
 */
export function buildRecommendationPrompt(
  query: string,
  vehicles: StructuredVehicle[],
): string {
  const vehicleList = vehicles.map((v) => ({
    id: v.id,
    make: v.make,
    model: v.model,
    year: v.year,
    price: v.trims[0]?.basePrice ?? 0,
    fuel: v.trims[0]?.specs.overview.fuelType ?? null,
    seats: v.trims[0]?.specs.overview.seating ?? null,
    drivetrain: v.trims[0]?.specs.overview.drivetrain ?? null,
  }));

  return `You are a car recommendation engine. A buyer has described what they are looking for. Match them to the best vehicles from the list below.

Buyer query: "${query}"

Available vehicles:
${JSON.stringify(vehicleList, null, 2)}

Return a JSON array of the top 5 matches (fewer if fewer are genuinely relevant). Each entry must have:
- "vehicleId": the exact id string from the list above
- "rank": integer starting at 1 (best match first)
- "reason": one concise sentence explaining why this vehicle fits the query — direct and analytical, no marketing language

Return valid JSON only. No markdown fences, no explanation, no prose outside the JSON array.

Example format:
[{"vehicleId":"example-id","rank":1,"reason":"Fits the brief because..."}]`;
}
