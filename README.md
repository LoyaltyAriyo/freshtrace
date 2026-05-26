# FreshTrace

A full-stack grocery management and food waste reduction platform built with Next.js, TypeScript, Prisma, PostgreSQL, and Supabase.

## Project Overview

FreshTrace is a web platform designed to help users manage grocery inventory more intentionally and reduce avoidable food waste. The application supports receipt upload and capture workflows, OCR-assisted item extraction, manual inventory management, freshness-based prioritization, and item lifecycle actions such as marking food as used or wasted. The product is centered on a practical household problem: people often lose track of what they bought, what needs attention first, and what ultimately gets thrown away.

From a technical perspective, FreshTrace brings together a modern React and Next.js frontend with database-backed inventory workflows, role-aware application behavior, administrative tooling, and cloud storage integration. It demonstrates full-stack coordination across user interface design, API development, relational data modeling, authentication, analytics-oriented features, and operational scripts for environment setup and admin provisioning.

FreshTrace was built collaboratively by an Agile Scrum team, with work organized through sprint planning, issue tracking, feature branches, iterative delivery, and cross-functional frontend and backend development. Originally developed as part of the COMP231 Software Development Project course, the repository has been prepared here as a professional portfolio and demonstration project.

## Demo / Screenshots

Demo and screenshots will be added soon.

Suggested screenshots:

- Dashboard
- Receipt upload workflow
- Food priority overview
- Manual item entry
- Admin analytics dashboard

## Features

### Inventory Management

- Add, edit, and remove food items from a household inventory
- Support manual item entry with category selection
- Organize food into freshness priority groups such as Use First, Use Soon, and Use Later
- Mark items as used or wasted to maintain an accurate inventory state
- Save confirmed grocery items after review

### Receipt Workflow

- Upload or capture grocery receipts through the web interface
- Process receipt images through an OCR-based extraction workflow
- Review extracted receipt items before saving them
- Adjust extracted data by editing or removing items before confirmation
- Store receipt images in cloud-backed storage for supporting workflows

### Admin / Analytics

- Support authentication and role-based workflows
- Provide admin-facing dashboard and analytics functionality
- Include backend and schema support for notifications-related features
- Offer administrative bootstrap tooling for provisioning an initial admin account

### Engineering / System Features

- Full-stack implementation using Next.js, React, TypeScript, Prisma, PostgreSQL, and Supabase
- Responsive interface for desktop and mobile-friendly usage
- REST-style API route structure within the Next.js application
- Relational data modeling for inventory, user, and analytics-related workflows
- Collaborative Agile Scrum delivery using GitHub Issues, feature branches, debugging, and testing practices

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend

- Node.js
- Next.js API routes
- REST API structure
- Prisma ORM

### Database & Cloud

- PostgreSQL
- Supabase
- Supabase Storage

### Tools & Practices

- Agile Scrum
- GitHub Issues
- Feature branches
- Sprint planning
- API testing and debugging
- Collaborative development

## Architecture

```text
User Interface -> API Routes -> Prisma ORM -> PostgreSQL / Supabase Storage
```

Repository structure:

- `client/` - Next.js frontend application using the App Router, shared components, application types, and Prisma schema/client setup for the main app
- `server/` - backend utility scripts plus Prisma schema/client assets used for supporting scripts and administrative workflows

## Installation & Setup

1. Clone the repository:

```bash
git clone https://github.com/T5-W26-COMP231/freshtrace.git
```

2. Install frontend dependencies:

```bash
cd client
npm install
```

3. Create a local environment file from the example template:

```bash
cp ../.env.example .env
```

4. Generate the Prisma client, sync the database schema, and seed baseline data:

```bash
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
```

5. Start the development server:

From the repository root:

```bash
npm run dev
```

Or from `client/`:

```bash
npm run dev
```

6. Open the app in your browser:

```text
http://localhost:3000
```

## Environment Variables

Use `.env.example` as the starting point for local setup. Placeholder example values:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/freshtrace"
DIRECT_URL="postgresql://user:password@localhost:5432/freshtrace"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-public-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="change-me"
ADMIN_FULL_NAME="Admin User"
```

Real secrets must never be committed to the repository. Keep production or shared credentials outside version control and use environment-specific secret management where appropriate.

## Prisma / PostgreSQL Notes

- Prisma commands in this project may rely on environment variables already being exported in your shell. In practice, having a local `.env` file is not always sufficient for every script path.
- If Prisma commands fail because connection variables are missing, export the required values before running `npm run prisma:generate`, `npm run prisma:push`, or `npm run prisma:seed`.
- If you previously worked with an older SQLite-based setup, stale generated artifacts can cause Prisma or runtime validation issues. Clearing `client/node_modules/.prisma` and `client/.next` before regenerating Prisma can resolve those mismatches.

## Admin Bootstrap Script

FreshTrace includes an admin bootstrap utility for provisioning or reconciling an administrative account across Supabase Auth and the application database.

Run it from the repository root:

```bash
npm run bootstrap:admin
```

Required environment variables:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_FULL_NAME`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The script creates or reuses a Supabase Auth admin account and then creates or updates the matching Prisma `User` record so the administrative user state remains synchronized across authentication and database layers.

## Team Collaboration

FreshTrace was developed through an Agile Scrum workflow with sprint planning, issue tracking, and iterative delivery across the project lifecycle. Work was organized through GitHub Issues and feature branches so team members could develop, review, and merge work in manageable increments.

The project required close collaboration between frontend and backend contributors, especially for receipt-processing flows, inventory state management, admin tooling, and database-backed application behavior. Testing, API debugging, schema synchronization, and UI refinement were handled continuously throughout development rather than as a single final phase.

## Team Members

- Amirhossein Mohammadi
- Burak
- Rexy
- Krish
- Tim
- Sinikiem

## Challenges & Lessons Learned

- Designing an OCR-driven receipt workflow required balancing extraction accuracy, review steps, and downstream inventory usability.
- Migrating and synchronizing Prisma schemas against PostgreSQL introduced important lessons around client generation, schema drift, and environment configuration.
- Integrating Supabase for database connectivity, storage, and authentication required careful coordination between app logic and cloud services.
- Building freshness prioritization logic highlighted the complexity of turning raw grocery data into actionable household decisions.
- Collaborative Git workflows reinforced the value of disciplined branching, issue ownership, and clear merge coordination across a team project.
- API debugging and testing improved reliability across item management, receipt handling, and admin-related routes.
- Building admin analytics functionality required combining application data modeling with operational visibility and reporting concerns.

## Future Improvements

- AI-powered recipe recommendations
- Smarter expiration prediction
- Push and email notifications
- Barcode scanning
- Enhanced analytics
- Mobile app support
- Improved OCR accuracy

## License / Purpose

This project was developed for educational, portfolio, and demonstration purposes.
