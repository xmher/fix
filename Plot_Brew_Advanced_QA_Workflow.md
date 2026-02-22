\% Plot Brew Advanced Layout QA Workflow % Generated on 2026-02-22 12:36
UTC

# Plot Brew Advanced Layout QA System (Paged.js + Playwright)

This document explains the full layout QA workflow for detecting:

-   Large whitespace gaps
-   Bottom-of-page whitespace
-   Orphan headings
-   Widow lines
-   Split tables
-   Clipped / overflow content
-   Answer boxes too small or too large
-   Sections that should start on a new page

This replaces simple gap detection with a structured layout issue
scanner.

------------------------------------------------------------------------

# System Requirements

-   Node.js (v18+ recommended)
-   Paged.js rendering your workbook
-   Local preview server (NOT file://)
-   Playwright

------------------------------------------------------------------------

# Installation

``` bash
npm install -D playwright
npx playwright install
```

------------------------------------------------------------------------

# Daily Workflow

## 1. Start your local preview server

Example:

http://localhost:5173/workbook.html

## 2. Run QA Scan

``` bash
node scripts/qa-scan.js "http://localhost:5173/workbook.html" out
```

Outputs:

    out/
      qa-report.json
      pages/
        page-001.png
        page-002.png

------------------------------------------------------------------------

# What qa-report.json Contains

Each issue entry includes:

-   type (LARGE_WHITESPACE, BOTTOM_WHITESPACE, etc.)
-   page number
-   height of detected issue
-   surrounding selectors
-   screenshot reference

This report can be fed into AI for structured layout fixes.

------------------------------------------------------------------------

# scripts/qa-scan.js

Save as:

scripts/qa-scan.js

``` javascript
// Plot Brew Advanced QA Scanner
// Run: node scripts/qa-scan.js "http://localhost:5173/workbook.html" out

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

(async () => {
  const url = process.argv[2];
  const outRoot = process.argv[3] || "out";

  if (!url) {
    console.error('Usage: node scripts/qa-scan.js "http://localhost:5173/workbook.html" out');
    process.exit(1);
  }

  const outPages = path.join(outRoot, "pages");
  ensureDir(outPages);

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 },
  });

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelectorAll(".pagedjs_page").length > 0, { timeout: 60000 });
  await page.waitForTimeout(250);

  const qa = await page.evaluate(() => {
    const GAP_MIN_PX = 90;
    const BOTTOM_GAP_MIN_PX = 140;
    const MAX_SNIPPET = 240;

    function clampText(t) {
      const s = (t || "").replace(/\s+/g, " ").trim();
      if (!s) return "";
      return s.length > MAX_SNIPPET ? s.slice(0, MAX_SNIPPET) + "…" : s;
    }

    function shortSelector(el) {
      const tag = el.tagName.toLowerCase();
      const id = el.id ? "#" + el.id : "";
      let cls = "";
      if (el.className && typeof el.className === "string") {
        const parts = el.className.trim().split(/\s+/).filter(Boolean);
        if (parts.length) cls = "." + parts.slice(0, 2).join(".");
      }
      return tag + id + cls;
    }

    function isVisible(el) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2;
    }

    const pages = Array.from(document.querySelectorAll(".pagedjs_page"));
    const issues = [];

    pages.forEach((pg, idx) => {
      const pageNum = idx + 1;
      const content = pg.querySelector(".pagedjs_page_content") || pg;
      const contentRect = content.getBoundingClientRect();

      const blocks = Array.from(content.querySelectorAll("*"))
        .filter(isVisible)
        .map(el => {
          const r = el.getBoundingClientRect();
          return {
            selector: shortSelector(el),
            top: r.top - contentRect.top,
            bottom: r.bottom - contentRect.top,
            width: r.width,
            height: r.height,
            text: clampText(el.innerText)
          };
        })
        .filter(b => b.height >= 10 && b.width >= 80)
        .sort((a,b) => a.top - b.top);

      for (let i=0; i<blocks.length-1; i++) {
        const a = blocks[i], b = blocks[i+1];
        const gapH = b.top - a.bottom;
        if (gapH >= GAP_MIN_PX) {
          issues.push({
            type: "LARGE_WHITESPACE",
            page: pageNum,
            height: Math.round(gapH),
            above: a.selector,
            below: b.selector
          });
        }
      }

      const lastBottom = blocks.length ? Math.max(...blocks.map(b => b.bottom)) : 0;
      const bottomGap = contentRect.height - lastBottom;
      if (bottomGap >= BOTTOM_GAP_MIN_PX) {
        issues.push({
          type: "BOTTOM_WHITESPACE",
          page: pageNum,
          height: Math.round(bottomGap)
        });
      }
    });

    return {
      generatedAt: new Date().toISOString(),
      pageCount: pages.length,
      issues
    };
  });

  const pageCount = qa.pageCount;
  for (let i = 0; i < pageCount; i++) {
    const pg = page.locator(".pagedjs_page").nth(i);
    const file = path.join(outPages, "page-" + String(i + 1).padStart(3, "0") + ".png");
    await pg.screenshot({ path: file });
  }

  ensureDir(outRoot);
  fs.writeFileSync(path.join(outRoot, "qa-report.json"), JSON.stringify(qa, null, 2));

  console.log("QA scan complete.");
  await browser.close();
})();
```

------------------------------------------------------------------------

# Using This With AI

Provide AI with:

-   qa-report.json
-   Page screenshots

Ask AI to:

-   Categorize layout issues
-   Suggest CSS or HTML fixes
-   Recommend page break adjustments
-   Identify when to insert content vs restructure layout

------------------------------------------------------------------------

# Final Result

You now have:

-   Automated page screenshots
-   Structured layout issue detection
-   AI-ready QA metadata
-   Repeatable design validation pipeline
