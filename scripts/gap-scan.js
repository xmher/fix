#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
const { buildReport } = require('./gap-report');

const THUMB_WIDTH = 180;
const GRID_COLS = 8;
const GRID_PAD = 12;
const LABEL_HEIGHT = 18;

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function buildContactSheet(pagesDir, outPath, pageCount) {
  const thumbs = [];
  for (let i = 1; i <= pageCount; i += 1) {
    const file = path.join(pagesDir, `page-${String(i).padStart(3, '0')}.png`);
    const src = PNG.sync.read(fs.readFileSync(file));
    const scale = THUMB_WIDTH / src.width;
    const thumbHeight = Math.round(src.height * scale);
    const dst = new PNG({ width: THUMB_WIDTH, height: thumbHeight });

    for (let y = 0; y < thumbHeight; y += 1) {
      const srcY = Math.min(Math.floor(y / scale), src.height - 1);
      for (let x = 0; x < THUMB_WIDTH; x += 1) {
        const srcX = Math.min(Math.floor(x / scale), src.width - 1);
        const si = (srcY * src.width + srcX) << 2;
        const di = (y * THUMB_WIDTH + x) << 2;
        dst.data[di] = src.data[si];
        dst.data[di + 1] = src.data[si + 1];
        dst.data[di + 2] = src.data[si + 2];
        dst.data[di + 3] = src.data[si + 3];
      }
    }
    thumbs.push(dst);
  }

  const thumbHeight = thumbs[0].height;
  const cellH = thumbHeight + GRID_PAD + LABEL_HEIGHT;
  const cellW = THUMB_WIDTH + GRID_PAD;
  const cols = Math.min(GRID_COLS, pageCount);
  const rows = Math.ceil(pageCount / cols);
  const sheetW = cols * cellW + GRID_PAD;
  const sheetH = rows * cellH + GRID_PAD;

  const sheet = new PNG({ width: sheetW, height: sheetH });
  // Fill with white background
  for (let i = 0; i < sheet.data.length; i += 4) {
    sheet.data[i] = 255;
    sheet.data[i + 1] = 255;
    sheet.data[i + 2] = 255;
    sheet.data[i + 3] = 255;
  }

  for (let idx = 0; idx < thumbs.length; idx += 1) {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const offsetX = GRID_PAD + col * cellW;
    const offsetY = GRID_PAD + LABEL_HEIGHT + row * cellH;
    const thumb = thumbs[idx];

    for (let y = 0; y < thumb.height; y += 1) {
      for (let x = 0; x < thumb.width; x += 1) {
        const si = (y * thumb.width + x) << 2;
        const dx = offsetX + x;
        const dy = offsetY + y;
        const di = (dy * sheetW + dx) << 2;
        sheet.data[di] = thumb.data[si];
        sheet.data[di + 1] = thumb.data[si + 1];
        sheet.data[di + 2] = thumb.data[si + 2];
        sheet.data[di + 3] = thumb.data[si + 3];
      }
    }
  }

  fs.writeFileSync(outPath, PNG.sync.write(sheet));
}

