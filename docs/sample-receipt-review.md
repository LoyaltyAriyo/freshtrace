# Sample receipt: local review

Feature branch: `feat/sample-receipt`. Reviewed locally and approved for `main`.

The Scan Receipt page now shows a compact “No receipt handy?” card below the capture/upload options. “Scan sample receipt” loads `/samples/grocery-receipt.png`, makes a PNG `File`, and uses the existing upload handler, authenticated `/api/receipts` endpoint, Tesseract extractor, and receipt review screen. Inventory saving remains an explicit review-screen action.

The supplied `2 copy.png` is bundled unchanged (754 × 900, 841,991 bytes), as requested, instead of generating the fictional receipt described in the pasted brief. It has nine grocery lines and no store header or sample disclaimer; those absent lines cannot be tested for OCR exclusion.

## Files

- `client/components/receipt-upload-form.tsx`: sample card and shared handling for either a selected file or an async sample loader; existing processing, upload deadline, recovery and generation protection retained.
- `client/lib/sample-receipt.ts`: bounded 10-second same-origin asset fetch, correct filename/MIME type, rejection of redirects, empty images and HTML responses, abort cleanup.
- `client/public/samples/grocery-receipt.png`: the supplied image, under the existing 4 MiB limit.
- `client/components/__tests__/receipt-upload-form.test.tsx`: sample submission, retry after load errors, concurrency in both directions, timeout/stale body and unmount tests.
- `client/scripts/check-sample-receipt-ocr.ts`: repeatable real-extractor check without database or storage credentials.

## Open the app

Use the repository-supported Node 22 runtime and the existing local configuration. From the repository root:

```sh
rtk proxy npm --prefix client run dev -- --webpack --hostname 127.0.0.1
```

Open http://127.0.0.1:3000/scan, sign in normally, and click **Scan sample receipt**. Review/edit/select the extracted groceries, then save only if you want them in your inventory. The image remains in receipt history through the ordinary upload flow.

## Verification

Run from `client/`:

```sh
rtk proxy npx vitest run components/__tests__/receipt-upload-form.test.tsx lib/receipt-request.test.ts app/api/receipts/route.test.ts app/scan/review/page.test.tsx
rtk proxy npx eslint components/receipt-upload-form.tsx components/__tests__/receipt-upload-form.test.tsx lib/sample-receipt.ts scripts/check-sample-receipt-ocr.ts
rtk proxy npm run build -- --webpack
rtk proxy node --conditions=react-server --import tsx scripts/check-sample-receipt-ocr.ts
```

- **Tests:** 54 passed across four focused suites, including the existing API and review behavior.
- **Lint:** passed on all changed code files.
- **Production build:** passed using Node v22.23.2 and Webpack, including TypeScript checking. The default Turbopack build failed because its CSS processing could not bind a local port in this execution environment, including on an escalated attempt. The repository already uses Webpack for its production OCR check. Existing chart-dimension warnings appeared during prerendering.
- **Real OCR:** `SUCCESS`; nine groceries extracted in approximately 0.66 seconds: ZUCHINNI GREEN, BANANA CAVENDISH, POTATOES BRUSHED, BROCCOLI, BRUSSEL SPROUTS, GRAPES GREEN, PEAS SNOW, TOMATOES GRAPE and LETTUCE ICEBERG. Dates, prices, discounts, weight lines and totals were excluded. Original receipt spelling is preserved for user editing.
- **Visual checks:** the actual built `/scan` HTML and assets were served on an isolated local server with no API routes. Hydrated layout checked at 1440 px desktop and 390 px mobile CSS widths. Thumbnail loaded, desktop card was horizontal, mobile card stacked, button was 44 px tall, keyboard focus ring visible, and neither width had horizontal overflow. Desktop/mobile screenshots were saved as review artifacts.

## Limitation

An authenticated browser/API end-to-end scan was not run: the local app redirected to login and no signed-in test session was available. Visual inspection used the isolated built-page preview; client/API behavior was tested with mocks and the bundled image was separately processed by the real current OCR implementation. No production credentials or data were used for the OCR check. Authentication, login code, API architecture, ownership checks and database schema were not modified.
