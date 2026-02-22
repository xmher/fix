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

async function renderPages(url, outRoot) {
  const outPages = path.join(outRoot, 'pages');
  ensureDir(outPages);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

  await page.goto(url, { waitUntil: 'networkidle' });
  await waitForPages(page);

  const pageCount = await page.locator('.pagedjs_page').count();
  for (let i = 0; i < pageCount; i += 1) {
    const filePath = path.join(outPages, `page-${padPageNumber(i + 1)}.png`);
    await page.locator('.pagedjs_page').nth(i).screenshot({ path: filePath });
  }

  await browser.close();
  return pageCount;
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const url = resolveUrl(args.url || args._[0]);
  const outRoot = resolveOutRoot(args.out || args._[1]);

  const pageCount = await renderPages(url, outRoot);
  console.log(`Rendered ${pageCount} pages to ${path.join(outRoot, 'pages')}`);
}

main().catch((error) => {
  console.error('render-pages failed:', error);
  process.exit(1);
});
