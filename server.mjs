/**
 * Production server for Render / any Node host.
 * Serves Vite build output and falls back to index.html for SPA routes
 * (fixes "Not Found" when refreshing /bom, /rfq-inbox, etc.).
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DIST = join(__dirname, "dist");
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  const resolved = normalize(join(DIST, decoded));
  if (!resolved.startsWith(DIST)) return null;
  return resolved;
}

async function sendFile(res, filePath) {
  const ext = extname(filePath);
  res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
  createReadStream(filePath).pipe(res);
}

async function sendIndex(res) {
  const indexPath = join(DIST, "index.html");
  const html = await readFile(indexPath, "utf8");
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

const server = createServer(async (req, res) => {
  try {
    const pathname = req.url ?? "/";
    const filePath = safePath(pathname === "/" ? "/index.html" : pathname);

    if (filePath && existsSync(filePath)) {
      const info = await stat(filePath);
      if (info.isFile()) {
        await sendFile(res, filePath);
        return;
      }
    }

    await sendIndex(res);
  } catch {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`SPA server listening on http://0.0.0.0:${PORT}`);
});
