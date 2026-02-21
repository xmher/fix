#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

function ensureDir(target) {
  fs.mkdirSync(target, { recursive: true });
}

function readPng(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath));
}

function pageFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => /^page-\d+\.png$/i.test(file))
    .sort();
}

function run() {
  const baselineDir = process.argv[2];
  const candidateDir = process.argv[3];
  const outputDir = process.argv[4] || 'out/diff';

  if (!baselineDir || !candidateDir) {
    console.error('Usage: node scripts/diff-pages.js <baseline-pages-dir> <candidate-pages-dir> [out-dir]');
    process.exit(1);
  }

  ensureDir(outputDir);

  const baselinePages = pageFiles(baselineDir);
  const candidatePages = pageFiles(candidateDir);
  const names = [...new Set([...baselinePages, ...candidatePages])];

  const results = [];

  for (const name of names) {
    const baselinePath = path.join(baselineDir, name);
    const candidatePath = path.join(candidateDir, name);

    if (!fs.existsSync(baselinePath) || !fs.existsSync(candidatePath)) {
      results.push({ page: name, status: 'missing-page', baseline: fs.existsSync(baselinePath), candidate: fs.existsSync(candidatePath) });
      continue;
    }

    const baseline = readPng(baselinePath);
    const candidate = readPng(candidatePath);

    if (baseline.width !== candidate.width || baseline.height !== candidate.height) {
      results.push({
        page: name,
        status: 'dimension-mismatch',
        baseline: { width: baseline.width, height: baseline.height },
        candidate: { width: candidate.width, height: candidate.height },
      });
      continue;
    }

    const diff = new PNG({ width: baseline.width, height: baseline.height });
    const changedPixels = pixelmatch(baseline.data, candidate.data, diff.data, baseline.width, baseline.height, {
      threshold: 0.1,
    });

    const changedRatio = changedPixels / (baseline.width * baseline.height);
    const diffPath = path.join(outputDir, name);
    fs.writeFileSync(diffPath, PNG.sync.write(diff));

    results.push({
      page: name,
      status: 'ok',
      changedPixels,
      changedRatio,
      diffImage: diffPath,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baselineDir,
    candidateDir,
    outputDir,
    pagesCompared: results.length,
    changedPages: results.filter((result) => result.status === 'ok' && result.changedPixels > 0).length,
    results,
  };

  fs.writeFileSync(path.join(outputDir, 'diff-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Diff scan complete. Compared ${report.pagesCompared} pages.`);
}

run();
