# T5-W26-COMP231

## Project Structure

- `client/` – Next.js frontend application (app router, components, types).
- `server/` – Backend code and Prisma (`server/prisma`).

## Getting Started

You can run the app either from the root or from the `client` folder:

- From the root (recommended for most users):

  ```bash
  npm run dev
  ```

- Or directly from the client app:

  ```bash
  cd client
  npm run dev
  # or
  yarn dev
  # or
  pnpm dev
  # or
  bun dev
  ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the main page by modifying `client/app/page.tsx`. The page auto-updates as you edit the file.

# Fresh Trace

Fresh Trace is a food tracking and waste reduction application developed for COMP231 using Agile Scrum.

## Team Members
- Sinikiem Azaiki
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
- SQLite
