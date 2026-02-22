# Plot Brew AI Visual Workflow

This workflow prepares workbook render artifacts for manual AI-guided layout iteration.

## What `ai-prep` creates

Run:

```bash
npm run ai-prep -- --url http://127.0.0.1:4173/romantasy-analysis-guide-FIXED.html
```

Output folders:

- `out/pages/page-###.png` (full page screenshots)
- `out/contact-sheets/contact-sheet-01.png` (thumbnail overview grids)
- `out/page-model/page-###.json` (per-page layout measurement exports)

You can override output root:

```bash
npm run ai-prep -- --url http://127.0.0.1:4173/romantasy-analysis-guide-FIXED.html --out out
```

## What to provide to ChatGPT

For best layout guidance, provide:

1. The relevant `out/pages/page-###.png` files.
2. The matching `out/page-model/page-###.json` files.
3. The latest `out/contact-sheets/contact-sheet-01.png` (and additional sheets if present).
4. A short prompt describing your layout intent (e.g., reduce dead space, tighten callout rhythm, preserve chapter log readability).

## How to interpret `page-model` JSON

Each page JSON contains:

- `page`: page number.
- `pageSize`: rendered page content width/height in pixels.
- `totalComponents`: count of exported layout-significant elements.
- `largestVerticalWhitespaceBlock`: largest vertical gap with:
  - `y`: top coordinate of the whitespace block.
  - `height`: size of the gap.
- `components`: exported components only (`data-comp` or `data-pb-id`) with:
  - `pbId`: stable component ID for manual targeting.
  - `tag`, `classSummary`, `textSnippet`.
  - `bbox`: `x`, `y`, `width`, `height` relative to page content box.
  - `computed`: subset of style properties useful for layout diagnosis.

## Manual apply workflow (no auto patching)

1. Run `ai-prep` to refresh screenshots + measurements.
2. Ask AI for recommendations referencing `pbId` values and page coordinates.
3. Manually edit your HTML/CSS based on those recommendations.
4. Re-run `ai-prep` and compare before/after screenshots and JSON.
5. Keep only manual edits you approve.

This pipeline is intentionally export-only: it does not apply automatic source patches.
