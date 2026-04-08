# T5-W26-COMP231 / Fresh Trace

Fresh Trace is a food tracking and waste reduction application developed for COMP231 using Agile Scrum.

---

## Project Structure

- `client/` – Next.js frontend application (App Router, components, types, Prisma schema + client).
- `server/` – Backend utilities and Prisma schema/client used by scripts (`server/prisma`, `server/scripts`).

---

## Getting Started (first setup on your machine)

1. **Clone the repository**

```bash
git clone https://github.com/T5-W26-COMP231/T5-W26-COMP231.git
cd T5-W26-COMP231
```

2. **Install frontend dependencies**

```bash
cd client
npm install
```

3. **Configure environment variables**

Make sure `DATABASE_URL` and `DIRECT_URL` for the shared Supabase Postgres instance are available to your shell.  
The repo includes example values in `.env` files; update them as needed for your environment.

On macOS / Linux, from inside `client/` you can export them like this:

```bash
cd client
set -a
source .env
set +a
```

4. **Set up the database (Prisma + PostgreSQL)**

Still inside `client/`:

```bash
# Generate Prisma Client for the app
npm run prisma:generate

# Create or update the PostgreSQL schema
npm run prisma:push

# Seed default categories (Produce, Dairy, Meat, etc.)
npm run prisma:seed
```

This will:

- generate the Prisma client targeting PostgreSQL
- create or update the PostgreSQL schema using `DATABASE_URL` / `DIRECT_URL`
- seed default categories (Produce, Dairy, Meat, etc.)

5. **Run the application**

From the **repo root** (recommended):

```bash
npm run dev
```

Or from the `client` folder:

```bash
cd client
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

You can start editing the main page by modifying `client/app/page.tsx`. The page auto-updates as you edit the file.

---

## After Pulling New Schema Changes (Prisma regeneration)

Whenever someone commits Prisma schema changes (for example new models like `Notification`), **each developer must resync Prisma** so it works in their own environment.

From the repo root:

```bash
cd client

# Ensure DATABASE_URL and DIRECT_URL are in your shell env
set -a
source .env   # or ../.env if you prefer using the root file
set +a

# Regenerate Prisma client & sync schema to your Postgres
npm run prisma:generate
npm run prisma:push

# Optional but recommended to keep defaults in sync
npm run prisma:seed
```

Notes:

- Prisma CLI detects `prisma.config.ts` and **does not auto-load `.env` files**, so having `.env` present is not enough — the relevant variables must be in your shell environment before running Prisma commands.
- If you use a different method to set environment variables (e.g. your shell profile, VS Code tasks, or a secrets manager), you can skip the `set -a / source / set +a` lines as long as `DATABASE_URL` and `DIRECT_URL` are set for the `npm run prisma:*` processes.

For the backend utility scripts under `server/`, Prisma Client is generated to `server/generated/client`. If the server Prisma schema (`server/prisma/schema.prisma`) is changed in the future, regenerate that client with:

```bash
cd server/prisma
npx prisma generate --schema schema.prisma
```

## Prisma / PostgreSQL migration note

If you previously ran this project when it was using SQLite, you might see a Prisma error mentioning `file:` URLs or a validation error when calling `/api/items/prioritized`. This usually means an old Prisma client (compiled for SQLite) is still present in `node_modules`.

To fix this after pulling the latest changes (while inside the `client` folder), run these commands in order:

```powershell
Remove-Item -Recurse -Force .\node_modules\.prisma
Remove-Item -Recurse -Force .\.next
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
npm run dev
```

This clears the old Prisma client and Next.js build artifacts, then regenerates the Prisma client and syncs the PostgreSQL schema and seed data before starting the dev server.

## Admin Bootstrap Script

The project includes a one-time bootstrap utility to ensure an admin account exists in both Supabase Auth and the public `User` table in PostgreSQL.

To run it from the project root:

```bash
npm run bootstrap:admin
```

Before running this command, make sure the following environment variables are available to the Node process (for example via your shell or an `.env` file that is loaded for scripts):

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_FULL_NAME`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The script will:

- create or reuse a Supabase Auth user with `ADMIN_EMAIL`
- create or update a matching Prisma `User` record with role `ADMIN` and account status `ACTIVE`
- safely handle repeated runs without creating duplicates

# Fresh Trace

Fresh Trace is a food tracking and waste reduction application developed for COMP231 using Agile Scrum.

## Team Members
- Sinikiem
- Burak
- Rexy
- Amir
- Krish
- Tim

## Iteration 1 Scope
- Capture or upload grocery receipt
- Review extracted receipt items
- Add or remove extracted items
- Edit items
- Save confirmed items
- Add items manually
- View priority overview
- Select category
- Mark item as used
- Mark item as wasted

## Tech Stack
- Next.js
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL (Supabase)
