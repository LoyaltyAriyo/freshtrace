# FreshTrace

A full-stack grocery management and food waste reduction platform built with Next.js, TypeScript, Prisma, PostgreSQL, and Supabase.

## Project Overview

FreshTrace is a web platform designed to help users manage grocery inventory more intentionally and reduce avoidable food waste. The application supports receipt upload and capture workflows, OCR-assisted item extraction, manual inventory management, freshness-based prioritization, and item lifecycle actions such as marking food as used or wasted. The product is centered on a practical household problem: people often lose track of what they bought, what needs attention first, and what ultimately gets thrown away.

From a technical perspective, FreshTrace brings together a modern React and Next.js frontend with database-backed inventory workflows, role-aware application behavior, administrative tooling, and cloud storage integration. It demonstrates full-stack coordination across user interface design, API development, relational data modeling, authentication, analytics-oriented features, and operational scripts for environment setup and admin provisioning.

FreshTrace was built collaboratively by an Agile Scrum team, with work organized through sprint planning, issue tracking, feature branches, iterative delivery, and cross-functional frontend and backend development. Originally developed as part of the COMP231 Software Development Project course, the repository has been prepared here as a professional portfolio and demonstration project.

## Demo / Screenshots

Release 1 demo video:

- [Watch on YouTube](https://www.youtube.com/watch?v=4BHFCCdKifU)

### Dashboard Overview

Demonstrates the main user dashboard experience and the core inventory-focused interface.

![Dashboard Overview](asset/screenshots/home-dashboard.png)

### Account Management Interface

Demonstrates the user account area and profile-oriented workflow within the application.

![Account Management Interface](asset/screenshots/account-page.png)

### Admin Analytics Overview

Demonstrates the high-level admin analytics dashboard used for operational visibility and reporting.

![Admin Analytics Overview](asset/screenshots/admin-overview.png)

### Admin User Management Section

Demonstrates the administrative user management view and role-aware workflow support.

![Admin User Management Section](asset/screenshots/admin-user-section.png)

### Error Log Monitoring

Demonstrates the admin-facing error log view used to review and monitor application issues.

![Error Log Monitoring](asset/screenshots/error-logs.png)

### Weekly Reporting View

Demonstrates the reporting experience for reviewing weekly metrics and summary insights.

![Weekly Reporting View](asset/screenshots/weekly-reports.png)

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

- `client/` - the deployable Next.js application and Vercel root, including API routes, the sole active Prisma schema, PostgreSQL migrations, seed, generated client, and maintenance scripts
- `server/` - retained legacy database artifacts only; its SQLite migration archive is historical and must never be applied to PostgreSQL

## Installation & Setup

FreshTrace requires Node.js 22. The deployable application and its canonical
npm lockfile both live in `client/`.

1. Clone the repository:

```bash
git clone https://github.com/T5-W26-COMP231/freshtrace.git
```

2. Select Node.js 22 and install the reproducible application dependency set:

```bash
nvm use
cd client
npm ci
```

3. Create a local environment file from the example template:

```bash
cp ../.env.example .env
```

4. Validate the schema and generate the Prisma Client:

```bash
npm run prisma:validate
npm run prisma:generate
```

5. After confirming that `DATABASE_URL` and `DIRECT_URL` target the intended
   new or disposable PostgreSQL database, deploy the migration history and seed
   baseline categories:

```bash
npm run prisma:migrate:deploy
npm run prisma:seed
```

6. Start the development server:

From the repository root:

```bash
npm run dev
```

Or from `client/`:

```bash
npm run dev
```

7. Open the app in your browser:

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
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-public-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
TESSERACT_ENABLED="false"
ADMIN_EMAIL=""
ADMIN_CREATE_IF_MISSING="false"
```

Real secrets must never be committed to the repository. Keep production or shared credentials outside version control and use environment-specific secret management where appropriate.

### Receipt OCR

Receipt OCR is disabled unless the server-side `TESSERACT_ENABLED` variable is
set to exactly `true`. Although this switch is not a secret, keep it in server
configuration; do not add a `NEXT_PUBLIC_` version or expose it to browser code.

For local receipt scanning, add this to `client/.env` or `client/.env.local`:

```env
TESSERACT_ENABLED="true"
```

For production receipt scanning on Vercel, add `TESSERACT_ENABLED=true` in the
project's Environment Variables for the desired environments, then redeploy.
With Root Directory set to `client`, the production build traces the tracked
English language data and the Tesseract Node worker into only the receipt API
function. OCR never downloads language data during a request.

### Signup and email confirmation

Public signup uses Supabase's standard email/password signup endpoint and its Auth
rate limits. Set server-side `SUPABASE_URL` and `SUPABASE_ANON_KEY` to the same
project URL and publishable/anon key as their `NEXT_PUBLIC_` equivalents. Never
use the service-role key as an anon key.

Supabase's **Confirm email** setting controls the signup experience:

- Enabled: FreshTrace creates the application profile, then displays a persistent
  message asking the user to confirm their email and sign in. No automatic login
  is attempted before confirmation.
- Disabled: signup is followed by login, which establishes Supabase session
  cookies and routes administrators to `/admin` and other users to `/`.

Signup returns only a success message and `confirmationRequired`; login returns
only the user ID, email, and application role. Session credentials remain in the
Supabase cookie flow, not login JSON. Production login cookies use HTTPS-only
`Secure` and `SameSite=Lax` attributes. Redirect URL configuration is a separate
deployment step; this change does not configure production redirects.

A server-generated `signup_attempt_id` metadata marker and a real email identity
distinguish a newly created identity from Supabase's existing-account responses.
This marker is not an authorization claim. Duplicate or ambiguous identities are
never linked or deleted by signup. Profile creation uses the new Supabase UUID;
if it fails, the service-role client is used only to delete that new identity.
If deletion fails, a sanitized `CRITICAL` `SIGNUP_COMPENSATION_FAILED` operational
log includes correlation IDs for manual reconciliation. Monitor server logs for
this event; no automatic broad cleanup or retry is performed. Existing orphaned
accounts require authorized reconciliation, not another public signup attempt.

## Prisma / PostgreSQL Notes

- Run Prisma and maintenance commands from `client/`. The repository-root commands are wrappers that delegate to the same `client/` scripts.
- `client/package.json` and `client/package-lock.json` are the canonical application manifest and deployment lockfile. Run `npm ci` from `client/`; the root manifest has wrappers only and does not require a second dependency installation.
- `client/prisma/schema.prisma` is the sole active schema, `client/prisma/migrations/` is the PostgreSQL migration history, `client/prisma/seed.ts` is the category seed, and `client/generated/prisma-client/` is the generated-client path.
- Prisma CLI and Prisma Client are pinned to the same Prisma 6 release. `npm ci` runs the project-scoped generation command through `postinstall`, and the build runs it again through `prebuild`.
- Prisma and maintenance scripts load `client/.env.local` first and then `client/.env`; already exported shell variables take precedence.
- `DATABASE_URL` is the application/runtime connection. `DIRECT_URL` is the direct connection used for migrations and other direct schema operations. Confirm both targets before any command that can access a database.
- Use `npm run prisma:migrate:deploy` for PostgreSQL reconstruction. `prisma db push` is intentionally not part of the project scripts.
- `server/prisma/migrations_legacy_sqlite/` is historical only. Never move, combine, replay, or apply those files to PostgreSQL.
- Migrations and seeds are separate release operations and must not run as part of a Vercel build.

Available commands, from `client/` or through the same-named repository-root wrapper:

```bash
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate:status
npm run prisma:migrate:deploy
npm run prisma:seed
npm run bootstrap:admin
```

## Vercel Deployment Settings

Configure the Vercel project with these repository settings:

- Root Directory: `client`
- Node.js runtime: 22.x (declared by `client/package.json`)
- Install Command: `npm ci`
- Build Command: `npm run build`

The committed `client/package-lock.json` is the deployment lockfile. Prisma
Client generation runs during installation and before the Next.js build.
Database migrations, category seeding, and admin bootstrap remain separate
release operations and must not run as part of the Vercel build.

## Admin Bootstrap Script

The admin bootstrap utility promotes one existing, email-confirmed account.
It never creates Auth identities or application profiles. Register and verify
the account through the normal signup flow first.

Run it from `client/`, or use the same command from the repository root:

```bash
npm run bootstrap:admin
```

Required server configuration:

- `DATABASE_URL`
- `DIRECT_URL` (used by the automatic pre-bootstrap Prisma generation step)
- `ADMIN_EMAIL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Supply `ADMIN_EMAIL` privately for the process, using your shell or secret
manager. Do not commit a real email or credentials. The normal environment
loader reads ignored `client/.env.local` before `client/.env`; already exported
variables take precedence. The script does not rewrite either file.

`ADMIN_PASSWORD` and `ADMIN_FULL_NAME` are neither required nor read.
`ADMIN_CREATE_IF_MISSING` should be absent or `false`; setting it to exactly
`true` is explicitly rejected. Account creation is not supported by this tool.

Before writing, the script exhausts Auth pagination and requires exactly one
case-insensitive email match in each system, a confirmed Auth email, an existing
Prisma profile, and identical UUIDs. Missing, duplicate, mismatched, or changing
records cause refusal. A serializable transaction updates only `role=ADMIN`
and `accountStatus=ACTIVE` (Prisma also maintains `updatedAt`). ID, email, full
name, and related records are preserved. Auth password, confirmation, metadata,
and sessions are never modified. Rerunning an already active administrator is a
read-only success and does not change its timestamp.

The command prints only sanitized outcomes and aggregate verification counts.
It checks that user counts, Auth prerequisites, profile fields and related-record
membership remain unchanged. Failed verification rolls back the application
update; provider errors and credentials are not printed. Auth and PostgreSQL
cannot share an atomic transaction, so avoid concurrent account administration
while running this one-off command.

Each initial, pre-write, and post-write Auth check fully paginates the email
lookup and retrieves the matching account by UUID. Only UUID, normalized email,
confirmed-email state, uniqueness, and exposed restriction states are compared.
Supabase's supported `banned_until` and `deleted_at` fields are checked on both
endpoints, retaining field availability separately; an active ban (Auth disabling),
deletion, malformed restriction value, or changing availability causes refusal.
Absent restriction fields do not independently prove that an account is unrestricted.
Identity-provider arrays, metadata, session fields, property ordering, and harmless
timestamp changes are excluded. Confirmation timestamps only establish confirmation;
ban timestamps only establish whether the ban is active.

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
