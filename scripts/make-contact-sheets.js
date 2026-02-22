const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const {
  ensureDir,
  padPageNumber,
  parseCliArgs,
  resolveOutRoot
} = require('./lib/pipeline-utils');

const COLUMNS = 3;
const ROWS = 4;
const SHEET_SIZE = COLUMNS * ROWS;
const THUMBNAIL_WIDTH = 340;
const THUMBNAIL_HEIGHT = 440;
const PADDING = 20;

function listPageImages(outRoot) {
  const pagesDir = path.join(outRoot, 'pages');
  if (!fs.existsSync(pagesDir)) {
    return [];
  }
  return fs
    .readdirSync(pagesDir)
    .filter((name) => /^page-\d{3}\.png$/i.test(name))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => path.join(pagesDir, name));
}

async function createSheet(images, sheetIndex, outDir) {
  const width = PADDING + COLUMNS * (THUMBNAIL_WIDTH + PADDING);
  const height = PADDING + ROWS * (THUMBNAIL_HEIGHT + PADDING);

  const composites = await Promise.all(
    images.map(async (imagePath, idx) => {
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
    create: {
      width,
      height,
      channels: 3,
      background: '#f3f0eb'
    }
  })
    .composite(composites)
    .png()
    .toFile(sheetPath);

  return sheetPath;
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const outRoot = resolveOutRoot(args.out || args._[0]);
  const outDir = path.join(outRoot, 'contact-sheets');
  ensureDir(outDir);

  const pageImages = listPageImages(outRoot);
  if (!pageImages.length) {
    throw new Error('No page screenshots found. Run scripts/render-pages.js first.');
  }

  const results = [];
  for (let i = 0; i < pageImages.length; i += SHEET_SIZE) {
    const slice = pageImages.slice(i, i + SHEET_SIZE);
    const file = await createSheet(slice, Math.floor(i / SHEET_SIZE) + 1, outDir);
    results.push(file);
  }

  console.log(`Generated ${results.length} contact sheet(s) in ${outDir}`);
}

main().catch((error) => {
  console.error('make-contact-sheets failed:', error);
  process.exit(1);
});
