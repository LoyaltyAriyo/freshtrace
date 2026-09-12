# FreshTrace brand assets

Production asset package • 12 September 2026

Faithful vector reconstruction of the two supplied approved references: three unequal leaves in a circular flow for the main logo, and a distinct broad diagonal leaf on a forest-green rounded tile for the favicon. All delivery SVGs use editable geometry; delivery wordmarks contain paths, not live text.

## Asset index

| File | Purpose |
| --- | --- |
| `logos/freshtrace-logo-mark.svg` | Primary three-leaf mark; restrained linear gradients |
| `logos/freshtrace-logo-mark-flat.svg` | Same composition, solid fills only |
| `logos/freshtrace-logo-mark-monochrome.svg` | One ink with transparent vein cutouts; default forest green |
| `logos/freshtrace-logo-horizontal.svg` | Primary mark + forest-green outlined FreshTrace wordmark; light backgrounds |
| `logos/freshtrace-logo-horizontal-dark.svg` | Primary mark + pale-mint outlined FreshTrace wordmark; dark backgrounds |
| `png/freshtrace-logo-mark-1024.png` | Transparent 1024 × 1024 RGBA mark |
| `png/freshtrace-logo-horizontal-2048.png` | Transparent 2048 × 478 RGBA light-background lockup; height rounded to the nearest pixel |
| `icons/favicon.svg` | Standard scalable favicon master, transparent outer corners |
| `icons/favicon.ico` | Three genuine 32-bit PNG-compressed entries: 16 × 16, 32 × 32, 48 × 48 |
| `icons/favicon-16x16.png` | Independently rendered from the optical small-size master |
| `icons/favicon-32x32.png` | Independently rendered from the optical small-size master |
| `icons/favicon-48x48.png` | Extra export; standard-master raster used in the ICO |
| `icons/apple-touch-icon.png` | 180 × 180; opaque, full-bleed forest-green square |
| `icons/icon-192.png` | 192 × 192 standard rounded app icon; purpose `any` |
| `icons/icon-512.png` | 512 × 512 standard rounded app icon; purpose `any` |
| `preview/freshtrace-brand-preview.png` | Main visual overview |
| `preview/favicon-actual-sizes.png` | Compact native-size 16/32/48-pixel samples on light and dark backgrounds |
| `preview/reference-comparison.png` | Direct reference-versus-vector comparison |
| `preview/preview.html` | Local browser preview; open after extracting the ZIP, at 100% zoom |
| `source/favicon-small.svg` | Explicit optical master used only for the 16/32-pixel raster exports |
| `source/apple-touch-icon-master.svg` | Full-bleed square touch-icon vector master |
| `source/logo-reference-coordinate-master.svg` | Primary mark in original 1254 × 1254 reference coordinates |
| `source/Rubik-Regular.ttf` | Unmodified source font, included under OFL 1.1 |
| `source/wordmark-metrics.json` | Typeface, tracking, pair spacing and lockup dimensions |
| `source/palette.json` | All solid colours and exact gradient coordinates/stops |
| `source/export_assets.py` | Rebuild all delivery PNGs and ICO from the supplied vector masters |
| `source/validation-report.json` | Technical validation results and visual-review record |
| `licenses/Rubik-OFL.txt` | SIL Open Font License and source-font notices |
| `SHA256SUMS.txt` | SHA-256 hashes of package files, excluding this checksum file |

## Palette

Colours are sRGB. There are no shadows, filters, textures or glossy effects.

| Role | HEX |
| --- | --- |
| Forest / light-background wordmark / favicon background | `#005F35` |
| Main emerald | `#00954C` |
| Flat top body | `#057B43` |
| Flat left body | `#3CA43B` |
| Flat left outer tone | `#19963A` |
| Flat left lower fold | `#008442` |
| Flat bottom-right body | `#006737` |
| Flat bottom-right outer tone | `#009345` |
| Top leaf edge accent | `#35A638` |
| Favicon leaf | `#62D878` |
| Pale veins / dark-background wordmark | `#EBFFF1` |

### Primary mark gradients

All gradients use `gradientUnits="userSpaceOnUse"`, two opaque stops at 0% and 100%, and the original mark coordinate system. Coordinates stay fixed within the mark when its group is transformed.

| ID | From (x, y) | To (x, y) | 0% → 100% |
| --- | --- | --- | --- |
| `top-body` | (430, 270) | (986, 589) | `#078347` → `#006337` |
| `emerald` | (460, 160) | (990, 570) | `#00954C` → `#009A46` |
| `left-body` | (326, 420) | (444, 1040) | `#42A63B` → `#2D9D3C` |
| `left-outer` | (300, 450) | (171, 801) | `#148E32` → `#199D39` |
| `left-fold` | (178, 774) | (514, 1068) | `#068943` → `#00803C` |
| `bottom-body` | (585, 969) | (1075, 620) | `#006237` → `#006A3A` |
| `bottom-outer` | (562, 997) | (1093, 694) | `#089A45` → `#00893D` |

The favicon uses solid fills. Its dark internal opening is the background revealed by the leaf contour, alongside a separate pale filled vein. Preview-only surfaces are `#FFFFFF`, `#F4F7F3`, and `#082D20`; they are not baked into transparent logo assets.

## Typography

**Rubik Regular**, supplied font version **1.100**, licensed under **SIL Open Font License 1.1**, which permits commercial use and distribution subject to its terms. The complete license and source-font copyright notices are included. Upstream license: <https://github.com/google/fonts/blob/main/ofl/rubik/OFL.txt>.

The capitalization is exactly **FreshTrace**. Each glyph is outlined as an individual path. Neither an installed font nor an external font request is required to display the delivery SVGs.

