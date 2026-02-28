import { StructuredVehicle } from '../types/specs';

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
