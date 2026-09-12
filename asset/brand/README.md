# FreshTrace branding

Runtime SVG logos live in `client/public/brand/`; favicon and application icons
live in `client/public/brand/icons/`. Their URLs start with `/brand/`, including
when Vercel uses `client` as its Root Directory.

- Use `freshtrace-logo-horizontal.svg` on light backgrounds. The outlined
  wordmark needs no runtime font. Use `freshtrace-logo-horizontal-dark.svg`
  only on dark backgrounds.
- Preserve approved geometry, colours, transparency and aspect ratio. Never
  stretch, recolour, crop, rotate or filter these assets.
- `BrandLink` displays the complete horizontal SVG at 256 pixels wide with
  automatic height, including mobile. The header is 80 pixels tall, with clear
  space around the mark. Navigation moves to the bottom below 1024 pixels.
- Layout metadata declares the SVG favicon, 32/16 PNG fallbacks and 180-pixel
  Apple touch icon. `client/app/manifest.ts` provides the sole manifest link.
  The 192/512 icons have `purpose: any`; they are **not maskable**.
- Brand URLs and the manifest bypass session middleware so they load before
  authentication. Other page authentication and unknown-route behavior remain.

## Preserved delivery material

All 15 files actually supplied were retained without byte changes. `inventory.json`
records original/final paths, SHA-256 hashes, byte sizes, raster alpha/dimensions,
SVG viewBoxes and SVG safety checks. Six SVGs have no scripts, event handlers,
external dependencies, raster embeddings, live text, unsafe references or invalid
or duplicate IDs. The favicon retains transparent rounded corners; the Apple
icon is intentionally opaque. The 16-pixel PNG has partially transparent corners
(minimum alpha 8), exactly as supplied.

The two large PNG exports are retained here for future presentation/document
use, alongside `reference-comparison.png` for approval comparisons. None is
served by the application. `package-readme.md` preserves the original delivery
notes, including its references to files **not supplied**: ICO, extra previews,
source masters, fonts, licensing files, validation report and checksum list.
Those absent files were neither fabricated nor downloaded. No font is retained
or needed. No ZIP or macOS metadata was present in the supplied directory.
