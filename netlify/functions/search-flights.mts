interface SearchRequest {
  origin: string;
  destination: string;
  destinationAirports: string[];
  dateRangeStart: string;
  dateRangeEnd: string;
  preferredCabin: string;
  allowPositioningFlights: boolean;
  flexibilityDays: number;
}

const GEMINI_MODELS = ["gemini-2.5-flash"];

function buildPrompt(req: SearchRequest): string {
  const airports = req.destinationAirports.length > 0
    ? req.destinationAirports.join(", ")
    : req.destination;

  return `Find 3 real lie-flat business class flight deals: ${req.origin} to ${req.destination} (airports: ${airports}), departing ${req.dateRangeStart} to ${req.dateRangeEnd} ±${req.flexibilityDays} days.${req.allowPositioningFlights ? " Include positioning flight combos." : ""}

Return JSON: {"opportunities":[{"headline":"...","totalPriceCents":106800,"fares":[{"segments":[{"airline":"AA","flightNumber":"AA 100","origin":"JFK","destination":"BRU","departureTime":"2026-06-15T17:45:00Z","arrivalTime":"2026-06-16T07:15:00Z","cabinClass":"business","aircraft":"777-300ER","isLieFlat":true}],"totalPriceCents":89000,"sourceName":"AA.com","bookingUrl":"https://www.aa.com/homePage.do","fareClass":"I","bookingInstructions":["Step 1","Step 2"],"pointsCost":null}]}]

Rules:
- Real airlines, real routes, real market prices in USD cents
- bookingUrl: use https://www.google.com/travel/flights?q=Flights+to+BRU+from+DFW+on+2026-06-15+one+way for Google Flights, or airline homepage
- cabinClass: economy/premium_economy/business/first
- isLieFlat: true only for fully flat seats
- pointsCost: null for cash, or {"program":"...","points":60000,"cashCopay":5600,"portalUrl":"https://..."}
- bookingInstructions: 2-4 specific actionable steps
- Mix: 1 positioning combo, 1 direct business, 1 points or budget option`;
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
