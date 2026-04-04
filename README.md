# T5-W26-COMP231

## Project Structure

- `client/` – Next.js frontend application (app router, components, types).
- `server/` – Backend code and Prisma (`server/prisma`).

Test Bed Setup (How to Run the Project)

Follow these steps to run the Fresh Trace application locally.

1. Clone the repository
git clone https://github.com/T5-W26-COMP231/T5-W26-COMP231.git
cd T5-W26-COMP231
2. Install dependencies
cd client
npm install
3. Set up the database (Prisma, PostgreSQL)

Make sure you are inside the `client` folder.

- Generate the Prisma client (PostgreSQL)

```bash
cd client
npm run prisma:generate
```

- Create or update the PostgreSQL schema

```bash
npm run prisma:push
```

- Seed default categories (Produce, Dairy, Meat, etc.)

```bash
npm run prisma:seed
```

This will:

- generate the Prisma client targeting PostgreSQL
- create or update the PostgreSQL schema using `DATABASE_URL`
- seed default categories (Produce, Dairy, Meat, etc.)
4. Run the application

From the root (recommended):

npm run dev

Or from the client folder:

cd client
npm run dev
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the main page by modifying `client/app/page.tsx`. The page auto-updates as you edit the file.

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
