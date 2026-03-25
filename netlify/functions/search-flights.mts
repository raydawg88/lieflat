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

  return `Find 3 real lie-flat business/first class flight deals: ${req.origin} to ${req.destination} (airports: ${airports}), departing ${req.dateRangeStart} to ${req.dateRangeEnd} ±${req.flexibilityDays} days.${req.allowPositioningFlights ? " Include positioning flight combos (economy to hub + business on long-haul)." : ""}

Return JSON: {"opportunities":[{"headline":"DFW → LHR → BRU: Lie-flat on BA 787 for $3,865","totalPriceCents":386500,"fares":[{"segments":[{"airline":"BA","flightNumber":"BA 192","origin":"DFW","destination":"LHR","departureTime":"2026-06-15T17:45:00Z","arrivalTime":"2026-06-16T07:15:00Z","cabinClass":"business","aircraft":"787-9","isLieFlat":true}],"totalPriceCents":386500,"sourceName":"Google Flights","bookingUrl":"https://www.google.com/travel/flights?q=Flights+to+LHR+from+DFW+on+2026-06-15+one+way+business+class","fareClass":"J","bookingInstructions":["Go to Google Flights and search DFW to LHR one-way on June 15","Click the cabin dropdown and select Business class","Look for BA 192 departing at 5:45 PM"],"pointsCost":null}]}]

CRITICAL RULES:
- headline MUST start with the route: "DFW → BRU:" or "DFW → JFK → BRU:" then the deal description
- bookingUrl for Google Flights MUST include "business+class" and "one+way": https://www.google.com/travel/flights?q=Flights+to+[DEST]+from+[ORIG]+on+[YYYY-MM-DD]+one+way+business+class
- bookingUrl for airlines: link to their booking/search page where user can search business class
- bookingInstructions MUST tell the user to select Business class and one-way in the booking tool
- All long-haul segments must be business or first class with isLieFlat:true
- Positioning segments can be economy (isLieFlat:false)
- Real airlines, real routes that actually exist, real market prices in USD cents
- pointsCost: null for cash, or {"program":"...","points":60000,"cashCopay":5600,"portalUrl":"https://..."}
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
