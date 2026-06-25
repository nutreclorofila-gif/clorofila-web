const fs = require('fs');
const path = require('path');

const root = process.cwd();
const htmlFiles = [
  ...fs.readdirSync(root).filter((f) => f.endsWith('.html')),
];
const articulosDir = path.join(root, 'articulos');
if (fs.existsSync(articulosDir)) {
  htmlFiles.push(
    ...fs
      .readdirSync(articulosDir)
      .filter((f) => f.endsWith('.html'))
      .map((f) => path.join('articulos', f))
  );
}

let errors = 0;
let checked = 0;

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g;
  let match;
  while ((match = scriptRegex.exec(html))) {
    checked++;
    try {
      JSON.parse(match[1]);
    } catch (e) {
      console.error(`[${file}] invalid JSON-LD: ${e.message}`);
      errors++;
    }
  }
}

if (errors > 0) {
  console.error(`\n${errors} invalid JSON-LD block(s) found.`);
  process.exit(1);
} else {
  console.log(`OK: checked ${checked} JSON-LD block(s) across ${htmlFiles.length} files, all valid.`);
}
