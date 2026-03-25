# LieFlat

**Luxury flights at economy prices.**

LieFlat is a decision engine that finds the cheapest realistic path to lie-flat business class (or first class) flights. It queries pluggable data providers, assembles multi-segment routes (including positioning flights), and scores every opportunity on five factors with transparent explanations.

## What It Does

1. **Create a trip** — origin, destination, date range, cabin preference, budget
2. **Engine searches** — queries providers, builds routes (direct + positioning combos)
3. **Scores & ranks** — every route scored 0-100 on price value, cabin quality, route simplicity, timing, and reliability
4. **Transparent explanations** — see exactly why each opportunity scored the way it did

## Architecture

```
┌─────────────────────────────────────────┐
│  UI Layer (React pages + components)     │
├─────────────────────────────────────────┤
│  Engine Layer (search orchestration)     │
├─────────────────────────────────────────┤
│  Domain Layer (entities, scoring, routes)│
├─────────────────────────────────────────┤
│  Provider Layer (pluggable data sources) │
└─────────────────────────────────────────┘
```

**Key principle:** This is NOT a scraping toy. The domain, provider, and engine layers are pure TypeScript with zero React imports. Adding a real data provider means implementing one interface — zero changes to scoring, routing, or UI.

## Scoring Model

| Factor | Weight | What it measures |
|---|---|---|
| Price Value | 35% | Discount vs. retail benchmark |
| Cabin Quality | 25% | Lie-flat > angled > recliner > economy |
| Route Simplicity | 15% | Fewer connections = better |
| Reliability | 15% | Source trustworthiness, fare freshness |
| Timing | 10% | Duration efficiency, departure time |

## Seeded Example: Dallas → Ghent

The app ships with a pre-seeded DFW→BRU trip and 5 realistic opportunities:

| Opportunity | Price | Score | Why |
|---|---|---|---|
| Positioning + lie-flat | $1,068 | ~82 | DFW→JFK (economy) + JFK→BRU (AA 777 lie-flat) |
| Nonstop business | $2,850 | ~62 | DFW→BRU nonstop (AA 787 lie-flat) |
| Points play | 60K pts + $56 | ~70 | DFW→ORD→BRU (United Polaris lie-flat) |
| Mistake fare | $650 | ~55 | DFW→BRU first class (low reliability) |
| Budget via London | $815 | ~38 | DFW→LHR (premium economy) + LHR→BRU (economy) |

## Tech Stack

- React 19 + TypeScript (strict mode)
- Vite 6
- Tailwind CSS 3.4
- React Router 7
- Vitest + Testing Library
- localStorage for MVP persistence
- Netlify hosting

## Getting Started

```bash
pnpm install
pnpm dev        # Dev server at localhost:5173
pnpm test       # Run 35 tests
pnpm build      # Production build
```

## Adding a Provider

Implement the `FareProvider` interface and register it:

```typescript
import { FareProvider, FareSearchParams } from './providers/provider.interface';

class MyProvider implements FareProvider {
  readonly name = 'MyProvider';
  readonly source = FareSource.GoogleFlights;

  async searchFares(params: FareSearchParams): Promise<Fare[]> {
    // Your implementation here
  }

  async verifyFare(fareId: string): Promise<Fare | null> { /* ... */ }
  async isAvailable(): Promise<boolean> { return true; }
}

// Register in src/providers/index.ts
registry.register(new MyProvider());
```

Zero changes needed in scoring, routing, or UI code.

## Project Structure

```
src/
├── domain/        # Pure TS: entities, scoring algorithm, route builder
├── providers/     # Provider interface + mock implementation + seed data
├── engine/        # Search orchestration (queries → routes → scores)
├── store/         # localStorage CRUD + React context
├── pages/         # Dashboard, CreateTrip, TripResults, TripDetail
├── components/    # layout/, trip/, opportunity/, ui/
└── lib/           # Formatters, airport lookup, constants
```