The lockup uses slightly tightened tracking (−4 font units per 1000 UPM) plus deliberate pair adjustments, notably `Tr` (−40 units). Exact adjustments appear in `source/wordmark-metrics.json`. Visible letter height is 108 units in the 240-unit lockup. The mark and letter outlines are optically centred near y=120, with about 42 units between the visible mark and the first letter. The wordmark is a new companion treatment; neither supplied reference included typography.

## Geometry and deliberate refinements

- Exactly three independently drawn leaf groups: `leaf-top`, `leaf-left`, and `leaf-bottom-right`. Their outlines and relative sizes differ, as in the reference. No ring, arrow, dot or added symbol.
- Smooth cubic Bézier outlines replace raster edge noise, with quadratic rounding only at selected tips. Tonal paths are deliberately layered within each leaf; no clipping masks or filters are required.
- Each colour leaf contains its own body, tonal divisions and vein subgroup. The monochrome version incorporates veins as transparent compound-path cutouts inside the corresponding leaf, so it uses only one ink.
- The original white presentation margins have been removed from delivery assets. The mark uses a square `viewBox="125 110 1000 1000"`, centred around the visible silhouette. The reference-coordinate master retains the original canvas for comparison.
- Reference microtexture and lighting noise were removed. Colours were consolidated into controlled solid fills and subtle linear gradients. Pale veins use consistent `#EBFFF1` instead of the varying near-white raster pixels.
- The favicon uses a 1000-unit square with 184-unit corner radii, following the cropped reference tile. The broad leaf retains its diagonal orientation, open dark curved incision and clean stemless base. Its distinct geometry is intentional.
- Apple touch-icon corners are deliberately square and fully opaque so the OS can apply its own corner mask.

## Small-size favicon treatment

The 16 × 16 and 32 × 32 PNGs and corresponding ICO entries use `source/favicon-small.svg`, not a downscaled large PNG. It preserves the tile, overall leaf and upper-right tip, while widening the lower pale vein by approximately 20/1000 tile units and shifting the dark-side base 9/1000 units left. This strengthens the curved separation at native pixel sizes. The upper vein still tapers naturally; it is not forced into a thick uniform line.

The 48-pixel ICO entry, scalable `favicon.svg`, 192/512 icons and Apple touch icon use the standard leaf geometry. If manually placing the SVG at a tiny fixed UI size, use the optical master when appropriate. The browser's SVG favicon remains the standard master; optical PNG/ICO entries are separately available.

The compact sample PNG contains 1 image pixel per favicon pixel. An app or image viewer may scale the sheet to fit its window. For exact CSS-size inspection, extract the package and open `preview/preview.html` at 100% browser zoom.

## Usage

- Prefer SVG for web UI, presentations and scalable placement. Preserve aspect ratio; do not stretch or rotate the complete mark.
- Use the colour or flat mark at about 48 px or larger, and the horizontal lockup at about 256 px wide or larger when the vein details should remain legible. Use the dedicated favicon for browser tabs and the smallest application placements.
- Add clear space outside the file equal to at least 15% of the mark's visible diameter, or about half the wordmark's visible letter height around a lockup. The small transparent file margins are export padding, not the full placement clear space.
- Use the light lockup on white or light neutral surfaces and the dark lockup on deep dark surfaces. Both files have transparent backgrounds.
- The monochrome SVG uses `currentColor` with a forest-green root default. Change the SVG root's `color` value to the required ink, or override it when inline. CSS on an external `<img>` does not recolour its SVG contents.
- Keep the leaf groups and their vein shapes together for future animation. No animation is included. When inserting more than one SVG inline into a page, prefix all IDs and their references per instance to avoid duplicate IDs; external image files do not share an ID namespace.
- For 192/512 app-manifest entries use `purpose: "any"`. These exports are **not maskable** and no maskable composition is claimed.
- Keep icon outer corners transparent except for the Apple touch icon, which must remain the supplied full-bleed square. Do not add white corner pixels or manually round the Apple file.

## Re-exporting

Requires Python 3 with Pillow and an Inkscape executable on PATH. From any working directory:

```sh
python /path/to/freshtrace-brand-package/source/export_assets.py
```

Every raster is rendered at its final requested size directly from the relevant vector master. The ICO writer stores the independent 16-, 32- and 48-pixel PNG payloads verbatim as three entries; it does not resample them. Re-run validation and refresh checksums after editing or re-exporting. Raster antialiasing may vary slightly between renderer versions.

## Validation completed

- Both supplied references and direct side-by-side rendered comparisons inspected.
- Primary, flat and monochrome marks inspected, plus lockups on light and dark surfaces.
- Native-size 16/32 favicon samples inspected on white and deep green; 48-pixel sample also checked.
- All nine SVG masters parsed: genuine paths, valid viewBoxes, unique IDs per file, no embedded rasters, live text, external references, filters, scripts or animation. Flat/monochrome files have no gradients; monochrome uses one ink.
- All eight delivery PNG dimensions checked. Both logo PNGs have transparent backgrounds and clear pixel borders; the mark raster contains three separate connected leaves.
- Apple touch icon is fully opaque and all four corner pixels are the intended forest green.
- ICO directory inspected and decoded: genuine 16/32/48 entries, 32 bits per pixel, with each payload identical to its independently exported PNG. Pillow also enumerated all three sizes.
- Reference-coordinate green-area overlap is 97.21% IoU, excluding the near-white background and veins. This is an approximate contour-comparison metric, not a claim of pixel-identical reproduction.

No application components, metadata, routing or styling were changed. The repository root `AGENTS.md` was read through GitHub. This package was created independently for later integration; no repository commit, push or deployment was performed.
