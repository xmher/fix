const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function padPageNumber(pageNumber) {
  return String(pageNumber).padStart(3, '0');
}

function resolveUrl(inputUrl) {
  return (
    inputUrl ||
    process.env.WORKBOOK_URL ||
    'http://127.0.0.1:4173/romantasy-analysis-guide-FIXED.html'
  );
}

function resolveOutRoot(inputOutRoot) {
  return inputOutRoot || process.env.PB_OUT_ROOT || 'out';
}

function parseCliArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const [rawKey, inlineValue] = token.slice(2).split('=');
      const key = rawKey.trim();
      if (!key) continue;
      if (inlineValue !== undefined) {
        args[key] = inlineValue;
      } else {
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) {
          args[key] = next;
          i += 1;
        } else {
          args[key] = true;
        }
      }
    } else {
      args._.push(token);
    }
  }
  return args;
}

function toClassSummary(element) {
  const className = element.className;
  if (!className || typeof className !== 'string') {
    return '';
  }
  return className
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 8)
    .join(' ');
}

function textSnippet(value, maxLength = 200) {
  const normalized = (value || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1)}…`;
}

module.exports = {
  ensureDir,
  padPageNumber,
  parseCliArgs,
  resolveOutRoot,
  resolveUrl,
  textSnippet,
  toClassSummary
};
