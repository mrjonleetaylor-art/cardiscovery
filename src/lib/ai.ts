import { StructuredVehicle } from '../types/specs';

export interface AIRecommendation {
  vehicleId: string;
  rank: number;
  reason: string;
}

const FUNCTION_URL = 'https://dnmtnfeivwwhdqygdguv.supabase.co/functions/v1/ai-recommend';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Calls the ai-recommend Supabase Edge Function, which proxies to Anthropic.
 * Returns an empty array on any failure — never throws.
 */
export async function getAIRecommendations(
  query: string,
  vehicles: StructuredVehicle[],
): Promise<AIRecommendation[]> {
  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ query, vehicles }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI] Function error:', response.status, errorText);
      return [];
    }

    const data: unknown = await response.json();

    if (!Array.isArray(data)) {
      console.error('[AI] Unexpected response shape:', data);
      return [];
    }

    return (data as AIRecommendation[])
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
