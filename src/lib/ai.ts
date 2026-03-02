import { StructuredVehicle } from '../types/specs';
import { buildComparisonPrompt } from './prompts';
import { supabase } from './supabase';

export interface AIRecommendation {
  vehicleId: string;
  rank: number;
  reason: string;
}

export interface ComparisonNarration {
  v1_wins: string[];
  v2_wins: string[];
  verdict: string;
}

const FUNCTION_URL = 'https://dnmtnfeivwwhdqygdguv.supabase.co/functions/v1/ai-recommend';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let recommendController: AbortController | null = null;

/**
 * Calls the ai-recommend Supabase Edge Function, which proxies to Anthropic.
 * Returns an empty array on any failure — never throws.
 */
export async function getAIRecommendations(
  query: string,
  vehicles: StructuredVehicle[],
): Promise<AIRecommendation[]> {
  recommendController?.abort();
  recommendController = new AbortController();
  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      signal: recommendController.signal,
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
    if (err instanceof DOMException && err.name === 'AbortError') return [];
    console.error('[AI] Request failed:', err);
    return [];
  }
}

/**
 * Calls the ai-recommend Edge Function to generate a structured comparison
 * narration for two vehicles. Results are cached in comparison_cache by a
 * sorted vehicle-pair key. Returns null on any failure — never throws.
 */
export async function getComparisonNarration(
  v1: StructuredVehicle,
  v2: StructuredVehicle,
): Promise<ComparisonNarration | null> {
  const cacheKey = [v1.id, v2.id].sort().join('_vs_');

  // ── Cache read ──────────────────────────────────────────────────────────────
  try {
    const { data } = await supabase
      .from('comparison_cache')
      .select('narration')
      .eq('id', cacheKey)
      .maybeSingle();
    if (data?.narration) {
      return data.narration as ComparisonNarration;
    }
  } catch {
    // Cache miss or error — fall through to Edge Function
  }

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
      return null;
    }

    const data: unknown = await response.json();
    const text = (data as Record<string, unknown>)?.text;
    if (typeof text !== 'string') {
      console.error('[AI] Unexpected narration response shape:', data);
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error('[AI] Failed to parse narration JSON:', text);
      return null;
    }

    const n = parsed as Record<string, unknown>;
    if (!Array.isArray(n.v1_wins) || !Array.isArray(n.v2_wins) || typeof n.verdict !== 'string') {
      console.error('[AI] Narration JSON shape invalid:', parsed);
      return null;
    }

    const result: ComparisonNarration = {
      v1_wins: (n.v1_wins as unknown[]).filter((x): x is string => typeof x === 'string'),
      v2_wins: (n.v2_wins as unknown[]).filter((x): x is string => typeof x === 'string'),
      verdict: n.verdict,
    };

    // ── Cache write ───────────────────────────────────────────────────────────
    try {
      await supabase
        .from('comparison_cache')
        .insert({ id: cacheKey, narration: result });
    } catch {
      // Cache write failure is non-fatal
    }

    return result;
  } catch (err) {
    console.error('[AI] Narration request failed:', err);
    return null;
  }
}
