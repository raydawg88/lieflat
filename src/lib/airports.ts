export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

const AIRPORTS: Airport[] = [
  { code: "DFW", name: "Dallas/Fort Worth International", city: "Dallas", country: "US" },
  { code: "DAL", name: "Dallas Love Field", city: "Dallas", country: "US" },
  { code: "BRU", name: "Brussels Airport", city: "Brussels", country: "BE" },
  { code: "JFK", name: "John F. Kennedy International", city: "New York", country: "US" },
  { code: "EWR", name: "Newark Liberty International", city: "Newark", country: "US" },
  { code: "ORD", name: "O'Hare International", city: "Chicago", country: "US" },
  { code: "LHR", name: "London Heathrow", city: "London", country: "GB" },
  { code: "CDG", name: "Charles de Gaulle", city: "Paris", country: "FR" },
  { code: "AMS", name: "Amsterdam Schiphol", city: "Amsterdam", country: "NL" },
  { code: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "DE" },
  { code: "MUC", name: "Munich Airport", city: "Munich", country: "DE" },
  { code: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "US" },
  { code: "SFO", name: "San Francisco International", city: "San Francisco", country: "US" },
  { code: "MIA", name: "Miami International", city: "Miami", country: "US" },
  { code: "ATL", name: "Hartsfield-Jackson Atlanta", city: "Atlanta", country: "US" },
  { code: "IAH", name: "George Bush Intercontinental", city: "Houston", country: "US" },
  { code: "SEA", name: "Seattle-Tacoma International", city: "Seattle", country: "US" },
  { code: "BOS", name: "Boston Logan International", city: "Boston", country: "US" },
  { code: "IAD", name: "Washington Dulles International", city: "Washington", country: "US" },
  { code: "DOH", name: "Hamad International", city: "Doha", country: "QA" },
  { code: "DXB", name: "Dubai International", city: "Dubai", country: "AE" },
  { code: "NRT", name: "Narita International", city: "Tokyo", country: "JP" },
  { code: "HND", name: "Haneda Airport", city: "Tokyo", country: "JP" },
  { code: "SIN", name: "Singapore Changi", city: "Singapore", country: "SG" },
];

const airportMap = new Map(AIRPORTS.map((a) => [a.code, a]));

/** Look up an airport by IATA code */
export function getAirport(code: string): Airport | undefined {
  return airportMap.get(code.toUpperCase());
}

/** Get display name: "Dallas (DFW)" */
export function getAirportLabel(code: string): string {
  const airport = getAirport(code);
  return airport ? `${airport.city} (${code})` : code;
}

/** Search airports by code or city name */
export function searchAirports(query: string): Airport[] {
  const q = query.toLowerCase();
  return AIRPORTS.filter(
    (a) =>
      a.code.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q),
  );
}

/** Validate IATA code exists in our database */
export function isValidAirportCode(code: string): boolean {
  return airportMap.has(code.toUpperCase());
}

export { AIRPORTS };
