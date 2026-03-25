import type { GroundTransfer } from "@/domain/entities";

/** A gateway airport for a destination city, with ground transfer details */
export interface GatewayAirport {
  code: string;
  /** Is this the "primary" airport for the city? */
  primary: boolean;
  transfer: GroundTransfer;
}

/** Known destination city configs. Key is lowercase city name. */
const DESTINATION_DB: Record<string, { displayName: string; airports: GatewayAirport[] }> = {
  ghent: {
    displayName: "Ghent, Belgium",
    airports: [
      {
        code: "BRU",
        primary: true,
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
        code: "AMS",
        primary: false,
        transfer: {
          mode: "train",
          from: "Amsterdam Schiphol (AMS)",
          to: "Ghent-Sint-Pieters Station",
          durationMinutes: 180,
          estimatedCostCents: 5_500,
          provider: "NS International + Eurostar",
          bookingUrl: "https://www.nsinternational.com/en",
          notes: "Take Thalys/Eurostar from Schiphol to Brussels-Midi, then IC train to Ghent. Book Thalys early for best price (~€29).",
        },
      },
      {
        code: "CDG",
        primary: false,
        transfer: {
          mode: "train",
          from: "Paris CDG (CDG)",
          to: "Ghent-Sint-Pieters Station",
          durationMinutes: 210,
          estimatedCostCents: 8_000,
          provider: "Eurostar",
          bookingUrl: "https://www.eurostar.com",
          notes: "CDG TGV station → Brussels-Midi (1h20), then IC to Ghent (30 min). Or Eurostar from Paris Gare du Nord (take RER B from CDG first).",
        },
      },
      {
        code: "LHR",
        primary: false,
        transfer: {
          mode: "train",
          from: "London Heathrow (LHR)",
          to: "Ghent-Sint-Pieters Station",
          durationMinutes: 240,
          estimatedCostCents: 10_000,
          provider: "Eurostar",
          bookingUrl: "https://www.eurostar.com",
          notes: "Heathrow Express to Paddington (15 min), Tube/taxi to St Pancras, Eurostar to Brussels-Midi (2h), IC to Ghent (30 min). Book Eurostar weeks ahead for £39-69.",
        },
      },
    ],
  },
  brussels: {
    displayName: "Brussels, Belgium",
    airports: [
      {
        code: "BRU",
        primary: true,
        transfer: {
          mode: "train",
          from: "Brussels Airport (BRU)",
          to: "Brussels city center",
          durationMinutes: 20,
          estimatedCostCents: 1_200,
          provider: "NMBS/SNCB",
          bookingUrl: "https://www.belgiantrain.be/en",
          notes: "Airport Express to Brussels-Central every 10 min.",
        },
      },
    ],
  },
  paris: {
    displayName: "Paris, France",
    airports: [
      {
        code: "CDG",
        primary: true,
        transfer: {
          mode: "train",
          from: "Paris CDG (CDG)",
          to: "Paris city center",
          durationMinutes: 35,
          estimatedCostCents: 1_200,
          provider: "RER B",
          bookingUrl: "https://www.ratp.fr/en",
          notes: "RER B from CDG Terminal 2 to Châtelet-Les Halles. Runs every 10-15 min.",
        },
      },
    ],
  },
  london: {
    displayName: "London, UK",
    airports: [
      {
        code: "LHR",
        primary: true,
        transfer: {
          mode: "train",
          from: "London Heathrow (LHR)",
          to: "London city center",
          durationMinutes: 15,
          estimatedCostCents: 2_800,
          provider: "Heathrow Express",
          bookingUrl: "https://www.heathrowexpress.com",
          notes: "Heathrow Express to Paddington in 15 min. Or Elizabeth Line (cheaper, ~30 min).",
        },
      },
    ],
  },
  amsterdam: {
    displayName: "Amsterdam, Netherlands",
    airports: [
      {
        code: "AMS",
        primary: true,
        transfer: {
          mode: "train",
          from: "Amsterdam Schiphol (AMS)",
          to: "Amsterdam Centraal",
          durationMinutes: 15,
          estimatedCostCents: 600,
          provider: "NS",
          bookingUrl: "https://www.ns.nl/en",
          notes: "Direct train from Schiphol Plaza to Amsterdam Centraal every 10 min.",
        },
      },
    ],
  },
  tokyo: {
    displayName: "Tokyo, Japan",
    airports: [
      {
        code: "NRT",
        primary: true,
        transfer: {
          mode: "train",
          from: "Narita Airport (NRT)",
          to: "Tokyo Station",
          durationMinutes: 60,
          estimatedCostCents: 3_000,
          provider: "Narita Express",
          bookingUrl: "https://www.jreast.co.jp/e/nex/",
          notes: "Narita Express (N'EX) to Tokyo Station. Buy JR Pass for savings if traveling further.",
        },
      },
      {
        code: "HND",
        primary: false,
        transfer: {
          mode: "train",
          from: "Haneda Airport (HND)",
          to: "Tokyo Station",
          durationMinutes: 25,
          estimatedCostCents: 700,
          provider: "Tokyo Monorail + JR",
          bookingUrl: "https://www.tokyo-monorail.co.jp/english/",
          notes: "Monorail to Hamamatsucho, then JR Yamanote Line. Haneda is much closer to central Tokyo than Narita.",
        },
      },
    ],
  },
  dubai: {
    displayName: "Dubai, UAE",
    airports: [
      {
        code: "DXB",
        primary: true,
        transfer: {
          mode: "train",
          from: "Dubai International (DXB)",
          to: "Dubai city center",
          durationMinutes: 20,
          estimatedCostCents: 300,
          provider: "Dubai Metro",
          bookingUrl: "https://www.rta.ae/wps/portal/rta/ae/public-transport/dubai-metro",
          notes: "Red Line metro from Terminal 1 or 3 to downtown. Cheap and fast.",
        },
      },
    ],
  },
  singapore: {
    displayName: "Singapore",
    airports: [
      {
        code: "SIN",
        primary: true,
        transfer: {
          mode: "train",
          from: "Singapore Changi (SIN)",
          to: "Singapore city center",
          durationMinutes: 30,
          estimatedCostCents: 250,
          provider: "MRT",
          bookingUrl: "https://www.changiairport.com/en/transport/public-transport.html",
          notes: "MRT East-West Line from Changi to City Hall. Under $2 USD.",
        },
      },
    ],
  },
};

/** Resolve a destination string to its airports. Returns airport codes. */
export function resolveDestinationAirports(destination: string): string[] {
  const key = destination.toLowerCase().split(",")[0]?.trim() ?? "";
  const config = DESTINATION_DB[key];
  if (config) {
    return config.airports.map((a) => a.code);
  }
  // If we can't resolve it, assume the input IS an airport code
  if (destination.length === 3 && destination === destination.toUpperCase()) {
    return [destination];
  }
  return [];
}

/** Get display name for a destination */
export function getDestinationDisplayName(destination: string): string {
  const key = destination.toLowerCase().split(",")[0]?.trim() ?? "";
  return DESTINATION_DB[key]?.displayName ?? destination;
}

/** Get ground transfer from an airport to a destination city */
export function getGroundTransfer(
  arrivalAirport: string,
  destination: string,
): GroundTransfer | undefined {
  const key = destination.toLowerCase().split(",")[0]?.trim() ?? "";
  const config = DESTINATION_DB[key];
  if (!config) return undefined;
  return config.airports.find((a) => a.code === arrivalAirport)?.transfer;
}

/** Get all known destination city names for autocomplete */
export function getKnownDestinations(): string[] {
  return Object.values(DESTINATION_DB).map((d) => d.displayName);
}
