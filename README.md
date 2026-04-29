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

### 0) Geofence Store APIs

- `GET /api/stores` - list stores (active/inactive)
- `POST /api/stores` - create store (`ROLE_A` only)
- `GET /api/stores/:id` - get single store
- `PUT /api/stores/:id` - update store (`ROLE_A` only)
- `DELETE /api/stores/:id` - deactivate store (`ROLE_A` only)

Store fields:

- `id`
- `name`
- `latitude`
- `longitude`
- `radius` (meters)
- `status` (`active` or `inactive`)
- `created_at`
- `updated_at`

### Attendance APIs

- `POST /api/attendance/check-in`
	- body: `{ "storeId": "<uuid>", "userId"?: "<uuid>" }`
	- creates active session (staff can only use own user ID)
- `POST /api/attendance/check-out`
	- body: `{ "userId"?: "<uuid>" }`
	- completes active session and computes duration in backend
- `GET /api/attendance/current?userId=<uuid>`
	- returns active session or `null`
- `GET /api/attendance/history?userId=<uuid>`
	- returns completed sessions for analytics/reporting

Attendance fields:

- `id`
- `user_id`
- `store_id`
- `check_in_time`
- `check_out_time`
- `status` (`active` or `completed`)
- `total_duration` (milliseconds, calculated by backend)
- `created_at`
- `updated_at`

Business rules enforced:

- Only one active session per user at a time
- User and store are validated by backend
- Check-in fails if user already has active session
- Check-out fails if there is no active session
- Inactive stores cannot be used for check-in

## Admin UI Dashboard

A web-based admin dashboard is available in the Next.js app.

- Route: `/admin/dashboard`
- Home route `/` redirects to `/admin/dashboard`

Sections:

- `/admin/dashboard` - overview cards + active/recent sessions
- `/admin/stores` - create/edit/deactivate geofence stores
- `/admin/attendance` - attendance tables with filters (`userId`, `store`, date range)
- `/admin/analytics` - working hours per user, sessions per store, daily/weekly summaries

Authentication:

- Login uses existing `POST /api/auth/login`
- Admin data uses bearer token stored in browser local storage (`admin_token`)
- Only `ROLE_A` can access admin UI data/actions

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

# Required for admin store detail map with geofence radius circle
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-javascript-api-key
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