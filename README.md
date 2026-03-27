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
