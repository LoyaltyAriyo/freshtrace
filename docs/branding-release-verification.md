# FreshTrace branding release verification

Verified locally on 12 September 2026. No push, deployment, Vercel project creation,
or remote record mutation was performed. Authenticated visual checks remain deferred.

## Baseline

- Repository: `LoyaltyAriyo/freshtrace`; origin fetched successfully.
- Started on `main`, with HEAD and fetched `origin/main` both
  `eb23a42da31b8f0bed5041929098383faac00e3b`, ahead/behind 0/0.
- Tracked files were clean. The only untracked input was root `Logo&Favicon/`.
- Working branch: `feat/freshtrace-branding`.

## Actual input inventory

All paths below were originally inside `Logo&Favicon/`. Full before/after paths,
SHA-256 hashes, alpha extrema and SVG ID checks are in
[the preserved inventory](../asset/brand/inventory.json).

| Supplied file | Type | Bytes | Dimensions / viewBox | Transparency |
| --- | --- | ---: | --- | --- |
| `README.md` | text/plain | 11,809 | — | — |
| `apple-touch-icon.png` | image/png | 5,424 | 180 × 180 | opaque |
| `favicon-16x16.png` | image/png | 510 | 16 × 16 | partial alpha |
| `favicon-32x32.png` | image/png | 1,040 | 32 × 32 | partial alpha |
| `favicon.svg` | image/svg+xml | 703 | 0 0 1000 1000 | transparent |
| `freshtrace-logo-horizontal-2048.png` | image/png | 67,193 | 2048 × 478 | partial alpha |
| `freshtrace-logo-horizontal-dark.svg` | image/svg+xml | 10,389 | 0 0 1028.8 240 | transparent |
| `freshtrace-logo-horizontal.svg` | image/svg+xml | 10,368 | 0 0 1028.8 240 | transparent |
| `freshtrace-logo-mark-1024.png` | image/png | 91,426 | 1024 × 1024 | partial alpha |
| `freshtrace-logo-mark-flat.svg` | image/svg+xml | 2,619 | 125 110 1000 1000 | transparent |
| `freshtrace-logo-mark-monochrome.svg` | image/svg+xml | 1,472 | 125 110 1000 1000 | transparent |
| `freshtrace-logo-mark.svg` | image/svg+xml | 4,074 | 125 110 1000 1000 | transparent |
| `icon-192.png` | image/png | 7,063 | 192 × 192 | partial alpha |
| `icon-512.png` | image/png | 21,322 | 512 × 512 | partial alpha |
| `reference-comparison.png` | image/png | 632,108 | 1280 × 1410 | opaque RGB |

## Preservation and organization

- All 15 supplied files retained; every post-move SHA-256 matches the input.
- Five logo SVGs: `client/public/brand/`.
- SVG favicon and five PNG icons: `client/public/brand/icons/`.
- Two large PNG exports, approval comparison and original delivery README:
  `asset/brand/`; README renamed to `package-readme.md`.
- Large PNGs are retained for future document/presentation use, outside public assets.
- No approved asset was redrawn, recoloured, cropped, regenerated or otherwise edited.
- No ZIP, macOS metadata, checksum list, validation file, source font or licence file
  was actually supplied. Missing README-listed files were not fabricated/downloaded.
- Six SVGs parsed successfully: no executable content, events, embedded rasters,
  external dependencies, remote fonts, foreignObject, unsafe references or invalid/duplicate IDs.

## Application changes

- Added shared `BrandLink`; integrated it into `AppNav` and the login page.
- The old header declared the 394 × 80 Next logo as 32 × 32, while automatic
  height exposed the incompatible aspect ratio. Authentication middleware also
  intercepted its public URL. Correct SVG dimensions and narrow public-path
  exclusions address both causes.
- Light-background horizontal SVG displayed at 256 × approximately 59.72 CSS pixels.
  Integer Image attributes 1286 × 300 exactly match the 1028.8 × 240 viewBox ratio.
  `w-64 h-auto`, external static SVG, unoptimized, intentionally eager above the fold;
  no preload, inline SVG, filter or animation.
- Full horizontal logo fits mobile. Header height 80 pixels; desktop links at
  1024 pixels and above, bottom navigation below. Main-content bottom padding
  follows the same breakpoint in root/admin layouts.
- Home link names: “FreshTrace home” and “FreshTrace admin home”; empty decorative
  image alt avoids duplicate speech. Existing role-specific links/sign-out preserved.
- Login/signup copy, title and application name consistently use FreshTrace.
- Removed default file-based Vercel favicon and all five starter public SVGs:
  next, vercel, file, globe and window. No active default-logo reference remains.
- Disabled the development-only Next badge with supported `devIndicators: false`.
  Compile/runtime errors still surface normally.

## Metadata and manifest

- Explicit root Metadata is the sole icon source: SVG favicon, 32/16 PNG fallbacks,
  and 180 × 180 Apple icon. Removed broken old paths and the conflicting ICO.
