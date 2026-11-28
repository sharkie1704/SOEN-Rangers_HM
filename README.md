# SOEN-Rangers_HM

DessertDash is a restaurant and dessert ordering application.

## Tech stack

- **Frontend:** React, TypeScript, Vite
- **Maps:** Leaflet and React Leaflet
- **Backend:** Node.js and Express
- **Database:** PostgreSQL (Neon) with Prisma ORM
- **Authentication:** JWT sessions and bcrypt
- **Testing:** Vitest and Supertest

## Requirements

- Node.js 22.12+ or 24.x (Vitest does not support Node 25)
- npm
- PostgreSQL; the project is configured for Neon

## Setup

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env`. Set `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) for the same development database branch. Set `JWT_SECRET` to a secret of at least 16 characters; keep `.env` private.
3. Generate the Prisma client and apply migrations:

   ```sh
   npm run db:generate
   npm run db:migrate
   ```

4. Optionally load demo users, restaurants, and menu items with `npm run db:seed`.

## Development

Run the frontend and API together with `npm run dev`. The frontend is at `http://localhost:5173`, the API at `http://localhost:3000`, and Vite proxies `/api` requests to Express. Run either process separately with `npm run dev:client` or `npm run dev:server`.

## Features

- **Pricing (US-PRC-01):** Fare includes the subtotal, $3 delivery fee, $1.50 service fee, and a $2 surcharge for subtotals below $20. Pricing is configured in `config/pricing.json`; quotes use `POST /api/orders/quote`.
- **Order summaries (US-PRC-02):** Delivered orders receive an immutable fare and restaurant snapshot. Customers can view their summaries; operators can view all summaries. Legacy orders without a saved fare have no reconstructed summary.
- **Billing ledger (US-PRC-03):** Delivered, rejected, and cancelled orders append ledger entries. Operators can view the ledger and reset its current view; earlier entries remain available in history.
- **Restaurant ratings (US-RVW-02):** `GET /api/restaurants/:restaurantId/rating-summary` returns the stored-score average and count for any authenticated user. Unrated restaurants return `average: null` and `count: 0`. Details show the average to one decimal, a star, and the count, or "No ratings yet". Display rounding uses `Number.toFixed(1)` (nearest tenth; exact halfway values round up). Accepted ratings refresh the displayed summary.
- **Courier ratings:** Customers rate the restaurant and courier once an order is delivered; the allowed score range is configured in `config/ratings.json`. Couriers can view their average in the header or Delivery History (`GET /api/couriers/me/rating`); the count stays hidden until five deliveries to protect anonymity.

## Checks

```sh
npm run check      # TypeScript check
npm run build      # TypeScript check and production frontend build
npm test           # Unit tests; no database required
npm run test:int   # Integration tests; use a separate test database
```

## Project structure

- `src/domain/`: domain entities and rules
- `src/application/`: use cases, controllers, and routes
- `src/technical-services/`: database and other infrastructure adapters
- `src/ui/`: React pages and components
- `prisma/`: schema, migrations, and seed data
