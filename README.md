# My Backend (Next.js + Drizzle + PostgreSQL)

This project is a Next.js backend service for product management and offline sync flows.

It includes:
- Product CRUD APIs
- Sync APIs (`push` and `pull`) for client data synchronization
- PostgreSQL access via Drizzle ORM
- SQL migrations with Drizzle Kit

## Tech Stack

- Next.js (App Router)
- TypeScript
- PostgreSQL
- Drizzle ORM + Drizzle Kit

## Project Features

### 1) Product APIs

- `GET /api/products` - list non-deleted products
- `POST /api/products` - create product
- `GET /api/products/:id` - get one product
- `PUT /api/products/:id` - update product
- `DELETE /api/products/:id` - soft delete product

### 2) Sync APIs

- `POST /api/sync/push` - receive client-side created/updated/deleted changes
- `GET /api/sync/pull?last_pulled_at=<timestamp>` - return changes since last pull

### 3) DB test endpoint

- `GET /api/test-db` - quick database connectivity check

## Database Schema

Main table: `products`
- `id` (uuid, primary key)
- `name` (text)
- `price` (double precision)
- `updated_at` (bigint timestamp)
- `deleted` (boolean, soft delete)

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL database

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB_NAME
```

### 3. Generate and run migrations

```bash
npm run db:generate
npm run db:migrate
```

### 4. Start development server

```bash
npm run dev
```

Open http://localhost:3000

## Available Scripts

- `npm run dev` - run development server
- `npm run build` - build for production
- `npm run start` - start production server
- `npm run lint` - run ESLint
- `npm run db:generate` - generate SQL migrations from schema
- `npm run db:migrate` - apply migrations to PostgreSQL

## Notes

- The app requires `DATABASE_URL`; it will fail at startup if missing.
- Product deletion is soft-delete (`deleted = true`) to support sync workflows.
- Sync uses `updated_at` timestamps for change tracking and conflict handling.
