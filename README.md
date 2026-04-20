# My Backend (Next.js + Drizzle + PostgreSQL + Socket.IO)

This project is a Next.js backend service for product management, offline sync, authentication, and realtime location updates with Socket.IO.

## What is included

- Product CRUD APIs
- Sync APIs (`push` and `pull`) for client data synchronization
- Role-based authentication (Manager = `ROLE_A`, Staff = `ROLE_B`)
- PostgreSQL access via Drizzle ORM
- SQL migrations with Drizzle Kit
- Realtime Socket.IO server running together with Next.js (custom server)

## Tech Stack

- Next.js (App Router)
- TypeScript
- Node.js custom server (`server.js`)
- Socket.IO + socket.io-client
- PostgreSQL
- Drizzle ORM + Drizzle Kit

## Realtime Socket (Latest Update)

The app now runs Next.js and Socket.IO on the same server/port.

- Port: `4000`
- Socket CORS: `origin: "*"`
- Transports: `["websocket", "polling"]`
- No Redis required for socket broadcasting flow

### Socket event contract

- Event name: `location:update`
- Payload:

```json
{
	"userId": "string",
	"lat": 11.5564,
	"lng": 104.9282,
	"updatedAt": 1713622335123
}
```

### Current socket behavior

1. Any client connects → backend logs `socket.id`
2. Role B emits `location:update` → backend logs payload
3. Backend broadcasts using `io.emit("location:update", payload)`
4. Any client disconnects → backend logs `socket.id`

## API Features

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

### 4) Authentication + Roles

- `POST /api/auth/register` - create user
	- If no user exists yet, this bootstraps the first Manager (`ROLE_A`) and returns a token.
	- After bootstrap, only a Manager can create users.
- `POST /api/auth/login` - authenticate and return bearer token
- `GET /api/auth/me` - return current authenticated user

Authorization:

- Send `Authorization: Bearer <token>` on protected routes.
- Managers (`ROLE_A`) can create/update/delete product data and push sync changes.
- Staff (`ROLE_B`) can read product/sync data.

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

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Create `.env` in project root:

```env
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB_NAME
JWT_SECRET=your-long-random-secret-at-least-16-chars

# Optional socket client override (frontend)
# NEXT_PUBLIC_SOCKET_URL=http://YOUR_HOST_IP:4000
# NEXT_PUBLIC_SOCKET_PORT=4000
```

### 3) Generate and run migrations

```bash
npm run db:generate
npm run db:migrate
```

### 4) Start development server

```bash
npm run dev
```

Open: http://localhost:4000

## Available Scripts

- `npm run dev` - run custom Next.js + Socket.IO dev server (`server.js`) on port `4000`
- `npm run dev:next` - run plain Next.js dev server only (no custom Socket.IO integration)
- `npm run build` - build Next.js for production
- `npm run start` - start custom production server (`server.js`)
- `npm run server:dev` - run legacy standalone realtime TypeScript server (`src/server/index.ts`)
- `npm run server:start` - start legacy standalone realtime TypeScript server
- `npm run lint` - run ESLint
- `npm run db:generate` - generate SQL migrations from schema
- `npm run db:migrate` - apply migrations to PostgreSQL

## Important Notes

- Do **not** run `npm run dev` and `npm run server:dev` together unless intentionally testing two different socket backends.
- `npm run dev` is now the main command for local development.
- If socket client shows `connect_error`, verify host/port match and set `NEXT_PUBLIC_SOCKET_URL` when testing across LAN devices.
- The app requires `DATABASE_URL`; it will fail at startup if missing.
- The app requires `JWT_SECRET` for authentication token signing/verification.
- Product deletion is soft-delete (`deleted = true`) to support sync workflows.
- Sync uses `updated_at` timestamps for change tracking and conflict handling.

## Test Accounts

Manager A

- Email: `manager.test.1775622641578@example.com`
- Password: `Manager123!`

Staff B

- Email: `staff.test.1775622641578@example.com`
- Password: `Staff12345!`