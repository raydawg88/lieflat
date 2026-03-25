import type { Fare, Segment } from "@/domain/entities";
import { CabinClass, FareSource, createId } from "@/domain/entities";

const now = new Date().toISOString();

// ─── Segments ───

const seg_DFW_JFK_economy: Segment = {
  id: createId(),
  airline: "AA",
  flightNumber: "AA 1742",
  origin: "DFW",
  destination: "JFK",
  departureTime: "2026-06-15T06:15:00Z",
  arrivalTime: "2026-06-15T10:30:00Z",
  cabinClass: CabinClass.Economy,
  aircraft: "A321neo",
  isLieFlat: false,
};

const seg_JFK_BRU_business: Segment = {
  id: createId(),
  airline: "AA",
  flightNumber: "AA 100",
  origin: "JFK",
  destination: "BRU",
  departureTime: "2026-06-15T17:45:00Z",
  arrivalTime: "2026-06-16T07:15:00Z",
  cabinClass: CabinClass.Business,
  aircraft: "777-300ER",
  isLieFlat: true,
};

const seg_DFW_BRU_nonstop: Segment = {
  id: createId(),
  airline: "AA",
  flightNumber: "AA 73",
  origin: "DFW",
  destination: "BRU",
  departureTime: "2026-06-15T16:20:00Z",
  arrivalTime: "2026-06-16T08:05:00Z",
  cabinClass: CabinClass.Business,
  aircraft: "787-9",
  isLieFlat: true,
};

const seg_DFW_LHR_premEcon: Segment = {
  id: createId(),
  airline: "BA",
  flightNumber: "BA 192",
  origin: "DFW",
  destination: "LHR",
  departureTime: "2026-06-15T20:10:00Z",
  arrivalTime: "2026-06-16T11:30:00Z",
  cabinClass: CabinClass.PremiumEconomy,
  aircraft: "A380",
  isLieFlat: false,
};

const seg_LHR_BRU_economy: Segment = {
  id: createId(),
  airline: "BA",
  flightNumber: "BA 388",
  origin: "LHR",
  destination: "BRU",
  departureTime: "2026-06-16T14:00:00Z",
  arrivalTime: "2026-06-16T16:15:00Z",
  cabinClass: CabinClass.Economy,
  aircraft: "A320",
  isLieFlat: false,
};

const seg_DFW_ORD_business: Segment = {
  id: createId(),
  airline: "UA",
  flightNumber: "UA 1287",
  origin: "DFW",
  destination: "ORD",
  departureTime: "2026-06-15T08:00:00Z",
  arrivalTime: "2026-06-15T10:30:00Z",
  cabinClass: CabinClass.Business,
  aircraft: "737-900",
  isLieFlat: false,
};

const seg_ORD_BRU_polaris: Segment = {
  id: createId(),
  airline: "UA",
  flightNumber: "UA 998",
  origin: "ORD",
  destination: "BRU",
  departureTime: "2026-06-15T15:30:00Z",
  arrivalTime: "2026-06-16T06:45:00Z",
  cabinClass: CabinClass.Business,
  aircraft: "787-10",
  isLieFlat: true,
};

const seg_DFW_BRU_mistake: Segment = {
  id: createId(),
  airline: "LH",
  flightNumber: "LH 439",
  origin: "DFW",
  destination: "BRU",
  departureTime: "2026-06-17T12:00:00Z",
  arrivalTime: "2026-06-18T04:15:00Z",
  cabinClass: CabinClass.First,
  aircraft: "A340-600",
  isLieFlat: true,
};

// ─── Fares ───

/** Opportunity 1: Positioning + lie-flat — the killer deal */
export const fare_DFW_JFK_positioning: Fare = {
  id: createId(),
  segments: [seg_DFW_JFK_economy],
  totalPriceCents: 17_800,
  currency: "USD",
  source: FareSource.GoogleFlights,
  sourceName: "Google Flights",
  bookingUrl: "https://www.google.com/travel/flights/search?tfs=CBwQAhoJagcIARIDREZXEglyBwgBEgNKRks&hl=en",
  retrievedAt: now,
  fareClass: "M",
  bookingInstructions: [
    "Search Google Flights for DFW → JFK on June 15",
    "Select the 6:15 AM AA 1742 departure",
    "Book as a separate ticket from the long-haul — this is a positioning flight",
    "Consider booking directly on aa.com after finding the price on Google Flights for AAdvantage miles credit",
  ],
};

export const fare_JFK_BRU_lieflat: Fare = {
  id: createId(),
  segments: [seg_JFK_BRU_business],
  totalPriceCents: 89_000,
  currency: "USD",
  source: FareSource.DirectAirline,
  sourceName: "AA.com",
  bookingUrl: "https://www.aa.com/booking/find-flights?tripType=oneWay&orig=JFK&dest=BRU&departDate=2026-06-15&cabin=business",
  retrievedAt: now,
  fareClass: "I",
  bookingInstructions: [
    "Go to aa.com and search JFK → BRU on June 15 in Business class",
    "Look for fare class \"I\" — this is the discounted business fare bucket",
    "The 777-300ER has Flagship Suite reverse herringbone lie-flat seats with direct aisle access",
    "Book on aa.com to earn full AAdvantage miles (this fare earns 150% elite miles)",
    "Tip: If the I fare disappears, check nearby dates — it often opens 2-3 weeks before departure",
  ],
};

