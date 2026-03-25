import type { Context } from "@netlify/functions";

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

/** Models to try in order — falls back if one is rate-limited */
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];

function buildPrompt(req: SearchRequest): string {
  const airports = req.destinationAirports.length > 0
    ? req.destinationAirports.join(", ")
    : req.destination;

  return `You are a flight search expert. Find REAL, bookable lie-flat business class (or first class) flight opportunities from ${req.origin} to ${req.destination}.

Search these arrival airports: ${airports}
Travel dates: ${req.dateRangeStart} to ${req.dateRangeEnd} (±${req.flexibilityDays} days flexible)
Preferred cabin on long-haul: ${req.preferredCabin}
${req.allowPositioningFlights ? "Include positioning flights (cheap economy to a hub, then business on the long-haul booked separately)." : "Direct routes only."}

IMPORTANT RULES:
- Only return flights that ACTUALLY EXIST on these routes with these airlines
- Prices should reflect REAL current market rates (not made up)
- Booking URLs must be REAL, WORKING URLs on Google Flights, airline websites, or booking sites
- For Google Flights URLs, use this format: https://www.google.com/travel/flights?q=Flights+to+[DEST]+from+[ORIG]+on+[DATE]+one+way
- For airline sites, link to their homepage booking page (e.g., https://www.aa.com/homePage.do, https://www.united.com, https://www.britishairways.com)
- For points bookings, link to the loyalty program's booking page
- Include step-by-step booking instructions that are SPECIFIC and ACTIONABLE
- If you include a positioning flight strategy, explain it clearly

Return EXACTLY this JSON structure (no markdown, no code fences, just raw JSON):
{
  "opportunities": [
    {
      "headline": "Short description of the deal",
      "totalPriceCents": 106800,
      "fares": [
        {
          "segments": [
            {
              "airline": "AA",
              "flightNumber": "AA 1742",
              "origin": "DFW",
              "destination": "JFK",
              "departureTime": "2026-06-15T06:15:00Z",
              "arrivalTime": "2026-06-15T10:30:00Z",
              "cabinClass": "economy",
              "aircraft": "A321neo",
              "isLieFlat": false
            }
          ],
          "totalPriceCents": 17800,
          "sourceName": "Google Flights",
          "bookingUrl": "https://www.google.com/travel/flights?q=...",
          "fareClass": "M",
          "bookingInstructions": [
            "Step 1...",
            "Step 2..."
          ],
          "pointsCost": null
        }
      ]
    }
  ]
}

Rules for the response:
- Return 4-6 opportunities, ranked from best deal to worst
- Mix of strategies: positioning flights, direct business, points redemptions, budget options
- cabinClass must be one of: "economy", "premium_economy", "business", "first"
- Prices in USD cents (multiply dollars by 100)
- isLieFlat should be true ONLY for seats that actually go fully flat
- pointsCost should be null for cash fares, or {"program": "...", "points": 60000, "cashCopay": 5600, "portalUrl": "https://..."} for award flights
- Every bookingUrl MUST be a real working URL
- Every bookingInstructions array must have specific, actionable steps`;
}

export default async function handler(req: Request, _context: Context) {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    const body = (await req.json()) as SearchRequest;
    const prompt = buildPrompt(body);

    // Try each model until one works
    let rawText = "";
    let lastError = "";

    for (const model of GEMINI_MODELS) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        }),
      });

      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        console.log(`Success with model: ${model}`);
        break;
      }

      // Rate limited or error — try next model
      lastError = await geminiResponse.text();
      console.warn(`Model ${model} failed (${geminiResponse.status}), trying next...`);
    }

    if (!rawText) {
      return new Response(
        JSON.stringify({
          error: "All Gemini models exhausted",
          details: lastError,
        }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Parse the JSON from Gemini's response
    let parsed;
    try {
      // Try direct parse first
      parsed = JSON.parse(rawText);
    } catch {
      // Try extracting JSON from markdown code fences
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]!.trim());
      } else {
        throw new Error("Could not parse Gemini response as JSON");
      }
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (err) {
    console.error("Function error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal error",
        details: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
}
