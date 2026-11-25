#!/usr/bin/env node
// Static server for the app: ./app at "/" and the generated audio folder at "/audio/".
// Supports HTTP Range (needed to seek inside MP3s). No dependencies.
import http from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join, extname, resolve, sep, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const port = Number(opt("port", 8787));
const appDir = resolve(opt("app", join(ROOT, "app")));
const audioDir = resolve(opt("audio", join(ROOT, "output")));
const host = args.includes("--lan") ? "0.0.0.0" : "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".txt": "text/plain; charset=utf-8",
};

function resolveSafe(base, rel) {
  const full = resolve(base, "." + sep + rel);
  return full === base || full.startsWith(base + sep) ? full : null;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://x");
    let pathname = decodeURIComponent(url.pathname);
    let base = appDir;
    if (pathname.startsWith("/audio/")) {
      base = audioDir;
      pathname = pathname.slice("/audio".length);
    }
    if (pathname.endsWith("/")) pathname += "index.html";
    const file = resolveSafe(base, pathname);
    const info = file && (await stat(file).catch(() => null));
    if (!info?.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("No encontrado");
    }
    const headers = {
      "Content-Type": MIME[extname(file)] ?? "application/octet-stream",
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-cache",
    };
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
    if (range && (range[1] || range[2])) {
      const start = range[1] ? Number(range[1]) : Math.max(0, info.size - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
      if (start > end || start >= info.size) {
        res.writeHead(416, { ...headers, "Content-Range": `bytes */${info.size}` });
        return res.end();
      }
      res.writeHead(206, { ...headers, "Content-Range": `bytes ${start}-${end}/${info.size}`, "Content-Length": end - start + 1 });
      return createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...headers, "Content-Length": info.size });
    if (req.method === "HEAD") return res.end();
    createReadStream(file).pipe(res);
  } catch (e) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Error del servidor");
  }
});

server.listen(port, host, () => {
  console.log(`App    ${appDir}\nAudio  ${audioDir}`);
  console.log(`Abrir  http://localhost:${port}/`);
  if (host === "0.0.0.0") {
    for (const list of Object.values(networkInterfaces()))
      for (const n of list ?? []) if (n.family === "IPv4" && !n.internal) console.log(`LAN    http://${n.address}:${port}/  (sin https no se puede guardar sin conexión)`);
  }
});
