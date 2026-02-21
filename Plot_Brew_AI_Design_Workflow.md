# Plot Brew Visual QA + Gap Detection Workflow

This document explains how to run automated workbook design QA using the scripts in this repo.

## What this workflow gives you

- Per-page screenshots for your Paged.js workbook (`out/pages/page-###.png`)
- Structured gap analysis with page/context metadata (`out/gap-report.json`)
- Optional visual diffs between two page screenshot sets (`out/diff/diff-report.json` + diff images)
- A consistent handoff format for ChatGPT or other AI design review workflows

---

## Prerequisites

- Node.js 18+
- A local dev server serving your workbook HTML (for example Vite on `http://localhost:5173`)
- Paged.js rendering `.pagedjs_page` containers
- Installed dependencies:

```bash
npm install
npx playwright install
```

---

## Repository scripts

- `npm run gapscan -- <url> [out-dir]`
  - Runs `scripts/gap-scan.js`
  - Captures page PNGs and produces `gap-report.json`
- `npm run diffscan -- <baseline-pages-dir> <candidate-pages-dir> [out-dir]`
  - Runs `scripts/diff-pages.js`
  - Generates per-page visual diff images and `diff-report.json`

---

## End-to-end workflow

### 1) Start your workbook preview server

Example:

```bash
npm run dev
# or any other server command
```

Assume your workbook is available at:

```text
http://localhost:5173/workbook.html
```

### 2) Run gap scan

```bash
npm run gapscan -- "http://localhost:5173/workbook.html" out
```

Outputs:

```text
out/
  gap-report.json
  pages/
    page-001.png
    page-002.png
    ...
```

### 3) (Optional) Compare before/after renders

Run the scanner twice to separate folders (`out-baseline`, `out-candidate`), then:

```bash
npm run diffscan -- out-baseline/pages out-candidate/pages out/diff
```

Outputs:

```text
out/diff/
  diff-report.json
  page-001.png
  page-002.png
  ...
```

### 4) Feed the results to ChatGPT for design fixes

Provide:

- `out/gap-report.json`
- Selected page PNGs from `out/pages`
- (Optional) `out/diff/diff-report.json` and diff images when reviewing changes

Suggested prompt structure:

1. Explain workbook tone + audience.
2. Ask for **filler component candidates** sized to specific gaps.
3. Ask for concrete HTML/CSS patch suggestions.
4. Require preservation of reading order and visual hierarchy.

---

## Gap report format (AI-friendly schema)

`gap-report.json` now uses a stable structure:

```json
{
  "schemaVersion": "2.0.0",
  "source": {
    "url": "http://localhost:5173/workbook.html",
    "generatedAt": "2026-02-21T20:15:00.000Z",
    "tool": "scripts/gap-scan.js"
  },
  "summary": {
    "pageCount": 12,
    "gapCount": 24,
    "byType": {
      "column-text-flow-gap": 8,
      "column-bottom-gap": 10,
      "page-bottom-whitespace": 6
    }
  },
  "pages": [
    {
      "page": 3,
      "image": "pages/page-003.png",
      "dimensions": { "width": 980, "height": 1320 },
      "blockCount": 41,
      "columns": [{ "id": 1, "left": 0, "right": 470, "blockCount": 20 }],
      "gaps": [
        {
          "id": "3-column-text-flow-gap-544-1",
          "type": "column-text-flow-gap",
          "subtype": "text-flow",
          "severity": "medium",
          "geometry": { "x": 0, "y": 544, "width": 470, "height": 138 },
          "context": {
            "column": 1,
            "above": {
              "selector": "p.lesson-copy",
              "role": "text",
              "text": "Readers emotionally map to visible, specific stakes...",
              "top": 470,
              "bottom": 544
            },
            "below": {
              "selector": "p.lesson-copy",
              "role": "text",
              "text": "When momentum softens, insert concrete scene consequence...",
              "top": 682,
              "bottom": 752
            }
          },
          "notes": "Unusually large vertical jump within a text flow sequence."
        }
      ]
    }
  ],
  "gaps": []
}
```

### Gap types currently detected

- `column-text-flow-gap`: oversized whitespace between text flow blocks in a column
- `between-blocks`: oversized whitespace between non-text neighboring blocks
- `column-top-gap`: large leading blank space before first block in a column
- `column-bottom-gap`: blank tail at bottom of a column
- `page-bottom-whitespace`: residual bottom whitespace at page level

---

## Best practices for applying AI-generated HTML/CSS updates

- Keep changes local: patch one page pattern at a time, then re-run scans.
- Prefer reusable components (`.tip-card`, `.pull-quote`, `.exercise-box`) over one-off hacks.
- Preserve semantic flow (heading → explanation → example → activity).
- Avoid fixed heights unless tied to print/page constraints.
- Track every iteration using before/after `out-*` folders + `diffscan`.
- Validate that added filler supports pedagogy (not decorative-only filler).

### Recommended review checklist

- Does each inserted component resolve a real detected gap?
- Is line length still readable and typographic rhythm intact?
- Do headings remain visually dominant?
- Are widows/orphans and column breaks improved?
- Did total `summary.gapCount` trend down after updates?

---

## Notes on scanner robustness

The scanner is designed to be resilient by:

- Waiting for paged output before analyzing (`.pagedjs_page` guard)
- Filtering out hidden/tiny elements
- Clustering text-aligned blocks into columns to catch text flow gaps
- Including consistent `context.above` / `context.below` snippets for AI prompts
- Producing both per-page gaps and a flattened top-level `gaps` array for easy ingestion

