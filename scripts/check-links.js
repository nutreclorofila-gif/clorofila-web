const fs = require('fs');
const path = require('path');

const root = process.cwd();
const htmlFiles = fs.readdirSync(root).filter((f) => f.endsWith('.html'));

let errors = 0;

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const hrefSrcRegex = /(?:href|src)\s*=\s*["']([^"']+)["']/g;
  const srcsetRegex = /srcset\s*=\s*["']([^"']+)["']/g;

  function checkRef(raw) {
    if (
      raw.startsWith('http://') ||
      raw.startsWith('https://') ||
      raw.startsWith('mailto:') ||
      raw.startsWith('tel:') ||
      raw.startsWith('#') ||
      raw.startsWith('data:') ||
      raw.startsWith('//')
    ) {
      return;
    }
    const [target] = raw.split('#');
    if (!target) return;
    const resolved = path.join(root, target);
    if (!fs.existsSync(resolved)) {
      console.error(`[${file}] broken local reference: "${raw}"`);
      errors++;
    }
  }

  let match;
  while ((match = hrefSrcRegex.exec(html))) {
    checkRef(match[1]);
  }
  while ((match = srcsetRegex.exec(html))) {
    for (const entry of match[1].split(',')) {
      const url = entry.trim().split(/\s+/)[0];
      if (url) checkRef(url);
    }
  }
}

if (errors > 0) {
  console.error(`\n${errors} broken link(s)/asset reference(s) found.`);
  process.exit(1);
} else {
  console.log(`OK: checked ${htmlFiles.length} HTML files, no broken local links/assets found.`);
}
