import type { GroundTransfer } from "@/domain/entities";

/** Known ground transfers from airports to nearby cities */
export interface GatewayConfig {
  /** Airport code */
  airport: string;
  /** Ground transfer to the final destination */
  transfer: GroundTransfer;
}

/**
 * Gateway airports for common final destinations.
 * Key is the city name (lowercase), value is list of airports you can fly into.
 */
export const GATEWAY_CONFIGS: Record<string, GatewayConfig[]> = {
  ghent: [
    {
      airport: "BRU",
      transfer: {
        mode: "train",
        from: "Brussels Airport (BRU)",
        to: "Ghent-Sint-Pieters Station",
        durationMinutes: 55,
        estimatedCostCents: 1_500,
        provider: "NMBS/SNCB Belgian Rail",
        bookingUrl: "https://www.belgiantrain.be/en",
        notes: "Direct trains every 30 min from Brussels Airport station (level -1). Buy ticket at the machine or use the NMBS app.",
      },
    },
    {
      airport: "AMS",
      transfer: {
        mode: "train",
        from: "Amsterdam Schiphol (AMS)",
        to: "Ghent-Sint-Pieters Station",
        durationMinutes: 180,
        estimatedCostCents: 5_500,
        provider: "NS + Thalys/Eurostar",
        bookingUrl: "https://www.nsinternational.com/en",
        notes: "Take Thalys/Eurostar from Schiphol to Brussels-Midi, then IC train to Ghent. Book Thalys early for best price.",
      },
    },
    {
      airport: "CDG",
      transfer: {
        mode: "train",
        from: "Paris CDG (CDG)",
        to: "Ghent-Sint-Pieters Station",
        durationMinutes: 210,
        estimatedCostCents: 8_000,
        provider: "Thalys/Eurostar",
        bookingUrl: "https://www.eurostar.com",
        notes: "CDG TGV station → Brussels-Midi (1h20), then IC to Ghent (30 min). Or Eurostar from Paris Gare du Nord (take RER B from CDG).",
      },
    },
    {
      airport: "LHR",
      transfer: {
        mode: "train",
        from: "London Heathrow (LHR)",
        to: "Ghent-Sint-Pieters Station",
        durationMinutes: 240,
        estimatedCostCents: 10_000,
        provider: "Eurostar",
        bookingUrl: "https://www.eurostar.com",
        notes: "Heathrow Express to Paddington (15 min), Tube to St Pancras, Eurostar to Brussels-Midi (2h), IC to Ghent (30 min). Book Eurostar weeks ahead for £39-69.",
      },
    },
  ],
  brussels: [
    {
      airport: "BRU",
      transfer: {
        mode: "train",
        from: "Brussels Airport (BRU)",
        to: "Brussels city center",
        durationMinutes: 20,
        estimatedCostCents: 1_200,
        provider: "NMBS/SNCB Belgian Rail",
        bookingUrl: "https://www.belgiantrain.be/en",
        notes: "Airport Express train to Brussels-Central every 10 min.",
      },
    },
  ],
};

/** Look up gateway configs for a final destination city */
export function getGatewayConfigs(finalDestination: string): GatewayConfig[] {
  const key = finalDestination.toLowerCase().split(",")[0]?.trim() ?? "";
  return GATEWAY_CONFIGS[key] ?? [];
}

/** Get ground transfer for an airport to a final destination */
export function getGroundTransfer(
  arrivalAirport: string,
  finalDestination: string,
): GroundTransfer | undefined {
  const configs = getGatewayConfigs(finalDestination);
  return configs.find((c) => c.airport === arrivalAirport)?.transfer;
}
