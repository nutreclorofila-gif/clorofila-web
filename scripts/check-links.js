const fs = require('fs');
const path = require('path');

const root = process.cwd();
const htmlFiles = fs.readdirSync(root).filter((f) => f.endsWith('.html'));

let errors = 0;

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const attrRegex = /(?:href|src|srcset)\s*=\s*["']([^"']+)["']/g;
  let match;
  while ((match = attrRegex.exec(html))) {
    const raw = match[1];
    if (
      raw.startsWith('http://') ||
      raw.startsWith('https://') ||
      raw.startsWith('mailto:') ||
      raw.startsWith('tel:') ||
      raw.startsWith('#') ||
      raw.startsWith('data:') ||
      raw.startsWith('//')
    ) {
      continue;
    }
    const [target] = raw.split('#');
    if (!target) continue;
    const resolved = path.join(root, target);
    if (!fs.existsSync(resolved)) {
      console.error(`[${file}] broken local reference: "${raw}"`);
      errors++;
    }
  }
}

if (errors > 0) {
  console.error(`\n${errors} broken link(s)/asset reference(s) found.`);
  process.exit(1);
} else {
  console.log(`OK: checked ${htmlFiles.length} HTML files, no broken local links/assets found.`);
}