/** Opportunity 2: Nonstop but expensive */
export const fare_DFW_BRU_nonstop: Fare = {
  id: createId(),
  segments: [seg_DFW_BRU_nonstop],
  totalPriceCents: 285_000,
  currency: "USD",
  source: FareSource.DirectAirline,
  sourceName: "AA.com",
  bookingUrl: "https://www.aa.com/booking/find-flights?tripType=oneWay&orig=DFW&dest=BRU&departDate=2026-06-15&cabin=business",
  retrievedAt: now,
  fareClass: "J",
  bookingInstructions: [
    "Go to aa.com and search DFW → BRU nonstop on June 15 in Business class",
    "This is a full-price J fare on the seasonal DFW-BRU route",
    "The 787-9 Dreamliner has the newer Flagship Suite business class",
    "If this feels expensive, consider the positioning flight strategy via JFK — saves ~$1,750",
  ],
};

/** Opportunity 3: Budget via London — no lie-flat */
export const fare_DFW_LHR: Fare = {
  id: createId(),
  segments: [seg_DFW_LHR_premEcon],
  totalPriceCents: 72_000,
  currency: "USD",
  source: FareSource.GoogleFlights,
  sourceName: "Google Flights",
  bookingUrl: "https://www.google.com/travel/flights/search?tfs=CBwQAhoJagcIARIDREZXEglyBwgBEgNMSFI&hl=en",
  retrievedAt: now,
  fareClass: "W",
  bookingInstructions: [
    "Search Google Flights for DFW → LHR on June 15",
    "Select BA 192 in World Traveller Plus (Premium Economy)",
    "Book directly on ba.com for best Avios earning and seat selection",
    "Note: This route does NOT have lie-flat — Premium Economy on the A380 is extra legroom only",
  ],
};

export const fare_LHR_BRU: Fare = {
  id: createId(),
  segments: [seg_LHR_BRU_economy],
  totalPriceCents: 9_500,
  currency: "USD",
  source: FareSource.GoogleFlights,
  sourceName: "Google Flights",
  bookingUrl: "https://www.google.com/travel/flights/search?tfs=CBwQAhoJagcIARIDTEhSEglyBwgBEgNCUlU&hl=en",
  retrievedAt: now,
  fareClass: "L",
  bookingInstructions: [
    "Search Google Flights for LHR → BRU on June 16",
    "This is a short 1h15m hop — economy is fine",
    "Book as a separate ticket from the DFW→LHR leg",
    "Alternative: Take the Eurostar train from London St Pancras to Brussels Midi (~2h, often cheaper)",
  ],
};

/** Opportunity 4: Points play — United Polaris */
export const fare_DFW_ORD_BRU_points: Fare = {
  id: createId(),
  segments: [seg_DFW_ORD_business, seg_ORD_BRU_polaris],
  totalPriceCents: 5_600,
  currency: "USD",
  source: FareSource.PointsProgram,
  sourceName: "United MileagePlus",
  bookingUrl: "https://www.united.com/en/us/book-flight/results/rev?f=DFW&t=BRU&d=2026-06-15&tt=1&sc=7&px=1&taxng=1&newHP=True&clm=7&st=bestmatches&tqp=A",
  retrievedAt: now,
  fareClass: "IN",
  pointsCost: {
    program: "United MileagePlus",
    points: 60_000,
    cashCopay: 5_600,
    portalUrl: "https://www.united.com/en/us/book-flight",
  },
  bookingInstructions: [
    "Log in to united.com with your MileagePlus account",
    "Search DFW → BRU on June 15, select \"Business or First\" cabin",
    "Toggle \"Book with miles\" — look for the 60K Saver award on the ORD connection",
    "The ORD→BRU segment is on United Polaris (787-10) with the full Polaris lie-flat suite",
    "If you don't have United miles: Transfer from Chase Ultimate Rewards (1:1), Marriott Bonvoy (3:1.1), or Bilt Rewards (1:1)",
    "Tip: Polaris Saver awards open ~330 days out or close-in ~2 weeks before departure",
  ],
};

/** Opportunity 5: Mistake fare — too good to be true */
export const fare_DFW_BRU_mistake: Fare = {
  id: createId(),
  segments: [seg_DFW_BRU_mistake],
  totalPriceCents: 65_000,
  currency: "USD",
  source: FareSource.MistakeFare,
  sourceName: "Secret Flying",
  bookingUrl: "https://www.secretflying.com/posts/mistake-fare-usa-to-europe-first-class",
  retrievedAt: now,
  fareClass: "A",
  bookingInstructions: [
    "This is a mistake fare found on Secret Flying — it may be pulled at any time",
    "DO NOT call the airline to ask about the fare — this can trigger cancellation",
    "Book immediately if you want it — mistake fares typically last 2-12 hours",
    "Use a credit card with good travel protections in case of cancellation",
    "After booking, wait 24-48 hours before making any non-refundable plans (hotel, etc.)",
    "If the fare is ticketed and you receive a confirmation number, it's very likely to be honored (DOT rules)",
    "Note: This was found on secretflying.com — check their site for the latest status",
  ],
};

/** All seed fares for DFW→BRU */
export const ALL_SEED_FARES: Fare[] = [
  fare_DFW_JFK_positioning,
  fare_JFK_BRU_lieflat,
  fare_DFW_BRU_nonstop,
  fare_DFW_LHR,
  fare_LHR_BRU,
  fare_DFW_ORD_BRU_points,
  fare_DFW_BRU_mistake,
];
