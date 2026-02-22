const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const sharp = require('sharp');
const {
  ensureDir,
  padPageNumber,
  parseCliArgs,
  resolveOutRoot,
  resolveUrl
} = require('./lib/pipeline-utils');

/* ── Contact-sheet layout constants ─────────────────────────────── */
const COLUMNS = 3;
const ROWS = 4;
const SHEET_SIZE = COLUMNS * ROWS;
const THUMBNAIL_WIDTH = 340;
const THUMBNAIL_HEIGHT = 440;
const PADDING = 20;

/* ── Helpers ────────────────────────────────────────────────────── */

async function waitForPages(page) {
  // Install a completion flag that paged.js sets when it finishes rendering
  await page.evaluate(() => {
    window.__pagedDone = false;
    // paged.js polyfill fires this event when all pages are laid out
    window.addEventListener('pagedjs', () => { window.__pagedDone = true; });
    // Also catch if paged.js already finished before we attached
    if (document.querySelector('.pagedjs_pages')) {
      const flow = document.querySelector('.pagedjs_pages');
      if (flow && flow.childElementCount > 0) {
        // Check if paged.js is no longer running by looking for pending content
        const remaining = document.querySelector('.pagedjs_page_content:empty');
        // Set a secondary check via mutation observer
      }
    }
  });

  // Wait up to 5 minutes for paged.js to signal completion
  console.log('  Waiting for paged.js to finish rendering…');
  try {
    await page.waitForFunction(() => window.__pagedDone === true, { timeout: 300000 });
    console.log('  paged.js signalled completion.');
  } catch {
    // Fallback: if the event never fires, poll until page count is stable
    console.log('  pagedjs event not detected, falling back to stability polling…');
  }

  // Always do a stability check as a safety net — wait for page count to be
  // unchanged for 3 consecutive checks 2s apart
  let previousCount = 0;
  let stableRounds = 0;
  const STABLE_NEEDED = 3;

  while (stableRounds < STABLE_NEEDED) {
    await page.waitForTimeout(2000);
    const currentCount = await page.evaluate(
      () => document.querySelectorAll('.pagedjs_page').length
    );
    if (currentCount === previousCount && currentCount > 0) {
      stableRounds += 1;
    } else {
      stableRounds = 0;
    }
    previousCount = currentCount;
    console.log(`  paged.js: ${currentCount} pages (stable ${stableRounds}/${STABLE_NEEDED})`);
  }
}

async function createSheet(imagePaths, sheetIndex, outDir) {
  const width = PADDING + COLUMNS * (THUMBNAIL_WIDTH + PADDING);
  const height = PADDING + ROWS * (THUMBNAIL_HEIGHT + PADDING);

  const composites = await Promise.all(
    imagePaths.map(async (imagePath, idx) => {
      const col = idx % COLUMNS;
      const row = Math.floor(idx / COLUMNS);
      const left = PADDING + col * (THUMBNAIL_WIDTH + PADDING);
      const top = PADDING + row * (THUMBNAIL_HEIGHT + PADDING);
      const thumb = await sharp(imagePath)
        .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, { fit: 'contain', background: '#ffffff' })
        .png()
        .toBuffer();
      return { input: thumb, left, top };
    })
  );

  const sheetName = `contact-sheet-${padPageNumber(sheetIndex).slice(-2)}.png`;
  const sheetPath = path.join(outDir, sheetName);
  await sharp({
    create: { width, height, channels: 3, background: '#f3f0eb' }
  })
    .composite(composites)
    .png()
    .toFile(sheetPath);

  return sheetPath;
}

/* ── Page-model extraction (runs inside the browser) ────────────── */

