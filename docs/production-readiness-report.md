# FreshTrace production readiness report

Reviewed: September 29, 2026

## Decision

The requested analytics authorization, session refresh, and upload fixes are implemented and tested. A clean installation and production build succeed on Node.js 22. The application is ready for a Vercel preview deployment once the project and environment variables are configured, but **final public launch is not yet verified**.

The remaining launch requirements are a Vercel project configured for this repository, production authentication URLs, custom SMTP for public signup, and a deployed end-to-end verification. A Prisma tooling dependency advisory and existing lint failures also remain documented below.

## Git and scope

Before changing application code, I checked the remote branches. The previous branding commit, `6d946274189bc7e51d5006230d1f26974e973a28`, was on the branding branch while `origin/main` was still at `eb23a42`. I fast-forwarded remote `main` to `6d94627`, including the preceding branding-assets commit `2434098`. This succeeded before the fixes began.

The fixes were prepared on `codex/production-readiness` for delivery to `main`. The client-local `AGENTS.md` and `CLAUDE.md` files remain excluded from version control. No credentials were added to tracked files.

Production inspection was read-only: I did not deploy to Vercel, change Supabase settings, run production migrations or seeds, create users, or send test email.

## 1. Analytics authorization

Updated `client/app/api/analytics/route.ts` to call the existing `requireAdmin()` guard before executing any analytics query.

- Anonymous requests receive HTTP 401.
- Authenticated users without the required administrator access receive the guard's rejection response, including HTTP 403 for insufficient access.
- Authorized responses include `Cache-Control: private, no-store`.
- Tests verify rejected requests never reach the metric queries and successful responses carry the cache header.

This closes the previously unauthenticated endpoint that exposed application-wide analytics.

## 2. Session refresh

Migrated `client/middleware.ts` to the current Next.js `client/proxy.ts` convention and corrected refresh propagation.

- Refreshed cookies are written to both the forwarded request and browser response. Server Components and route handlers therefore receive the renewed session during the same request.
- Redirect responses retain refreshed or cleared cookies and session-related cache headers.
- Refresh responses explicitly use `private, no-store` and preserve Supabase's `Expires` and `Pragma` headers when provided.
- Regular API routes pass through session refresh, then perform their own authorization and return JSON errors. They do not redirect anonymous API calls to HTML login pages.
- Login/signup/logout API routes and the separately authenticated keepalive cron remain excluded from the session proxy.
- Public branding and framework assets retain their exclusions.
- `getCurrentAppUser()` no longer attempts cookie writes during Server Component rendering. The proxy owns refresh; the helper reads the forwarded cookies.

Regression tests cover request and response cookie propagation, redirects, API behavior, matcher boundaries, cache headers, and read-only Server Component cookies. The production smoke test also confirmed that anonymous API requests return JSON 401 responses.

