\% Plot Brew Visual AI Design + Gap Detection Workflow % Generated
automatically % 2026-02-21 19:52 UTC

# Overview

This workflow allows you to:

-   Render your Paged.js HTML workbook
-   Automatically screenshot every page
-   Detect awkward whitespace gaps (between elements and bottom-of-page
    whitespace)
-   Generate a machine-readable `gap-report.json`
-   Feed screenshots + structured gap data into AI
-   Receive design-aware content suggestions sized to fit available
    space
-   Iterate quickly without manual screenshotting

------------------------------------------------------------------------

# System Requirements

-   Node.js (v18+)
-   Local development server (NOT file://)
-   Paged.js rendering your workbook
-   Playwright

------------------------------------------------------------------------

# Installation

``` bash
npm install -D playwright
npx playwright install
```

------------------------------------------------------------------------

# Daily Workflow Loop

## 1. Start your preview server

Example: http://localhost:5173/workbook.html

## 2. Run the gap scanner

``` bash
node scripts/gap-scan.js "http://localhost:5173/workbook.html" out
```

Outputs:

    out/
      gap-report.json
      pages/
        page-001.png
        page-002.png

## 3. Provide to AI

Share: - gap-report.json - relevant page PNGs

Ask AI to propose: - filler component type - ready-to-paste text -
optional HTML snippet - styling guidance

------------------------------------------------------------------------

# scripts/gap-scan.js

``` javascript
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
    console.error('Usage: node scripts/gap-scan.js "http://localhost:5173/workbook.html" out');
    process.exit(1);
  }

  const outPages = path.join(outRoot, "pages");
  ensureDir(outPages);

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 },
  });

  await page.goto(url, { waitUntil: "networkidle" });

  await page.waitForFunction(() => document.querySelectorAll(".pagedjs_page").length > 0, {
    timeout: 60000,
  });

  await page.waitForTimeout(250);

  const result = await page.evaluate(() => {
    const GAP_MIN_PX = 60;
    const BOTTOM_GAP_MIN_PX = 120;
    const MAX_SNIPPET = 220;

    function clampText(t) {
      const s = (t || "").replace(/\s+/g, " ").trim();
      if (!s) return "";
      return s.length > MAX_SNIPPET ? s.slice(0, MAX_SNIPPET) + "…" : s;
    }

    function shortSelector(el) {
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : "";
      let cls = "";
      if (el.className && typeof el.className === "string") {
        const parts = el.className.trim().split(/\s+/).filter(Boolean);
        if (parts.length) cls = "." + parts.slice(0, 2).join(".");
      }
      return `${tag}${id}${cls}`;
    }

    function isVisible(el) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2;
    }

    function isBlocky(el) {
      const tag = el.tagName.toLowerCase();
      const cs = getComputedStyle(el);
      const disp = cs.display;
      if (["p","li","table","figure","blockquote","h1","h2","h3","h4"].includes(tag)) return true;
      if (disp.includes("block") || disp.includes("flex") || disp.includes("grid")) return true;
      return false;
    }

    function bestText(el) {
      const heading = el.querySelector?.("h1,h2,h3,h4");
      if (heading && heading.innerText) return clampText(heading.innerText);
      const p = el.querySelector?.("p");
      if (p && p.innerText) return clampText(p.innerText);
      return clampText(el.innerText);
    }

    const pages = Array.from(document.querySelectorAll(".pagedjs_page"));
    const gaps = [];
    const pageMeta = [];

    pages.forEach((pg, idx) => {
      const content = pg.querySelector(".pagedjs_page_content") || pg;
      const contentRect = content.getBoundingClientRect();

      const blocks = Array.from(content.querySelectorAll("*"))
        .filter(isVisible)
        .filter(isBlocky)
        .map(el => {
          const r = el.getBoundingClientRect();
          return {
            selector: shortSelector(el),
            top: r.top - contentRect.top,
            bottom: r.bottom - contentRect.top,
            width: r.width,
            height: r.height,
            text: bestText(el),
          };
        })
        .filter(b => b.height >= 10 && b.width >= 50)
        .sort((a,b) => a.top - b.top);

      for (let i=0; i<blocks.length-1; i++) {
        const a = blocks[i];
        const b = blocks[i+1];
        const gapH = b.top - a.bottom;

        if (gapH >= GAP_MIN_PX) {
          gaps.push({
            type: "between-blocks",
            page: idx+1,
            gap: {
              x: 0,
              y: Math.round(a.bottom),
              w: Math.round(contentRect.width),
              h: Math.round(gapH)
            },
            above: a,
            below: b
          });
        }
      }

      const lastBottom = blocks.length ? Math.max(...blocks.map(b => b.bottom)) : 0;
      const bottomGap = contentRect.height - lastBottom;

      if (bottomGap >= BOTTOM_GAP_MIN_PX) {
        const aboveBlock = blocks.length ? blocks[blocks.length-1] : null;
        gaps.push({
          type: "bottom-whitespace",
          page: idx+1,
          gap: {
            x: 0,
            y: Math.round(lastBottom),
            w: Math.round(contentRect.width),
            h: Math.round(bottomGap)
          },
          above: aboveBlock,
          below: { selector: "(page end)", text: "" }
        });
      }

      pageMeta.push({
        page: idx+1,
        blocksCount: blocks.length
      });
    });

    return { gaps, pageMeta, pageCount: pages.length };
  });

  const pageCount = result.pageCount;
  const gapReport = {
    url,
    generatedAt: new Date().toISOString(),
    pageCount,
    pageMeta: result.pageMeta,
    gaps: result.gaps.map(g => ({
      ...g,
      screenshot: `pages/page-${String(g.page).padStart(3,"0")}.png`
    }))
  };

  ensureDir(outRoot);
  fs.writeFileSync(path.join(outRoot, "gap-report.json"), JSON.stringify(gapReport, null, 2));

  for (let i=0; i<pageCount; i++) {
    const pg = page.locator(".pagedjs_page").nth(i);
    const file = path.join(outPages, `page-${String(i+1).padStart(3,"0")}.png`);
    await pg.screenshot({ path: file });
  }

  console.log("Gap scan complete.");
  await browser.close();
})();
```

------------------------------------------------------------------------

# Final Result

You now have a structured, measurable, AI-compatible visual QA system
for your Plot Brew workbooks.
