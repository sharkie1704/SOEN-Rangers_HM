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

(alternate) Seeding method on startup is disabled by default. Set `SEED_FROM_CONFIG=true` to `false`in server.ts to enable.

## Development

Start the Vite frontend and Express API together:

```sh
npm run dev
```

The frontend is at `http://localhost:5173` and the API is at `http://localhost:3000`. Vite proxies `/api` requests to Express, so frontend requests should use relative paths such as `/api/auth/login`. If you change `PORT` in `.env`, update the proxy target in `vite.config.ts` as well.

You can also start either process separately with `npm run dev:client` or `npm run dev:server`.

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