async function main() {
  const url = process.argv[2];
  const outRoot = process.argv[3] || 'out';

  if (!url) {
    console.error('Usage: node scripts/gap-scan.js "http://localhost:5173/workbook.html" out');
    process.exit(1);
  }

  const outPages = path.join(outRoot, 'pages');
  ensureDir(outPages);

  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1024 } });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForFunction(() => document.querySelectorAll('.pagedjs_page').length > 0, { timeout: 90000 });
    await page.waitForTimeout(500);

    const pageResult = await page.evaluate(() => {
      const GAP_MIN_PX = 48;
      const BOTTOM_GAP_MIN_PX = 96;
      const TOP_GAP_MIN_PX = 80;
      const COLUMN_ALIGNMENT_SLOP = 26;

      function shortSelector(el) {
        const tag = (el.tagName || 'div').toLowerCase();
        const id = el.id ? `#${el.id}` : '';
        const classes = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean) : [];
        const classSuffix = classes.length ? `.${classes.slice(0, 2).join('.')}` : '';
        return `${tag}${id}${classSuffix}`;
      }

      function isVisible(el) {
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 4 && rect.height > 4;
      }

      function getText(el) {
        const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text) return '';
        return text.length > 220 ? `${text.slice(0, 220)}…` : text;
      }

      function classifyRole(el) {
        const tag = (el.tagName || '').toLowerCase();
        if (/^h[1-6]$/.test(tag)) return 'heading';
        if (tag === 'p' || tag === 'li' || tag === 'blockquote') return 'text';
        if (tag === 'img' || tag === 'figure' || tag === 'svg') return 'media';
        return 'content';
      }

      function collectBlocks(content, contentRect) {
        const candidates = Array.from(content.querySelectorAll('*')).filter(isVisible);

        return candidates
          .map((el) => {
            const rect = el.getBoundingClientRect();
            const text = getText(el);
            const isSemantic = ['p', 'li', 'table', 'figure', 'blockquote', 'section', 'article'].includes(el.tagName.toLowerCase());
            const style = getComputedStyle(el);
            const blocky = style.display.includes('block') || style.display.includes('grid') || style.display.includes('flex');
            if (!isSemantic && !blocky && !text) return null;
            if (rect.height < 12 || rect.width < 40) return null;

            return {
              selector: shortSelector(el),
              role: classifyRole(el),
              text,
              left: rect.left - contentRect.left,
              right: rect.right - contentRect.left,
              top: rect.top - contentRect.top,
              bottom: rect.bottom - contentRect.top,
              width: rect.width,
              height: rect.height,
            };
          })
          .filter(Boolean)
          .sort((a, b) => (a.top - b.top) || (a.left - b.left));
      }

      function clusterColumns(blocks, contentWidth) {
        const textish = blocks.filter((b) => b.role === 'text' || b.role === 'heading');
        if (textish.length < 3) {
          return [{ id: 1, left: 0, right: contentWidth, blocks }];
        }

        const sorted = [...textish].sort((a, b) => a.left - b.left);
        const clusters = [];
        for (const block of sorted) {
          const existing = clusters.find((cluster) => Math.abs(cluster.left - block.left) <= COLUMN_ALIGNMENT_SLOP);
          if (existing) {
            existing.blocks.push(block);
            existing.left = Math.min(existing.left, block.left);
            existing.right = Math.max(existing.right, block.right);
          } else {
            clusters.push({ left: block.left, right: block.right, blocks: [block] });
          }
        }

        if (clusters.length <= 1) {
          return [{ id: 1, left: 0, right: contentWidth, blocks }];
        }

        return clusters
          .sort((a, b) => a.left - b.left)
          .map((cluster, idx) => {
            const columnBlocks = blocks.filter(
              (block) => block.left < cluster.right + COLUMN_ALIGNMENT_SLOP && block.right > cluster.left - COLUMN_ALIGNMENT_SLOP,
            );

            return {
              id: idx + 1,
              left: Math.max(0, cluster.left),
              right: Math.min(contentWidth, cluster.right),
              blocks: columnBlocks,
            };
          });
      }

      function makeGap(type, pageNumber, gap, above, below, column = null, notes = null, subtype = null) {
        return {
          id: `${pageNumber}-${type}-${Math.round(gap.y)}-${column || 0}`,
          type,
          subtype,
          gap,
          column,
          above: above || null,
          below: below || null,
          notes,
        };
      }

      const pages = Array.from(document.querySelectorAll('.pagedjs_page'));

      return {
        pages: pages.map((pageEl, idx) => {
          const pageNumber = idx + 1;
          const content = pageEl.querySelector('.pagedjs_page_content') || pageEl;
          const contentRect = content.getBoundingClientRect();
          const blocks = collectBlocks(content, contentRect);
          const columns = clusterColumns(blocks, contentRect.width);
          const gaps = [];

          for (const column of columns) {
            const colBlocks = [...column.blocks].sort((a, b) => a.top - b.top);
            if (!colBlocks.length) continue;

            const first = colBlocks[0];
            if (first.top >= TOP_GAP_MIN_PX) {
              gaps.push(makeGap(
                'column-top-gap',
                pageNumber,
                { x: column.left, y: 0, w: column.right - column.left, h: first.top },
                null,
                first,
                column.id,
                'Large leading whitespace before the first text block in this column.',
              ));
            }

            for (let i = 0; i < colBlocks.length - 1; i += 1) {
              const above = colBlocks[i];
              const below = colBlocks[i + 1];
              const gapHeight = below.top - above.bottom;

              if (gapHeight >= GAP_MIN_PX) {
                const textFlow = above.role === 'text' && below.role === 'text';
                gaps.push(makeGap(
                  textFlow ? 'column-text-flow-gap' : 'between-blocks',
                  pageNumber,
                  { x: column.left, y: above.bottom, w: column.right - column.left, h: gapHeight },
                  above,
                  below,
                  column.id,
                  textFlow
                    ? 'Unusually large vertical jump within a text flow sequence.'
                    : 'Large whitespace between neighboring blocks.',
                  textFlow ? 'text-flow' : 'block-spacing',
                ));
              }
            }

            const last = colBlocks[colBlocks.length - 1];
            const columnBottomGap = contentRect.height - last.bottom;
            if (columnBottomGap >= BOTTOM_GAP_MIN_PX) {
              gaps.push(makeGap(
                'column-bottom-gap',
                pageNumber,
                { x: column.left, y: last.bottom, w: column.right - column.left, h: columnBottomGap },
                last,
                null,
                column.id,
                'Column does not fill the page height; candidate area for filler component.',
              ));
            }
          }

          const maxBottom = blocks.length ? Math.max(...blocks.map((b) => b.bottom)) : 0;
          const pageBottomGap = contentRect.height - maxBottom;
          if (pageBottomGap >= BOTTOM_GAP_MIN_PX) {
            gaps.push(makeGap(
              'page-bottom-whitespace',
              pageNumber,
              { x: 0, y: maxBottom, w: contentRect.width, h: pageBottomGap },
              blocks.find((b) => b.bottom === maxBottom) || null,
              null,
              null,
              'Remaining whitespace at the end of page content area.',
            ));
          }

          return {
            page: pageNumber,
            dimensions: {
              width: Math.round(contentRect.width),
              height: Math.round(contentRect.height),
            },
            blockCount: blocks.length,
            columns: columns.map((column) => ({
              id: column.id,
              left: Math.round(column.left),
              right: Math.round(column.right),
              blockCount: column.blocks.length,
            })),
            gaps,
          };
        }),
      };
    });

    const report = buildReport(url, pageResult);
    ensureDir(outRoot);
    fs.writeFileSync(path.join(outRoot, 'gap-report.json'), `${JSON.stringify(report, null, 2)}\n`);

    for (let i = 0; i < report.summary.pageCount; i += 1) {
      const locator = page.locator('.pagedjs_page').nth(i);
      const filePath = path.join(outPages, `page-${String(i + 1).padStart(3, '0')}.png`);
      await locator.screenshot({ path: filePath });
    }

    const sheetPath = path.join(outRoot, 'contact-sheet.png');
    buildContactSheet(outPages, sheetPath, report.summary.pageCount);

    console.log(`Gap scan complete. ${report.summary.gapCount} gaps found across ${report.summary.pageCount} pages.`);
    console.log(`Contact sheet saved to ${sheetPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
