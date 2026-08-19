# SubStance

Helps school administrators make better use of the substitute teachers they have
on a given day — surfacing the "free" periods a sub picks up when the teacher
they're covering has planning or lunch, so the same sub can cover more than one
class.

## Stack

- Next.js (App Router) + TypeScript, Tailwind, shadcn/ui
- Prisma + Postgres (Supabase)
- Resend (email) + Twilio (SMS) for substitute notifications — later phase

## Getting started

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL` with a Supabase
   connection string. Use the **Session pooler** (port 5432) — the Transaction
   pooler (port 6543) doesn't support the session features `prisma migrate`
   needs and will hang.
2. Install dependencies and apply migrations:

   ```bash
   npm install
   npx prisma migrate deploy
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Project structure

- `prisma/schema.prisma` — data model
- `app/school/bell-schedule` — bell schedule setup (periods, times, alternate
  schedules for exam weeks/assemblies)
- `app/teachers` — teacher roster and per-teacher period schedule
- `lib/` — shared helpers (Prisma client, validation schemas, time math,
  spreadsheet parsing)
