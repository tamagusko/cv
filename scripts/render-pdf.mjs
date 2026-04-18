// Render the built Jekyll CV to a PDF using Puppeteer/Playwright headless Chromium.
//
// Inputs:  _site/index.html (and screen + print stylesheets)
// Output:  _site/Tamagusko-CV.pdf
//
// We spin up a tiny in-process HTTP server that serves _site at the same
// baseurl path (/cv/) used by GitHub Pages production. This makes the print
// stylesheet (linked as /cv/media/cv-print.css) actually resolve when the
// page is loaded — file:// loads cannot resolve absolute baseurl paths and
// would silently render the screen layout into the PDF.
//
// Run from repo root after `bundle exec jekyll build`:
//   node scripts/render-pdf.mjs

import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join, extname } from "node:path";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const siteDir = resolve(root, "_site");
const outPath = resolve(siteDir, "Tamagusko-CV.pdf");
const baseUrl = "/cv";   // matches _config.yml baseurl

if (!existsSync(siteDir)) {
  console.error(`render-pdf: missing build output at ${siteDir}. Run jekyll build first.`);
  process.exit(1);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico":  "image/x-icon",
  ".json": "application/json",
  ".xml":  "application/xml",
  ".woff":  "font/woff",
  ".woff2": "font/woff2",
};

const server = createServer(async (req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath.startsWith(baseUrl + "/")) urlPath = urlPath.slice(baseUrl.length);
  else if (urlPath === baseUrl) urlPath = "/";
  if (urlPath.endsWith("/")) urlPath += "index.html";
  const filePath = join(siteDir, urlPath);
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "content-type": MIME[extname(filePath)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end();
  }
});

await new Promise((r) => server.listen(0, r));
const { port } = server.address();

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

await page.goto(`http://localhost:${port}${baseUrl}/`, { waitUntil: "networkidle" });
await page.emulateMedia({ media: "print" });

await page.pdf({
  path: outPath,
  format: "A4",
  printBackground: true,
  margin: { top: "14mm", right: "12mm", bottom: "14mm", left: "12mm" },
  preferCSSPageSize: true,
});

await browser.close();
server.close();
console.log(`render-pdf: wrote ${outPath}`);
