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

  return `You are an automotive analyst. A buyer is comparing two vehicles. Analyse the data and return a structured verdict as valid JSON.

Vehicle A: ${JSON.stringify(summarise(v1))}
Vehicle B: ${JSON.stringify(summarise(v2))}

Return this exact JSON shape:
{
  "v1_wins": ["Point one", "Point two", "Point three"],
  "v2_wins": ["Point one", "Point two", "Point three"],
  "verdict": "One sentence, two clauses separated by a full stop or period."
}

Rules:
- verdict: one conversational sentence — a straight recommendation a knowledgeable friend would give. Name the specific features that matter and mention the price difference in dollars. No robotic phrasing like "suits buyers who prioritize". No marketing language. No emoji. Example: "For families, the CX-5 is the stronger buy — better fuel economy, higher towing capacity, and a premium sound system for just $1,410 more than the Tucson."
- v1_wins: up to 3 advantages Vehicle A has over Vehicle B. Each point 3-5 words, plain English, no numbers.
- v2_wins: up to 3 advantages Vehicle B has over Vehicle A. Each point 3-5 words, plain English, no numbers.
- Return valid JSON only. No markdown fences, no preamble, no explanation outside the JSON.`;
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
