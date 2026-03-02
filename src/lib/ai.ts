import { StructuredVehicle } from '../types/specs';
import { buildComparisonPrompt } from './prompts';

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

/**
 * Calls the ai-recommend Edge Function to generate a plain-English comparison
 * narration for two vehicles. Returns '' on any failure — never throws.
 */
export async function getComparisonNarration(
  v1: StructuredVehicle,
  v2: StructuredVehicle,
): Promise<string> {
  try {
    const prompt = buildComparisonPrompt(v1, v2);
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ type: 'narration', prompt }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI] Narration error:', response.status, errorText);
      return '';
    }

    const data: unknown = await response.json();
    if (typeof (data as Record<string, unknown>)?.text !== 'string') {
      console.error('[AI] Unexpected narration response shape:', data);
      return '';
    }

    return (data as { text: string }).text;
  } catch (err) {
    console.error('[AI] Narration request failed:', err);
    return '';
  }
}
