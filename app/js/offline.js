// Saving lessons for offline use. Audio goes to its own cache so it can be listed and removed;
// day JSON goes to the data cache the service worker already reads from.
export const AUDIO_CACHE = "lga-audio-v1";
export const DATA_CACHE = "lga-data-v1";

export const supported = typeof caches !== "undefined";

/** Which of these URLs are saved already. */
export async function savedSet(urls) {
  const found = new Set();
  if (!supported) return found;
  const cache = await caches.open(AUDIO_CACHE);
  await Promise.all(
    urls.map(async (u) => {
      if (await cache.match(u)) found.add(u);
    }),
  );
  return found;
}

/**
 * Save audio files (and their day JSON) for offline playback.
 * Returns { ok, failed }; never throws, so the UI can say what happened.
 */
export async function saveLesson({ audio, data }, onProgress = () => {}) {
  if (!supported) return { ok: false, failed: audio, reason: "unsupported" };
  const failed = [];
  let done = 0;
  const audioCache = await caches.open(AUDIO_CACHE);
  const dataCache = await caches.open(DATA_CACHE);

  for (const url of data) {
    try {
      const res = await fetch(url);
      if (res.ok) await dataCache.put(url, res);
    } catch {
      /* text is a bonus; the audio is what matters */
    }
  }
  for (const url of audio) {
    try {
      if (!(await audioCache.match(url))) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await audioCache.put(url, res);
      }
    } catch (e) {
      failed.push({ url, quota: e?.name === "QuotaExceededError" });
    }
    onProgress(++done, audio.length);
  }
  return { ok: failed.length === 0, failed, reason: failed.some((f) => f.quota) ? "quota" : failed.length ? "network" : null };
}

export async function removeLesson({ audio }) {
  if (!supported) return;
  const cache = await caches.open(AUDIO_CACHE);
  await Promise.all(audio.map((u) => cache.delete(u)));
}
