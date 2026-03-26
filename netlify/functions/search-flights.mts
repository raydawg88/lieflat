interface SearchRequest {
  origin: string;
  destination: string;
  destinationAirports: string[];
  dateRangeStart: string;
  dateRangeEnd: string;
  preferredCabin: string;
  allowPositioningFlights: boolean;
  nonstopOnly: boolean;
  flexibilityDays: number;
  gatewayInfo?: { code: string; trainTo: string; trainMinutes: number; trainCostUSD: number }[];
}

function buildPrompt(req: SearchRequest): string {
  const cabinLabel = req.preferredCabin === "first" ? "First Class" :
    req.preferredCabin === "premium_economy" ? "Premium Economy" : "Business Class";

  const gwInfo = req.gatewayInfo ?? [];
  const gatewayLines = gwInfo.length > 0
    ? gwInfo.map((g) => `  - ${g.code}: ${g.trainMinutes} min train to ${g.trainTo} (~$${g.trainCostUSD})`).join("\n")
    : `  - ${req.destinationAirports.join(", ")}`;

  return `Search for real ${cabinLabel} flights from ${req.origin} to reach ${req.destination}.

I can fly into any of these airports and take ground transport:
${gatewayLines}

Dates: departing ${req.dateRangeStart}${req.dateRangeEnd !== req.dateRangeStart ? `, returning ${req.dateRangeEnd}` : " (one-way)"}
${req.nonstopOnly ? "NONSTOP FLIGHTS ONLY — no connections." : "Connections are OK."}

Search Google Flights for current ${cabinLabel.toLowerCase()} prices from ${req.origin} to each of these airports. Return the cheapest real ${cabinLabel.toLowerCase()} fare to each airport.

Return JSON: {"opportunities":[{"headline":"DFW → BRU: Delta ${cabinLabel} on A330 — $X,XXX + 55min train","totalPriceCents":310000,"fares":[{"segments":[{"airline":"DL","flightNumber":"DL 123","origin":"DFW","destination":"BRU","departureTime":"${req.dateRangeStart}T17:00:00Z","arrivalTime":"${req.dateRangeStart}T09:00:00Z","cabinClass":"${req.preferredCabin}","aircraft":"A330-900neo","isLieFlat":true,"nonstop":true}],"totalPriceCents":310000,"sourceName":"Google Flights","bookingUrl":"https://www.google.com/travel/flights?q=Flights+to+BRU+from+DFW+on+${req.dateRangeStart}+one+way+${cabinLabel.toLowerCase().replace(/ /g, "+")}","bookingInstructions":["Go to Google Flights","Search DFW to BRU, ${cabinLabel}, one-way, ${req.dateRangeStart}","Book the cheapest ${cabinLabel.toLowerCase()} option"],"pointsCost":null}]}]}

RULES:
- ONE result per gateway airport so I can compare
- headline: "${req.origin} → [AIRPORT]: [airline] [class] on [aircraft] — $X,XXX + [train time] to ${req.destination}"
- REAL current prices from Google Flights — search and verify
- bookingUrl: https://www.google.com/travel/flights?q=Flights+to+[AIRPORT]+from+${req.origin}+on+${req.dateRangeStart}+one+way+${cabinLabel.toLowerCase().replace(/ /g, "+")}
- isLieFlat: true for flat beds, false for angled or standard seats
- ${req.nonstopOnly ? "ONLY include nonstop flights. If no nonstop exists to an airport, skip it." : ""}`;
}

export default async (req: Request) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: "GEMINI_API_KEY not set" }), { status: 500, headers });

  let body: SearchRequest;
  try { body = (await req.json()) as SearchRequest; }
  catch { return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers }); }

  const prompt = buildPrompt(body);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!res.ok) {
      // If grounding fails, retry without it
      const retryRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });

      if (!retryRes.ok) {
        const errText = await retryRes.text();
        return new Response(JSON.stringify({ error: "Gemini error", details: errText.slice(0, 200) }), { status: 502, headers });
      }

      const data = await retryRes.json() as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      return new Response(JSON.stringify(JSON.parse(text)), { status: 200, headers });
    }

    const data = await res.json() as any;
    // With grounding, the text might be in different parts
    let rawText = "";
    for (const part of data?.candidates?.[0]?.content?.parts ?? []) {
      if (part.text) rawText += part.text;
    }

    if (!rawText) {
      return new Response(JSON.stringify({ error: "Empty response from Gemini" }), { status: 502, headers });
    }

    const parsed = JSON.parse(rawText);
    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...headers, "Cache-Control": "public, max-age=1800" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? "Unknown error" }), { status: 500, headers });
  }
};
