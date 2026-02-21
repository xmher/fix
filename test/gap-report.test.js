const test = require('node:test');
const assert = require('node:assert/strict');
const { clampText, normalizeGap, buildReport } = require('../scripts/gap-report');

test('clampText normalizes whitespace and truncates', () => {
  const text = clampText('one\n\n two   three');
  assert.equal(text, 'one two three');

  const long = clampText('x'.repeat(250), 20);
  assert.equal(long.length, 21);
  assert.ok(long.endsWith('…'));
});

test('normalizeGap maps geometry and context safely', () => {
  const gap = normalizeGap(
    {
      id: 'custom-gap',
      type: 'column-text-flow-gap',
      gap: { x: 12.2, y: 99.8, w: 333.1, h: 142.4 },
      above: { selector: 'p.intro', role: 'text', text: 'Above copy', top: 20, bottom: 90 },
      below: { selector: 'p.next', role: 'text', text: 'Below copy', top: 240, bottom: 300 },
      column: 2,
    },
    3,
    'pages/page-003.png',
  );

  assert.equal(gap.page, 3);
  assert.equal(gap.geometry.height, 142);
  assert.equal(gap.context.column, 2);
  assert.equal(gap.context.above.selector, 'p.intro');
});

test('buildReport returns stable ai-friendly structure', () => {
  const report = buildReport('http://localhost:5173/workbook.html', {
    pages: [
      {
        page: 1,
        dimensions: { width: 1000, height: 1400 },
        blockCount: 7,
        columns: [{ id: 1, left: 0, right: 1000, blockCount: 7 }],
        gaps: [
          {
            id: '1-page-bottom-whitespace-900',
            type: 'page-bottom-whitespace',
            gap: { x: 0, y: 900, w: 1000, h: 500 },
            above: { selector: 'section.summary', role: 'content', text: 'Summary', top: 700, bottom: 900 },
          },
        ],
      },
    ],
  });

  assert.equal(report.schemaVersion, '2.0.0');
  assert.equal(report.summary.pageCount, 1);
  assert.equal(report.summary.byType['page-bottom-whitespace'], 1);
  assert.equal(report.pages[0].gaps[0].image, 'pages/page-001.png');
});
