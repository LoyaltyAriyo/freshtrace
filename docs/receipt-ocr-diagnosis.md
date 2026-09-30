# Receipt OCR diagnosis and review notes

## Confirmed production failure

Inspected the active [Vercel deployment](https://vercel.com/ariyos-projects-fe139deb/freshtrace/5MStvSRtth6W5hyQ3owk1GUiqFGy) and [failed receipt invocation](https://vercel.com/ariyos-projects-fe139deb/freshtrace/logs?search=%22%2Fapi%2Freceipts%22&selectedLogId=85w5w-1790734368024-8404f7241dc4&panelState=opened) on September 29, 2026 (America/Vancouver).

- Production commit: `1f243360cd7faa6f4cdbb0ff2680a8ba597b6357`, matching the starting checkout and including the fresh-document login/signup fix.
- Request started at 19:12:48.024 PDT. Worker startup failed at 19:12:49.558 PDT with `MODULE_NOT_FOUND: ../../constants/imageType`, required by `tesseract.js/src/worker-script/utils/dump.js`.
- Function returned HTTP 504 after 300.6 seconds; invocation hit its 300-second maximum. Another receipt POST beginning at 19:09:48 also ended in a 300-second timeout, overlapping the requested 19:13–19:15 window.
- Auth and Storage upload/download were reached. The worker's initial module loading failed before recognition. The deployed tracing configuration included worker-script subdirectories but omitted sibling `src/constants` and worker-only dependencies.
- Tesseract.js 7's `createWorker` exposes the native thread only after initialization. Its Node implementation assigns `onerror`, rather than subscribing to the thread's EventEmitter `error`/`exit` events, and its public `terminate` discards the native termination promise. The original initialization wrapper therefore never settled on this native startup failure.
- Active runtime: Node 22.x (repository engines override the project's 24.x setting), Fluid Compute, standard 1 vCPU / 2 GB memory, 300-second duration. Runtime logs showed 227 MB memory for this invocation, so there is no evidence of a memory exhaustion failure.
- Vercel lists `TESSERACT_ENABLED` for Production and Preview. The active invocation executed a branch gated by exact equality with the string `"true"`, confirming its server value at that invocation. Automatic approval review blocked clipboard inspection of this Vercel-classified secret; no secret values were retrieved or printed.
- A read-only database/Storage audit for 19:09–19:18 PDT found two `PENDING` receipt records, zero drafts, and both stored images still present. No existing data was changed.

## Pipeline and changes

### Real iPhone photo follow-up

The supplied real receipt is a 1.69 MB HEIC/HEVC photo. The original Tesseract worker initializes, but rejects that image during recognition. Sharp can read its metadata but its installed decoder cannot read the HEVC pixels. The existing upload validator accepts HEIC/HEIF, so successful upload did not imply a supported OCR input format. A local macOS `sips` attempt also produced an invalid JPEG and was not used as a workaround.

`client/lib/receipt-image.ts` now detects HEIF container brands from the stored bytes. `receipt-image-worker.cjs` uses pinned `heic-convert` to produce a lossless PNG in memory before Tesseract starts; the original stored photo is preserved. Conversion runs in its own native thread with a 15-second deadline and forced termination, including stalled synchronous WASM. Decoder output/errors never enter logs. The decoder entry point and dependencies are included in receipt function tracing. PNG/JPEG/WebP continue directly to the existing OCR worker. No external OCR or conversion service is used.

The exact supplied HEIC succeeded in the isolated read-only production trace on Node 22.23.2 in 5,642 ms. Only status, duration, and candidate count were logged; the image was not uploaded or committed. OCR returned 20 review candidates, including non-item content accepted by the existing parser. Successful decoding/extraction does not establish that every candidate is a food item; users must review the candidates before saving. Parser changes are outside this format fix.

The additional format check passed real isolated production OCR for PNG (710 ms), JPEG (204 ms), WebP (202 ms), and generic HEIF (5,736 ms). The HEIF test changes the supplied photo's major container brand to its already-declared compatible `mif1` brand while retaining the original HEVC pixels and compatible `heic` brand; it is not an independent photo or coverage of every HEIF codec/sequence variant. HEIF needs the same new conversion step as HEIC. PDF is intentionally absent from the supported upload MIME types. A focused API test verifies `application/pdf` receives HTTP 400 before Storage upload, receipt creation, or OCR. The two focused API/decoder suites passed all 22 tests; changed-test lint passed.

The API authenticates via the existing Supabase session helper, validates multipart MIME/size, uploads to the private receipts bucket, creates a `PENDING` Prisma receipt, downloads its stored bytes, runs English Tesseract OCR, parses/deduplicates items with the existing fallback parser, creates category-matched drafts, updates receipt status, then returns the receipt ID for review.

`client/next.config.ts` now explicitly traces all Tesseract source files, core/WASM variants, English data, and dependencies required from inside the Node worker. Node worker entry points are not sufficient to trigger complete Turbopack dependency tracing.

`client/lib/ocr-worker.ts` retains the same Tesseract.js 7 worker script, engine, English model, and job protocol. It owns the native thread before initialization, handles native errors/exits and rejected jobs, and calls native forced termination even if initialization never completes. Output from the native decoder is drained without forwarding it into logs. The Tesseract dependency is pinned to 7.0.0 because this thin lifecycle adapter uses that version's worker protocol.

`client/lib/ocr.ts` preserves item parsing and outcome semantics. Initialization has a 15-second limit, recognition 40 seconds, and cleanup 2 seconds; the overall OCR deadline is at most 60 seconds and no later than 75 seconds after route entry. Native termination is requested before bounding the cleanup wait. The existing 300-second hosting limit is retained, leaving substantial time to persist failure and return a response.

`client/app/api/receipts/route.ts` emits only structured IDs, stages, timings, and sanitized failure categories. A client-generated UUID becomes the receipt ID, allowing recovery through the existing authenticated review endpoint. Repeating an ID returns only its owner's existing receipt. Storage paths omit original filenames. Failures after receipt creation retain the saved image; ambiguous create failures check the record before deleting any object. Operational log persistence cannot keep the OCR failure response waiting indefinitely.

`client/lib/receipt-request.ts` and `client/components/receipt-upload-form.tsx` bound the request and response-body read to 90 seconds, abort stalled requests, handle non-JSON platform errors, prevent overlapping submissions, suppress late/unmounted UI updates, and offer a bounded read-only “Check saved receipt” action. The progress label states “Uploading and processing receipt” until the server response establishes that saving finished. No automatic upload retry occurs.

`client/app/scan/review/page.tsx` no longer treats every `PENDING` receipt as proof OCR is disabled or advises duplicate uploads after a saved receipt fails processing.

Focused tests accompany these changes. Login, signup, auth/session policy, database schema, inventory behavior, and production settings were not modified. No inactivity logout was added.

## Validation

- All 144 tests across 10 focused OCR, receipt API/UI, review, login, signup, and post-login navigation suites passed with Node 22.23.2. Most service tests use mocks; native worker lifecycle tests use real threads and verify exit after forced cancellation of stalled startup/recognition.
- Changed-file ESLint and a Webpack production build passed on Node 22.23.2. The standard Turbopack production build is blocked on this host by `binding to a port: Operation not permitted` in the CSS build worker, including a permission-escalated attempt. Vercel/Turbopack validation is still required.
- Real production OCR passed for synthetic PNG, JPEG, and WebP receipts: Milk (quantity 2), Bread, and Apples were all extracted. Last measured recognition/extraction times were 603, 202, and 201 ms respectively.
- The production check copies only the receipt route's `.nft.json` trace into an isolated temporary directory, makes traced files read-only, asserts worker/language/HEIC decoder paths resolve inside that copy, and blocks runtime fetch downloads in the main process and workers. Supabase/Prisma are never contacted. The supplied HEIC is now verified; other HEIF variants remain untested.
- Follow-up validation: 70 tests across seven receipt OCR/API/UI suites passed, including real-thread conversion failure and stalled-decoder cancellation tests. Changed-file ESLint and the production build passed. Synthetic PNG/JPEG/WebP OCR checks also passed again (740/206/200 ms).
- Final pre-merge validation: 167 tests across 13 receipt, review, OCR worker/decoder, login, signup, and post-login navigation suites passed on Node 22.23.2. ESLint passed for all changed code/test files, and `git diff --check` passed.
- `client/scripts/test-production-ocr.mjs` provides the repeatable real check. It temporarily adds a local GET probe during compilation, restores the original source, and rebuilds the final output with no probe. It never starts a server. Run it directly with the supported Node 22 executable from any directory, or run `rtk proxy node ./scripts/test-production-ocr.mjs` from `client/` after verifying `node --version`.
- To add a local private-photo check, supply its absolute path through `FRESHTRACE_PRIVATE_OCR_SAMPLE` when running the script. It copies the image only into the temporary local fixture, reports no receipt text, and removes the fixture afterward.
- The project knowledge graph was refreshed with `graphify update .` as required.

## Verification after approval to deploy

1. Create a new Vercel deployment from the reviewed code with Root Directory `client`. Keep `TESSERACT_ENABLED=true`, Node 22.x, and the existing Fluid Compute/memory/duration settings. A new build is required to include the corrected traced files; changing the environment flag or increasing duration is unnecessary.
2. Verify the new deployed Git SHA. Inspect the receipt function's files for `eng.traineddata`, `tesseract.js/src/constants/imageType.js`, the Node worker script, core/WASM assets, `lib/receipt-image-worker.cjs`, and HEIC decoder dependencies.
3. Sign in and upload a non-sensitive sample receipt. Expect POST `/api/receipts` HTTP 201 with `ocrOutcome: SUCCESS`, `ocrStatus: SUCCESS`, a saved receipt ID, expected drafts in review, and no missing-module or timeout errors. New stage logs should progress through initialization, recognition, parsing, termination, and completion without printing receipt content.
4. Verify a safely induced recognition failure completes promptly with a saved receipt and `FAILED` status, exits browser loading, and permits manual recovery. Verify “Check saved receipt” makes a GET request rather than another upload; a pending record explains processing uncertainty.
5. Preserve the two older pending receipts/images for user review. They have not been repaired, rerun, or deleted by this work.
6. Upload a permitted HEIC test photo. Expect stage logs to include image preparation before initialization, then successful extraction and review. Confirm that the original stored image is still HEIC. Review candidate accuracy separately from decoding success.

No deployment or production configuration change has been performed. Local real OCR establishes extraction from a traced production bundle; it does not establish that the corrected Turbopack/Vercel bundle is already deployed.