The implementation follows the refresh ownership described in [Supabase's Next.js server-side authentication guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs). A real expired-session browser flow still needs verification on the deployed preview.

## 3. Upload handling

Added `client/lib/receipt-upload.ts` as the shared source for receipt size and MIME validation.

| Behavior | Result |
| --- | --- |
| Maximum receipt file | 4 MiB / 4,194,304 bytes |
| Supported declared MIME types | JPEG, PNG, HEIC, HEIF, WebP |
| Browser receives an oversized file | Shows a useful error before making an upload request |
| API receives an oversized file | Returns HTTP 413 before storage/database writes |
| Vercel rejects a request with a non-JSON 413 | Browser still displays the size error |
| File exactly at the cap | Covered by a successful route test |

The previous 10 MB allowance exceeded Vercel's 4.5 MB function request limit. The new cap leaves room for normal multipart overhead. An unusually large multipart body can still be rejected by the platform; the client now handles that response. See [Vercel function request limits](https://vercel.com/docs/functions/limitations#request-body-size).

This change retains the existing server upload and OCR workflow. It does not introduce direct browser-to-storage uploads or automatic image compression. Larger images must be resized first. Accepted image formats are not a guarantee that the OCR decoder can read every file; the existing manual review/fallback remains available. README guidance now states these limits.

## 4. Dependency review

Updated compatible dependency resolutions in `client/package-lock.json`, keeping the declared dependency ranges and the pinned Next.js/Prisma versions unchanged. Representative updates include:

| Package | Previous | Updated |
| --- | --- | --- |
| ws | 8.20.0 | 8.22.0 |
| baseline-browser-mapping | 2.10.9 | 2.11.26 |
| vitest | 4.1.0 | 4.1.11 |
| @vitest/mocker | 4.1.0 | 4.1.11 |
| vite | 8.0.1 | 8.3.1 |
| tsx | 4.21.0 | 4.23.15 |
| esbuild | 0.27.4 | 0.28.2 |
| undici | 7.24.5 | 7.30.0 |
| @babel/core | 7.29.0 | 7.29.7 |
| @humanfs/node | 0.16.7 | 0.16.8 |
| brace-expansion (1.x resolution) | 1.1.13 | 1.1.21 |
| browserslist | 4.28.1 | 4.29.3 |
| js-yaml | 4.1.1 | 4.3.2 |

Both the final full audit and `npm audit --omit=dev` report **three high-severity affected-package entries**. These are one underlying advisory propagated through this chain:

`prisma → @prisma/config → deepmerge-ts`

The remaining [DeepmergeTS advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) concerns stack exhaustion when recursively merging object graphs in versions below 8.0.0. The installed Prisma configuration loader uses it to process project configuration. Inspection found no request-controlled input flowing into that loader, and the sampled built receipt, analytics, and account traces did not contain `deepmerge-ts` or `@prisma/config`.

That reduces the demonstrated runtime exposure; it does not make the advisory disappear. Prisma tooling still runs during installation/build. npm's proposed forced fix would downgrade the pinned Prisma CLI from 6.19.3 to 6.12.0. I did not apply that downgrade or impose an untested major transitive override. A deliberate Prisma dependency migration should address the remaining advisory. Until then, the audit is not clean and any zero-high-advisory release gate remains unsatisfied.

## 5. Production configuration verification

I inspected the accessible Supabase project and Vercel account and checked database state with read-only queries. Local environment values were compared without printing or storing secrets in this report.

| Area | Observed state | Assessment |
| --- | --- | --- |
| Vercel project | No FreshTrace project found in the accessible account; other projects were visible | Deployment configuration remains unverified; a project may exist in another account/team |
| Vercel root, production branch, Node runtime | No matching project available to inspect | Set root to `client`, production branch to `main`, Node.js to 22.x |
| Vercel production environment | Unavailable to inspect without the project | Must be configured and verified before launch |
| Supabase health | Project reported healthy | Passed at review time |
| Supabase Data API | Disabled | Consistent with this application's Prisma database access |
| Receipt bucket | `receipts` exists and is private | Passed |
| Bucket limits | 10 MB; JPEG, PNG, WebP, HEIC, HEIF allowed | Compatible with the stricter 4 MiB application cap |
| Bucket policies | No policies shown | Server upload uses the service role; browser-direct upload was not introduced |
| Email signup | Enabled; email confirmation enabled | Requires working delivery for public signup |
| Custom SMTP | Disabled | Launch blocker for reliable public signup |
| Authentication Site URL | `http://localhost:3000` | Must change to the final HTTPS application URL |
| Authentication redirect allowlist | Empty | Add the actual required production/preview callback URLs |
| Database project identity | Local database and Supabase configuration point to the inspected project | Passed locally; does not prove Vercel settings |
| Public/server Supabase configuration | URLs and anon-key pairs agree; service-role key is separate | Passed locally |
| Migration history | All three repository migrations are applied and checksum-matched | Passed |
| Baseline categories | 12 categories present | Passed |
| Local OCR configuration | `TESSERACT_ENABLED=true` | Passed locally; production setting unverified |
| Cron secret | Not present in inspected local environment | Production value unverified; configure it on Vercel |

The migration records verified were:

- `20260403170000_postgres_baseline`
- `20260408120000_add_notifications`
- `20260414215544_add_error_logs`

Supabase's built-in email sender is restricted and is not suitable for unrestricted public signup. Configure a custom provider and verified sender while retaining email confirmation. See [Supabase SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp).

The final production domain and SMTP provider credentials were not available, so those settings were not changed speculatively.

## 6. Validation results

| Check | Result |
| --- | --- |
| Full Vitest suite | **52 test files, 622 tests passed** |
| ESLint on all changed/new application and test files | Passed |
| Clean `npm ci` from the committed-source candidate | Passed on Node.js 22.23.2 |
| Standard production build (`npm run build`, Turbopack) | Passed, including TypeScript and generation of 29 static pages |
| Prisma schema validation | Passed |
| Production server smoke checks | Seven passed; details below |
| Live migration checksums and category count | Passed with read-only queries |
| Full dependency audit | Three high affected-package entries from one remaining advisory |
| Full-project ESLint | Failed on existing issues, described below |
| Knowledge graph refresh | Completed after code changes using AST extraction; no API tokens used |

The clean install/build used a separate temporary source copy without local environment files or existing generated output. It used non-production placeholder configuration, so the successful build does not prove live credentials or authenticated operations. The test suite used a dummy database URL to avoid accidental database access.

Production-mode HTTP smoke checks against the clean build:

| Request | Observed response |
| --- | --- |
| `GET /login` | 200 HTML |
| `GET /brand/freshtrace-logo-mark-monochrome.svg` | 200 SVG |
| `GET /account`, anonymous | 307 redirect to login |
| `GET /api/analytics`, anonymous | 401 JSON, no login redirect |
| `GET /api/items`, anonymous | 401 JSON, no login redirect |
| `POST /api/receipts`, anonymous | 401 JSON, no login redirect |
| `GET /api/cron/keepalive`, without bearer secret | 401 JSON |

The temporary production server was stopped after these checks.

### Existing warnings and limitations

Full-project lint reports 574 errors and 1,773 warnings when generated Prisma files are included. Excluding generated output, there are **nine errors and two warnings** in unchanged files:

- Three `react-hooks/set-state-in-effect` errors in the admin overview, analytics, and errors pages.
- Five `no-explicit-any` errors in `components/__tests__/home.test.tsx`.
- One `no-explicit-any` error in `components/edits-item-form.tsx`.
- A navigation warning in `components/sign-out-button.tsx` and an unused variable warning in `lib/queries/overview-metrics.ts`.

These were outside the requested fixes. The lint configuration should also exclude generated Prisma output. Next's successful production build does not mean the separate lint command passes.

Build output still includes existing Recharts container-size warnings during prerender and a generated Prisma dynamic-file-tracing warning. Sample local traced-file totals were approximately 75.8 MiB for receipts, 32.3 MiB for analytics, and 32.6 MiB for account. These are local tracing measurements, not Vercel's final packaged function sizes. The actual deployment must confirm packaging and OCR execution under its runtime limits.

No real-user production login, expired-session renewal, email confirmation, authenticated analytics access, receipt storage/OCR, or authorized scheduled cron execution was performed. Those remain preview acceptance checks.

## 7. Steps to complete before final launch

1. Create or identify the intended Vercel project, connect this repository, select `main` as the production branch, and set Root Directory to `client`. Use Node.js 22.x, `npm ci`, and the repository's `npm run build` command.
2. Configure the required Vercel environment variables: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Keep database and service-role credentials server-only. Configure preview environments deliberately rather than assuming they inherit production values.
3. Set `TESSERACT_ENABLED=true` for production OCR and supply a random `CRON_SECRET` of at least 16 characters. The tracked daily cron is `17 9 * * *` UTC at `/api/cron/keepalive`; verify its registration and authenticated execution in Vercel after deployment.
4. Configure custom SMTP and a verified sender in Supabase. Update Site URL to the final HTTPS domain and add the actual redirect URLs used by the application and intended preview workflow.
5. Review the remaining Prisma advisory and existing lint findings against the project's release requirements. Remediate the dependency through a tested upgrade path; do not apply a forced downgrade merely to silence npm audit.
6. Deploy a preview and exercise signup/confirmation, login/logout, expired-session renewal, administrator and non-administrator analytics access, receipt upload near the size limit, OCR/manual fallback, and cron authorization. Inspect runtime logs and final function packaging.
7. Proceed with final production launch after the configuration and preview checks pass. The current evidence supports the implemented code fixes; it does not yet support an unconditional production go-ahead.
