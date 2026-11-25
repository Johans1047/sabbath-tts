import { KokoroTTS } from "kokoro-js";
import { Tensor } from "@huggingface/transformers";
import init from "@echogarden/espeak-ng-emscripten";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";
const PUNCT = /(\s*[;:,.!?¡¿—…"«»“”(){}\[\]]+\s*)/;
const MAX_TOKENS = 500; // model limit is 510 including the two pad tokens

export const SPANISH_VOICES = ["ef_dora", "em_alex", "em_santa"];
export const SAMPLE_RATE = 24000;

/**
 * Local Kokoro engine for Spanish.
 * kokoro-js only knows English voices and its bundled phonemizer is English-only, so we phonemize
 * with a full espeak-ng build (es-419 = Latin American) and call the model directly.
 */
export async function createKokoro({ voice = "ef_dora", speed = 1, lang = "es-419", dtype = "fp32", cacheDir }) {
  if (!SPANISH_VOICES.includes(voice)) throw new Error(`Unknown Spanish voice "${voice}". Use: ${SPANISH_VOICES.join(", ")}`);
  const espeak = new (await init()).eSpeakNGWorker();
  espeak.set_voice(lang);
  // fp32 is ~4x faster than q8 on desktop CPUs (measured: x2.3 vs x0.56 realtime on an i7-14700).
  const tts = await KokoroTTS.from_pretrained(MODEL, { dtype, device: "cpu" });
  const style = await loadVoice(voice, cacheDir);

  const phonemize = (text) =>
    text
      .replace(/[¿¡]/g, "")
      .split(PUNCT)
      .filter(Boolean)
      .map((part) =>
        /[\p{L}\p{N}]/u.test(part) ? espeak.synthesize_ipa(part).ipa.replaceAll("_", "").replace(/\n/g, " ").trim() : part,
      )
      .join("")
      .trim();

  const speedTensor = () => new Tensor("float32", [speed], [1]);

  /** Synthesize one short chunk of text. Returns Float32Array at 24 kHz. */
  async function synth(text) {
    const phonemes = phonemize(text);
    const { input_ids } = tts.tokenizer(phonemes, { truncation: true });
    const n = input_ids.dims.at(-1);
    if (n > MAX_TOKENS) throw new Error(`chunk too long (${n} tokens): ${text.slice(0, 60)}...`);
    const off = 256 * Math.min(Math.max(n - 2, 0), 509);
    const { waveform } = await tts.model({
      input_ids,
      style: new Tensor("float32", style.slice(off, off + 256), [1, 256]),
      speed: speedTensor(),
    });
    return waveform.data;
  }

  return { synth, phonemize, voice, speed, lang };
}

async function loadVoice(name, cacheDir) {
  const file = join(cacheDir, `${name}.bin`);
  let buf;
  try {
    buf = await readFile(file);
  } catch {
    const res = await fetch(`https://huggingface.co/${MODEL}/resolve/main/voices/${name}.bin`);
    if (!res.ok) throw new Error(`voice ${name}: HTTP ${res.status}`);
    buf = Buffer.from(await res.arrayBuffer());
    await mkdir(cacheDir, { recursive: true });
    await writeFile(file, buf);
  }
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}

// ---------------------------------------------------------------------------------------------
// Chunking: split prose into pieces the model handles well (sentence-sized, never mid-abbreviation).

const NO_SPLIT_AFTER = /(?:\b[A-ZÁÉÍÓÚÑ]|\b(?:Sr|Sra|Dr|Dra|Prof|etc|cf|ed|vs|Ud|Uds))\.$/;

export function splitSentences(text, maxChars = 260) {
  const raw = text.split(/(?<=[.!?…])\s+/);
  const sentences = [];
  for (const piece of raw) {
    const prev = sentences.at(-1);
    if (prev && NO_SPLIT_AFTER.test(prev)) sentences[sentences.length - 1] = `${prev} ${piece}`;
    else sentences.push(piece);
  }
  const out = [];
  for (const s of sentences) out.push(...splitLong(s, maxChars));
  return out.filter((s) => s.trim());
}

function splitLong(s, maxChars) {
  if (s.length <= maxChars) return [s];
  // prefer clause boundaries, then words
  for (const sep of [/(?<=[;:])\s+/, /(?<=,)\s+/, /\s+/]) {
    const parts = s.split(sep);
    if (parts.length < 2) continue;
    const out = [];
    let cur = "";
    for (const p of parts) {
      if (cur && cur.length + p.length + 1 > maxChars) {
        out.push(cur);
        cur = p;
      } else cur = cur ? `${cur} ${p}` : p;
    }
    if (cur) out.push(cur);
    if (out.every((x) => x.length <= maxChars) || sep.source === "\\s+") return out;
  }
  return [s];
}
