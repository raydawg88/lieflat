interface SearchRequest {
  origin: string;
  destination: string;
  destinationAirports: string[];
  dateRangeStart: string;
  dateRangeEnd: string;
  preferredCabin: string;
  allowPositioningFlights: boolean;
  flexibilityDays: number;
  /** Ground transfer info for each gateway airport, passed from the client */
  gatewayInfo?: { code: string; trainTo: string; trainMinutes: number; trainCostUSD: number }[];
}

const GEMINI_MODELS = ["gemini-2.5-flash"];

function buildPrompt(req: SearchRequest): string {
  const gwInfo = req.gatewayInfo ?? [];
  const gatewayLines = gwInfo.map(
    (g) => `  - Fly to ${g.code}, then ${g.trainMinutes} min train to ${g.trainTo} (~$${g.trainCostUSD})`
  ).join("\n");

  return `I want to get to ${req.destination}. I'm flying from ${req.origin} between ${req.dateRangeStart} and ${req.dateRangeEnd} (±${req.flexibilityDays} days).

I don't care which airport I land at — I'll take a train to my destination. Here are my gateway airports and the train to ${req.destination}:
${gatewayLines || `  - ${req.destinationAirports.join(", ")}`}

Find me the cheapest lie-flat business class flight to EACH of these airports. I want to compare: is it cheaper to fly to Brussels, Amsterdam, Paris, or London and take a train?${req.allowPositioningFlights ? " Also consider positioning flights (cheap economy domestic to a US hub, then lie-flat transatlantic booked as a separate ticket)." : ""}

Return 4 opportunities as JSON. Each one should fly to a DIFFERENT gateway airport so I can compare.

JSON format: {"opportunities":[{"headline":"DFW → CDG: Lie-flat on AF A350 for $2,800 + 3.5h train to Ghent","totalPriceCents":280000,"fares":[{"segments":[{"airline":"AF","flightNumber":"AF 639","origin":"DFW","destination":"CDG","departureTime":"2026-06-15T17:00:00Z","arrivalTime":"2026-06-16T09:00:00Z","cabinClass":"business","aircraft":"A350-900","isLieFlat":true}],"totalPriceCents":280000,"sourceName":"Google Flights","bookingUrl":"https://www.google.com/travel/flights?q=Flights+to+CDG+from+DFW+on+2026-06-15+one+way+business+class","fareClass":"J","bookingInstructions":["Search Google Flights: DFW to CDG, one-way, Business class, June 15","Select AF 639 or similar Air France business class","Book directly on airfrance.com for Flying Blue miles"],"pointsCost":null}]}]

RULES:
- Each opportunity MUST fly to a DIFFERENT airport (one per gateway)
- headline format: "DFW → [AIRPORT]: [deal description] + [train time] train to ${req.destination}"
- Real airlines, real routes, real current market prices in USD cents
- bookingUrl for Google Flights: https://www.google.com/travel/flights?q=Flights+to+[DEST]+from+[ORIG]+on+[YYYY-MM-DD]+one+way+business+class
- bookingInstructions: 2-3 steps, MUST say "one-way" and "Business class"
- isLieFlat: true only for fully flat seats on the long-haul
- pointsCost: null for cash, or {"program":"...","points":60000,"cashCopay":5600,"portalUrl":"https://..."}`;
}

export default async (req: Request) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY not set" }), { status: 500, headers });
  }

  let body: SearchRequest;
  try {
    body = (await req.json()) as SearchRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers });
  }

  const prompt = buildPrompt(body);
  let rawText = "";
  let lastError = "";

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
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

      if (res.ok) {
        const data = await res.json() as any;
        rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        if (rawText) break;
      } else {
        lastError = await res.text();
      }
    } catch (e: any) {
      lastError = e.message;
    }
  }

  if (!rawText) {
    return new Response(JSON.stringify({ error: "Gemini unavailable", details: lastError.slice(0, 200) }), { status: 502, headers });
  }

  try {
    const parsed = JSON.parse(rawText);
    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...headers, "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Bad Gemini response", raw: rawText.slice(0, 300) }), { status: 502, headers });
  }
};
