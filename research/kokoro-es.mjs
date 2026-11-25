import { KokoroTTS } from "kokoro-js";
import { RawAudio, Tensor } from "@huggingface/transformers";
import init from "@echogarden/espeak-ng-emscripten";
import { mkdirSync, existsSync, writeFileSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const cache = `${root}.cache/kokoro/`;
const outDir = `${root}samples/`;
mkdirSync(cache, { recursive: true });
mkdirSync(outDir, { recursive: true });

const MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";
const LANG = process.argv[2] ?? "es-419";
const PUNCT = /(\s*[;:,.!?¡¿—…"«»“”(){}\[\]]+\s*)/;

const espeak = new (await init()).eSpeakNGWorker();
espeak.set_voice(LANG);

function phonemize(text) {
  return text
    .split(PUNCT)
    .filter(Boolean)
    .map((part) => {
      if (!/[\p{L}\p{N}]/u.test(part)) return part;
      return espeak.synthesize_ipa(part).ipa.replaceAll("_", "").replace(/\n/g, " ").trim();
    })
    .join("")
    .trim();
}

async function loadVoice(name) {
  const file = `${cache}${name}.bin`;
  if (!existsSync(file)) {
    const res = await fetch(`https://huggingface.co/${MODEL}/resolve/main/voices/${name}.bin`);
    if (!res.ok) throw new Error(`voice ${name}: HTTP ${res.status}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  const buf = readFileSync(file);
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}

const text =
  process.argv[3] ??
  "Ahora vamos a la sección de preguntas. ¿Qué nos dice esto sobre por qué la Biblia debe ser la autoridad definitiva?";

console.log("loading model (q8)...");
const tts = await KokoroTTS.from_pretrained(MODEL, { dtype: "q8", device: "cpu" });

const ps = phonemize(text);
console.log(`[${LANG}] phonemes: ${ps}`);

// Does the tokenizer know every phoneme symbol? (unknown symbols are dropped silently)
const unknown = [];
for (const ch of new Set([...ps])) {
  if (/\s/.test(ch)) continue;
  const n = tts.tokenizer(ch, { truncation: true }).input_ids.dims.at(-1);
  if (n <= 2) unknown.push(ch);
}
console.log("symbols unknown to Kokoro vocab:", unknown.length ? unknown.join(" ") : "(none)");

const { input_ids } = tts.tokenizer(ps, { truncation: true });
const n = input_ids.dims.at(-1);

for (const voice of ["ef_dora", "em_alex", "em_santa"]) {
  const data = await loadVoice(voice);
  const off = 256 * Math.min(Math.max(n - 2, 0), 509);
  const style = new Tensor("float32", data.slice(off, off + 256), [1, 256]);
  const { waveform } = await tts.model({ input_ids, style, speed: new Tensor("float32", [1], [1]) });
  const samples = waveform.data;
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  const file = `${outDir}kokoro-${voice}-${LANG}.wav`;
  new RawAudio(samples, 24000).save(file);
  console.log(`${voice}: ${(samples.length / 24000).toFixed(1)} s, peak ${peak.toFixed(3)} -> ${file}`);
}
console.log("done");
