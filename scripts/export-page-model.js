const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const {
  ensureDir,
  padPageNumber,
  parseCliArgs,
  resolveOutRoot,
  resolveUrl
} = require('./lib/pipeline-utils');

async function waitForPages(page) {
  await page.waitForFunction(
    () => document.querySelectorAll('.pagedjs_page').length > 0,
    { timeout: 60000 }
  );
  await page.waitForTimeout(400);
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const url = resolveUrl(args.url || args._[0]);
  const outRoot = resolveOutRoot(args.out || args._[1]);
  const outDir = path.join(outRoot, 'page-model');
  ensureDir(outDir);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

  await page.goto(url, { waitUntil: 'networkidle' });
  await waitForPages(page);

  const pageModels = await page.evaluate(() => {
    const MAX_TEXT_SNIPPET = 200;
    const selector = '[data-comp], [data-pb-id]';

    const makeSnippet = (value) => {
      const normalized = (value || '').replace(/\s+/g, ' ').trim();
      if (normalized.length <= MAX_TEXT_SNIPPET) {
        return normalized;
      }
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

          if (bbox.width < 1 || bbox.height < 1) {
            return null;
          }

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
  });

  pageModels.forEach((model) => {
    const filePath = path.join(outDir, `page-${padPageNumber(model.page)}.json`);
    fs.writeFileSync(filePath, JSON.stringify(model, null, 2));
  });

  await browser.close();
  console.log(`Exported ${pageModels.length} page model file(s) to ${outDir}`);
}

main().catch((error) => {
  console.error('export-page-model failed:', error);
  process.exit(1);
});