- `app/manifest.ts` is the sole file-based manifest; no explicit duplicate manifest link.
- Name/short_name FreshTrace; preserved food-tracking/waste-reduction description;
  start_url `/`; display standalone; background `#F8F9F8`; theme `#005F35`.
- 192/512 PNG icons use purpose `any`, never maskable.
- Theme colour is exported through Viewport, not a deprecated Metadata field.
- Root-relative paths work with Vercel Root Directory `client`; no development domain
  is embedded. No prior robots/social metadata was removed (none was configured).

## Automated release gate

- Node 22.23.2; clean canonical `client/package-lock.json` install: 642 packages.
  Initial sandbox install failed; approved network retry succeeded. Lockfile unchanged.
- Prisma Client 6.19.3 generation passed; schema validation passed with fake localhost URLs.
- Full Vitest: **602 tests passed in 50 files**. The initial run lacked a required
  test DATABASE_URL; rerun with a fake localhost URL passed. Database operations
  in route tests use mocks; no live keepalive endpoint was invoked.
- Added 34 focused tests covering logo/link semantics, geometry, desktop/mobile
  navigation, admin roles, header consumers, metadata, manifest, public assets,
  middleware boundaries and unchanged unknown-path behavior.
- TypeScript `tsc --noEmit`: zero diagnostics; build type checking also passed.
- Focused ESLint: all changed TypeScript/TSX files passed.
- `npm run build -- --webpack`: passed on Next.js 16.3.4.
- All 33 source pages/API routes emitted, plus `_not-found` and manifest.
  `/api/cron/keepalive` remains present. No endpoint implementation was changed.
- `client/vercel.json` parsed and checked: `/api/cron/keepalive`, `17 9 * * *`,
  exactly one daily schedule. Configuration unchanged; no real local CRON_SECRET.
- OCR assets appear only in the receipt-upload route trace, not child receipt APIs.
- Production browser JS scan: 64 chunks; no DATABASE_URL, DIRECT_URL,
  SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET, actual private environment values,
  local absolute paths or embedded approved SVGs. A generic Next Image blur-data-URL
  helper is framework code, not a brand asset payload.
- No tracked `.env`, `.env.local` or `.codex/`; `.codex/` remains ignored.
- Graphify AST update completed at zero API cost. Post-build integrity checks:
  no missing/dangling endpoints, self-loops, exact duplicates or collapsed edges.
  Inventory JSON produces no AST nodes; changed community labels were assigned by
  their hubs. Doc/image semantic re-extraction was intentionally outside this AST-only gate.
- `git diff --check` passed. Staged review excludes generated output, caches,
  node_modules, environment/credential files, ZIPs, macOS metadata and unrelated changes.

## Browser and HTTP verification

- Production login/signup: 1440 × 900, approximately 768 × 1024 (measured 768 × 1025),
  and 390 × 844. Additional signup check at 1025 × 900 verified the desktop breakpoint.
- Captured temporary screenshots through the connected browser. Logo is sharp,
  proportional, readable, unclipped and separated from links; no horizontal overflow.
- Production and development login/signup consoles: no image-ratio, hydration,
  metadata or accessibility warnings. Development checked with actual Next Image.
- All 11 runtime brand assets: HTTP 200, expected MIME types, no login redirect,
  response bytes equal source bytes. Manifest: HTTP 200, application/manifest+json.
- Brand caching: `public, max-age=0` with ETags; manifest revalidates. No conflicting
  icon declarations; one rendered logo. Per-resource browser download timing was
  not exposed by the connected browser, so duplicate network downloads were not directly measured.
- Served SVG favicon visually inspected. Icon metadata persisted across refresh.
  Browser-chrome/OS favicon cache behavior needs a final manual hard-refresh check.
- No existing authenticated session in the connected browser. Home, Food List, Scan,
  Account and admin routes correctly redirect anonymous requests to login. Their
  authenticated visual checks are deferred; navigation/components are covered by tests.
- A deliberately nonexistent API path returned the real 404 page without invoking
  an API handler. An ordinary unknown page still redirects anonymous users to login;
  a mocked signed-in request still reaches the framework not-found handler.

## Existing warnings and remaining manual checks

- Existing middleware deprecation, Next internals using process.cwd in Edge,
  webpack large-string cache notice, and four chart width/height warnings remain.
  No new branding/image/metadata warning was accepted.
- The unchanged default 404 has pale text on the application’s light background
  under a dark system colour preference. The baseline root theme and framework
  not-found styling already have this conflict; review/fix separately before launch.
- Before pushing: inspect Home/Food List/Scan/Account and admin navigation using
  an existing session; check browser-tab favicon after a hard refresh and Apple/app
  icons on target devices; review the pre-existing 404 contrast issue.
- Before future Vercel deployment, select `client` and Node 22, configure secrets
  privately, and use the verified webpack build path. This task does not create,
  link or deploy a Vercel project.
- No database, Auth or Storage records were created, edited or deleted. No migrations,
  seeds, admin bootstrap, receipt operations or live keepalive requests were run.
  No npm audit fix was run.