function extractPageModels() {
  const MAX_TEXT_SNIPPET = 200;
  const selector = '[data-comp], [data-pb-id]';

  const makeSnippet = (value) => {
    const normalized = (value || '').replace(/\s+/g, ' ').trim();
    if (normalized.length <= MAX_TEXT_SNIPPET) return normalized;
    return `${normalized.slice(0, MAX_TEXT_SNIPPET - 1)}…`;
  };

  const toClassSummary = (element) => {
    const raw = element.className;
    if (!raw || typeof raw !== 'string') return '';
    return raw.split(/\s+/).filter(Boolean).slice(0, 8).join(' ');
  };

  const pages = Array.from(document.querySelectorAll('.pagedjs_page'));

  return pages.map((pagedPage, index) => {
    const pageArea = pagedPage.querySelector('.pagedjs_page_content') || pagedPage;
    const pageRect = pageArea.getBoundingClientRect();
    const candidates = Array.from(pageArea.querySelectorAll(selector));

    const components = candidates
      .map((element) => {
        const bbox = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);

        if (bbox.width < 1 || bbox.height < 1) return null;

        return {
          pbId: element.getAttribute('data-pb-id') || '',
          tag: element.tagName.toLowerCase(),
          classSummary: toClassSummary(element),
          textSnippet: makeSnippet(element.innerText || element.textContent || ''),
          bbox: {
            x: Number((bbox.left - pageRect.left).toFixed(2)),
            y: Number((bbox.top - pageRect.top).toFixed(2)),
            width: Number(bbox.width.toFixed(2)),
            height: Number(bbox.height.toFixed(2))
          },
          computed: {
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
            marginTop: style.marginTop,
            marginBottom: style.marginBottom,
            paddingTop: style.paddingTop,
            paddingBottom: style.paddingBottom,
            display: style.display,
            position: style.position,
            breakBefore: style.breakBefore,
            breakAfter: style.breakAfter,
            breakInside: style.breakInside,
            overflow: style.overflow
          }
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x);

    let largestWhitespace = { y: 0, height: 0 };
    for (let i = 0; i < components.length - 1; i += 1) {
      const currentBottom = components[i].bbox.y + components[i].bbox.height;
      const nextTop = components[i + 1].bbox.y;
      const gap = nextTop - currentBottom;
      if (gap > largestWhitespace.height) {
        largestWhitespace = { y: Number(currentBottom.toFixed(2)), height: Number(gap.toFixed(2)) };
      }
    }
    if (components.length) {
      const last = components[components.length - 1];
      const tailGap = pageRect.height - (last.bbox.y + last.bbox.height);
      if (tailGap > largestWhitespace.height) {
        largestWhitespace = {
          y: Number((last.bbox.y + last.bbox.height).toFixed(2)),
          height: Number(tailGap.toFixed(2))
        };
      }
    } else {
      largestWhitespace = { y: 0, height: Number(pageRect.height.toFixed(2)) };
    }

    return {
      page: index + 1,
      pageSize: {
        width: Number(pageRect.width.toFixed(2)),
        height: Number(pageRect.height.toFixed(2))
      },
      totalComponents: components.length,
      largestVerticalWhitespaceBlock: largestWhitespace,
      components
    };
  });
}

/* ── Main pipeline ──────────────────────────────────────────────── */

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const url = resolveUrl(args.url || args._[0]);
  const outRoot = resolveOutRoot(args.out || args._[1]);

  const outPages = path.join(outRoot, 'pages');
  const outThumbs = path.join(outRoot, 'thumbnails');
  const outModel = path.join(outRoot, 'page-model');
  const outSheets = path.join(outRoot, 'contact-sheets');
  ensureDir(outPages);
  ensureDir(outThumbs);
  ensureDir(outModel);
  ensureDir(outSheets);

  /* ── Launch browser & navigate ── */
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  await waitForPages(page);

  const pageCount = await page.locator('.pagedjs_page').count();
  console.log(`Found ${pageCount} pages`);

  /* ── Extract QA page models (all pages, single evaluate call) ── */
  const pageModels = await page.evaluate(extractPageModels);

  /* ── Per-page: screenshot → thumbnail → page-model JSON ── */
  const screenshotPaths = [];

  for (let i = 0; i < pageCount; i += 1) {
    const num = padPageNumber(i + 1);

    // 1. Full-size screenshot
    const screenshotPath = path.join(outPages, `page-${num}.png`);
    await page.locator('.pagedjs_page').nth(i).screenshot({ path: screenshotPath });
    screenshotPaths.push(screenshotPath);

    // 2. Individual thumbnail
    const thumbPath = path.join(outThumbs, `page-${num}-thumb.png`);
    await sharp(screenshotPath)
      .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, { fit: 'contain', background: '#ffffff' })
      .png()
      .toFile(thumbPath);

    // 3. QA page-model JSON
    if (pageModels[i]) {
      const modelPath = path.join(outModel, `page-${num}.json`);
      fs.writeFileSync(modelPath, JSON.stringify(pageModels[i], null, 2));
    }

    console.log(`  page ${i + 1}/${pageCount}: screenshot + thumbnail + model`);
  }

  await browser.close();

  /* ── Contact sheets from full screenshots ── */
  const sheetResults = [];
  for (let i = 0; i < screenshotPaths.length; i += SHEET_SIZE) {
    const slice = screenshotPaths.slice(i, i + SHEET_SIZE);
    const sheetPath = await createSheet(slice, Math.floor(i / SHEET_SIZE) + 1, outSheets);
    sheetResults.push(sheetPath);
  }

  console.log(`\nDone — ${pageCount} pages exported to ${outRoot}/`);
  console.log(`  pages/         ${screenshotPaths.length} full screenshots`);
  console.log(`  thumbnails/    ${screenshotPaths.length} individual thumbnails`);
  console.log(`  page-model/    ${pageModels.length} QA JSON files`);
  console.log(`  contact-sheets/ ${sheetResults.length} contact sheet(s)`);
}

main().catch((error) => {
  console.error('export-all-pages failed:', error);
  process.exit(1);
});
