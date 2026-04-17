// Render the built Jekyll CV to a PDF using Puppeteer headless Chromium.
// Inputs:  _site/index.html (and screen + print stylesheets)
// Output:  _site/Tamagusko-CV.pdf
//
// Run from repo root after `bundle exec jekyll build`:
//   node scripts/render-pdf.mjs

import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const indexPath = resolve(root, "_site/index.html");
const outPath = resolve(root, "_site/Tamagusko-CV.pdf");

if (!existsSync(indexPath)) {
  console.error(`render-pdf: missing build output at ${indexPath}. Run jekyll build first.`);
  process.exit(1);
}

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

await page.goto(`file://${indexPath}`, { waitUntil: "networkidle" });
await page.emulateMedia({ media: "print" });

await page.pdf({
  path: outPath,
  format: "A4",
  printBackground: true,
  margin: { top: "14mm", right: "12mm", bottom: "14mm", left: "12mm" },
  preferCSSPageSize: true,
});

await browser.close();
console.log(`render-pdf: wrote ${outPath}`);
