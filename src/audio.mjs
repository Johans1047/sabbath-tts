import { Mp3Encoder } from "@breezystack/lamejs";
import { SAMPLE_RATE } from "./kokoro.mjs";

/** Join audio chunks and silences ({ silence: seconds }) into one Float32Array. */
export function concat(parts, sampleRate = SAMPLE_RATE) {
  const lengths = parts.map((p) => (p.silence ? Math.round(p.silence * sampleRate) : p.length));
  const out = new Float32Array(lengths.reduce((a, b) => a + b, 0));
  let at = 0;
  parts.forEach((p, i) => {
    if (!p.silence) out.set(p, at);
    at += lengths[i];
  });
  return out;
}

export function peakOf(samples) {
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  return peak;
}

export function normalize(samples, target = 0.9) {
  const peak = peakOf(samples);
  if (!peak) return samples;
  const gain = target / peak;
  return samples.map((v) => v * gain);
}

/** Mono MP3. 64 kbps is plenty for speech and keeps a quarter of lessons small. */
export function encodeMp3(samples, { sampleRate = SAMPLE_RATE, kbps = 64 } = {}) {
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) pcm[i] = Math.max(-1, Math.min(1, samples[i])) * 0x7fff;
  const enc = new Mp3Encoder(1, sampleRate, kbps);
  const chunks = [];
  const block = 1152 * 10;
  for (let i = 0; i < pcm.length; i += block) {
    const out = enc.encodeBuffer(pcm.subarray(i, i + block));
    if (out.length) chunks.push(Buffer.from(out));
  }
  const tail = enc.flush();
  if (tail.length) chunks.push(Buffer.from(tail));
  return Buffer.concat(chunks);
}
