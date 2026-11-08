# SOEN-Rangers_HM

DessertDash is a restaurant and dessert ordering application built with React, TypeScript, Vite, Express, Prisma, and PostgreSQL.

## Requirements

- Node.js 22.12+ or 24.x (Vitest does not support Node 25)
- npm
- A PostgreSQL database; the project is configured for Neon

## Setup

1. Install dependencies:

   ```sh
   npm ci
   ```

2. Create a `.env` file in the project root using `.env.example` as a template. Set `DATABASE_URL` to your pooled database connection and `DIRECT_URL` to the direct connection for the same database/Neon branch. Keep `.env` private and never commit it.

3. Generate a JWT secret of at least 16 characters. For example:

   ```sh
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Put the generated value in `.env` as `JWT_SECRET`.

4. Generate the Prisma client and apply database migrations:

   ```sh
   npm run db:generate
   npm run db:migrate
   ```

   `db:migrate` uses Prisma's development migration command. Point both database URLs at your development database branch before running it.

5. (Optional) Load the demo users, restaurants, and menu items:

   ```sh
   npm run db:seed
   ```

   Seed data is defined in `prisma/seed-data.ts`; the seeding logic is in `prisma/seed.ts`.

## Development

Start the Vite frontend and Express API together:

```sh
npm run dev
```

The frontend is at `http://localhost:5173` and the API is at `http://localhost:3000`. Vite proxies `/api` requests to Express, so frontend requests should use relative paths such as `/api/auth/login`. If you change `PORT` in `.env`, update the proxy target in `vite.config.ts` as well.

You can also start either process separately with `npm run dev:client` or `npm run dev:server`.

## Pricing (US-PRC-01)

- Fare = subtotal + delivery fee + service fee + applicable small-order surcharge.
- Delivery fee: $3.00.
- Service fee: $1.50.
- Small-order surcharge: $2.00 when the subtotal is strictly below $20.00.
- Pricing source: `config/pricing.json`, seeded into PostgreSQL.
- API: `POST /api/orders/quote`; order placement checks `expectedTotalCents`.
- Example: $12.00 subtotal → $18.50 total.

## Delivered order summaries (US-PRC-02)

- Order placement stores the fare breakdown and restaurant name as an immutable snapshot.
- Delivery creates a persisted summary transactionally with the delivery state change.
- Customers can view their own summaries in Pricing & History; operators can view all summaries.
- Pre-existing orders without a fare snapshot can still be delivered, but do not receive a summary because their historical charge cannot be reconstructed safely.
- Apply the database changes with `npm run db:migrate` after generating the client with `npm run db:generate`.

## Billing ledger (US-PRC-03)

- Delivered, rejected, and cancelled order events append ledger entries using the ORD event ID.
- Delivered entries use the fare snapshot saved at placement; rejected and cancelled orders have a zero charge. Legacy delivered orders without a fare snapshot show an unavailable charge.
- Only operators can read the complete ledger or reset its current view.
- Reset starts a new visible epoch. Earlier entries remain immutable and available under all-history view.
- Apply the database changes with `npm run db:migrate` after generating the client with `npm run db:generate`.

### Image attribution

The Maple Sweets image is supplied from [Delicious](https://img.delicious.com.au/BVnXxQQR/w759-h506-cfill/del/2019/11/maple-syrup-tart-119653-2.jpg) with the project owner's confirmation of permission to use it.

## Checks and tests

```sh
npm run check      # TypeScript check
npm run build      # TypeScript check and production frontend build
npm test           # Unit tests; no database required
npm run test:int   # Integration tests; use a separate test database
```

## Project structure

- `src/domain/`: domain entities, rules, and ports
- `src/application/`: use cases, controllers, and routes
- `src/technical-services/`: infrastructure adapters such as Prisma repositories and JWT services
- `src/ui/`: React pages and components
- `src/app.ts`: builds the Express app and wires application services to their dependencies
- `src/server.ts`: creates infrastructure adapters and starts the API server
- `prisma/`: database schema, migrations, and seed data

Dependencies point inward: UI and infrastructure code depend on application/domain contracts; the domain does not depend on Prisma, bcrypt, or Express.

## Create the local Phase II tag

Create the tag after the final Phase II changes have been committed, while checked out on the commit you want to submit:

```sh
git status
git tag -a phase2 -m "Phase II submission"
git show --no-patch phase2
```

The tag is local until pushed. To publish it to the repository:

```sh
git push origin phase2
```
