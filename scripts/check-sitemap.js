const fs = require('fs');
const path = require('path');

const root = process.cwd();
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

let errors = 0;

for (const loc of locs) {
  const url = new URL(loc);
  const slug = url.pathname.replace(/^\/|\/$/g, '');
  const file = slug === '' ? 'index.html' : `${slug}.html`;
  if (!fs.existsSync(path.join(root, file))) {
    console.error(`sitemap.xml references "${loc}" but ${file} does not exist`);
    errors++;
  }
}

if (errors > 0) {
  console.error(`\n${errors} sitemap entr(y/ies) point to missing pages.`);
  process.exit(1);
} else {
  console.log(`OK: all ${locs.length} sitemap.xml entries resolve to an existing page.`);
}
