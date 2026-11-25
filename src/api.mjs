import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const BASE = "https://sabbath-school.adventech.io/api/v2";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** GET a JSON path under the API, cached on disk so reruns are offline-friendly. */
export async function getJson(path, { cacheDir, refresh = false } = {}) {
  const file = cacheDir ? join(cacheDir, `${path.replace(/[\\/]/g, "_")}`) : null;
  if (file && !refresh) {
    try {
      return JSON.parse(await readFile(file, "utf8"));
    } catch {
      /* not cached yet */
    }
  }
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(`${BASE}/${path}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
      const data = await res.json();
      if (file) {
        await mkdir(cacheDir, { recursive: true });
        await writeFile(file, JSON.stringify(data));
      }
      return data;
    } catch (e) {
      lastError = e;
      await sleep(1000 * attempt);
    }
  }
  throw lastError;
}

export const quarterlyPath = (lang, quarter) => `${lang}/quarterlies/${quarter}/index.json`;
export const lessonPath = (lang, quarter, lesson) => `${lang}/quarterlies/${quarter}/lessons/${lesson}/index.json`;
export const dayPath = (lang, quarter, lesson, day) =>
  `${lang}/quarterlies/${quarter}/lessons/${lesson}/days/${day}/read/index.json`;
