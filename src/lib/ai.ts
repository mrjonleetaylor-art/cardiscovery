import { StructuredVehicle } from '../types/specs';
import { buildRecommendationPrompt } from './prompts';

export interface AIRecommendation {
  vehicleId: string;
  rank: number;
  reason: string;
}

/**
 * Calls the Anthropic Messages API and returns ranked vehicle recommendations.
 * Returns an empty array on any failure — never throws.
 */
export async function getAIRecommendations(
  query: string,
  vehicles: StructuredVehicle[],
): Promise<AIRecommendation[]> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[AI] VITE_ANTHROPIC_API_KEY is not set');
    return [];
  }

  const prompt = buildRecommendationPrompt(query, vehicles);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI] API error:', response.status, errorText);
      return [];
    }

    const data = await response.json();
    const text: string = data.content?.[0]?.text ?? '';

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error('[AI] Failed to parse response as JSON:', text);
      return [];
    }

    if (!Array.isArray(parsed)) {
      console.error('[AI] Unexpected response shape:', text);
      return [];
    }

    return (parsed as AIRecommendation[])
      .filter(
        (r) =>
          typeof r.vehicleId === 'string' &&
          typeof r.rank === 'number' &&
          typeof r.reason === 'string',
      )
      .sort((a, b) => a.rank - b.rank);
  } catch (err) {
    console.error('[AI] Request failed:', err);
    return [];
  }
}
