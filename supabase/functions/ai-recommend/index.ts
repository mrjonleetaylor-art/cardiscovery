const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { query, vehicles } = await req.json();

    if (typeof query !== 'string' || !Array.isArray(vehicles)) {
      return json({ error: 'Invalid request body' }, 400);
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);
    }

    // Build condensed vehicle list — no full spec dump
    const vehicleList = vehicles.map((v: Record<string, unknown>) => {
      const trims = v.trims as Array<Record<string, unknown>> | undefined;
      const trim0 = trims?.[0];
      const overview = (trim0?.specs as Record<string, unknown> | undefined)?.overview as Record<string, unknown> | undefined;
      return {
        id: v.id,
        make: v.make,
        model: v.model,
        year: v.year,
        price: (trim0?.basePrice as number) ?? 0,
        fuel: overview?.fuelType ?? null,
        seats: overview?.seating ?? null,
        drivetrain: overview?.drivetrain ?? null,
      };
    });

    const prompt =
      `You are a car recommendation engine. A buyer has described what they are looking for. Match them to the best vehicles from the list below.\n\n` +
      `Buyer query: "${query}"\n\n` +
      `Available vehicles:\n${JSON.stringify(vehicleList, null, 2)}\n\n` +
      `Return a JSON array of the top 5 matches (fewer if fewer are genuinely relevant). Each entry must have:\n` +
      `- "vehicleId": the exact id string from the list above\n` +
      `- "rank": integer starting at 1 (best match first)\n` +
      `- "reason": one concise sentence explaining why this vehicle fits the query — direct and analytical, no marketing language\n\n` +
      `Return valid JSON only. No markdown fences, no explanation, no prose outside the JSON array.\n\n` +
      `Example format:\n[{"vehicleId":"example-id","rank":1,"reason":"Fits the brief because..."}]`;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      return json({ error: errText }, anthropicRes.status);
    }

    const data = await anthropicRes.json();
    const text: string = data.content?.[0]?.text ?? '';

    let recommendations: unknown;
    try {
      recommendations = JSON.parse(text);
    } catch {
      return json({ error: 'Failed to parse AI response', raw: text }, 500);
    }

    return json(recommendations);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
