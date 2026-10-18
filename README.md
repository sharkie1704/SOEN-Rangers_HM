# SOEN-Rangers_HM

DessertDash

## Setup

Use Node.js 22.18 or newer.

1. Install dependencies:
```sh
   npm ci
```
2. Create a `.env` file in the project root following the `.env.example` file (never commit it)
   Ask the team for the connection strings, or use your own Neon branch.
   Generate your own `JWT_SECRET` (at least 16 characters; the server refuses to start without it):
```sh
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
   Copy and paste the result  to `JWT_SECRET`

3. Generate the Prisma client and apply migrations:
```sh
   npx prisma generate
   npx prisma migrate deploy
```
   Re-run `npx prisma generate` after pulling any change to `prisma/schema.prisma`.

## Development

The frontend (Vite) and the API (Express) run as two processes. Start both, each in its own terminal.
```sh
   npm run dev        # start the app (front-end)
   npm run dev:server # Express API on http://localhost:3000 
```

Vite proxies `/api` to Express (see `vite.config.ts`), so the browser only talks to one origin
and the session cookie works. Always use relative URLs like `/api/auth/login` in frontend code.
If you change `PORT` in `.env`, update the proxy target too.

```sh
   npm run check      # type-check
   npm run build      # production build
```

## Testing

```sh
   npm test           # unit tests (no database needed)
   npm run test:int   # integration tests (need DATABASE_URL; they clean up after themselves but still use a separate branch from prod to test)
```

## Project structure

Layered architecture, following our package diagram:

- `src/domain/`: entities, domain rules, and ports (interfaces), grouped by module
- `src/application/`: controllers and use-case logic
- `src/technical-services/`: Prisma repositories, password hashing, JWT tokens and other adapters
- `src/ui/`: React pages and components
- `src/container.ts`: composition root, where adapters are created and injected (import shared instances from here, not from `server.ts`)
- `src/server.ts`: Express app setup and route mounting
- `prisma/`: schema and migrations

Dependencies point inward: `ui` → `application` → `domain`, and `technical-services` implements the domain's ports. The domain never imports Prisma, bcrypt or Express.