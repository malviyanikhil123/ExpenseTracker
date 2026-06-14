# Expense Tracker

A full-stack expense tracker built with Expo SDK 54, React Native, Fastify,
PostgreSQL, and Drizzle ORM.

## Features

- Email/password authentication with short-lived JWTs and rotating refresh tokens
- Secure mobile token storage with Expo SecureStore
- Multiple accounts and custom income/expense categories
- Income, expense, and transfer transactions with atomic balance updates
- Monthly budget status, dashboard totals, category analytics, trends, and calendar data
- Dark mobile interface with home, analytics, calendar, reports, profile, and transaction flows
- Pagination, filtering, search, validation, rate limiting, CORS, and structured API errors

## Project Layout

```text
backend/     Fastify API, Drizzle schemas, repositories, services, controllers
mobile-app/  Expo Router application
```

## Backend Setup

1. Create a Supabase project and copy its PostgreSQL connection string.
2. From `backend`, copy `.env.example` to `.env` and set `DATABASE_URL` and
   a random `JWT_SECRET` of at least 32 characters.
3. Install dependencies and run the Drizzle migration:

```bash
cd backend
npm install
npm run db:migrate
npm run dev
```

The API is available at `http://localhost:15000/api`. Check
`GET /api/health` for readiness.

Schema changes must be generated through Drizzle:

```bash
npm run db:generate
npm run db:migrate
```

Do not edit generated SQL migrations manually.

## Mobile Setup

1. From `mobile-app`, copy `.env.example` to `.env`.
2. Set `EXPO_PUBLIC_API_URL` for the target:
   - Android emulator: `http://10.0.2.2:15000/api`
   - iOS simulator: `http://localhost:15000/api`
   - Physical device: `http://<computer-lan-ip>:15000/api`
3. Start Expo:

```bash
cd mobile-app
npm install
npm start
```

`react-native-mmkv` requires a development build and is included for future
non-sensitive local caching. Authentication credentials are stored only in
SecureStore. Expo Go can be used while MMKV is not imported by application code.

## Verification

```bash
cd backend
npm run typecheck
npm run build

cd ../mobile-app
npx tsc --noEmit
npm run lint
```

## Main API Routes

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`
- `GET|POST|PATCH|DELETE /api/accounts`
- `GET|POST|DELETE /api/categories`
- `GET|POST /api/transactions`
- `PUT /api/budgets`, `GET /api/budgets/status`
- `GET /api/dashboard/summary`
- `GET /api/analytics/monthly`, `/categories`, `/calendar`
- `GET|PATCH /api/profile`, `POST /api/profile/change-password`
