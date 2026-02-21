const REPORT_SCHEMA_VERSION = '2.0.0';

function clampText(input, maxLen = 220) {
  const normalized = String(input || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > maxLen ? `${normalized.slice(0, maxLen)}…` : normalized;
}

function scoreGapSeverity(gap) {
  const h = Number(gap?.geometry?.height || 0);
  if (h >= 220) return 'high';
  if (h >= 120) return 'medium';
  return 'low';
}

function normalizeContextBlock(block) {
  if (!block) return null;
  return {
    selector: block.selector || '(unknown)',
    role: block.role || 'content',
    text: clampText(block.text || ''),
    top: Math.round(Number(block.top || 0)),
    bottom: Math.round(Number(block.bottom || 0)),
  };
}

function normalizeGap(rawGap, pageNumber, imagePath) {
  const geometry = {
    x: Math.round(rawGap?.gap?.x || 0),
    y: Math.round(rawGap?.gap?.y || 0),
    width: Math.round(rawGap?.gap?.w || 0),
    height: Math.round(rawGap?.gap?.h || 0),
  };

  const gap = {
    id: rawGap?.id || `${pageNumber}-${rawGap?.type || 'gap'}-${geometry.y}`,
    page: pageNumber,
    image: imagePath,
    type: rawGap?.type || 'unknown-gap',
    subtype: rawGap?.subtype || null,
    geometry,
    severity: scoreGapSeverity({ geometry }),
    context: {
      column: rawGap?.column || null,
      above: normalizeContextBlock(rawGap?.above),
      below: normalizeContextBlock(rawGap?.below),
    },
    notes: rawGap?.notes || null,
  };

  return gap;
}

function buildReport(url, pageResult) {
  const pages = (pageResult?.pages || []).map((page) => {
    const image = `pages/page-${String(page.page).padStart(3, '0')}.png`;
    const gaps = (page.gaps || []).map((rawGap) => normalizeGap(rawGap, page.page, image));

    return {
      page: page.page,
      image,
      dimensions: page.dimensions,
      blockCount: page.blockCount,
      columns: page.columns,
      gaps,
    };
  });

  const allGaps = pages.flatMap((p) => p.gaps);

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    source: {
      url,
      generatedAt: new Date().toISOString(),
      tool: 'scripts/gap-scan.js',
    },
    summary: {
      pageCount: pages.length,
      gapCount: allGaps.length,
      byType: allGaps.reduce((acc, gap) => {
        acc[gap.type] = (acc[gap.type] || 0) + 1;
        return acc;
      }, {}),
    },
    pages,
    gaps: allGaps,
  };
}

module.exports = {
  REPORT_SCHEMA_VERSION,
  clampText,
  normalizeGap,
  buildReport,
};
