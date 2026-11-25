import { StyleTextToSpeech2Model, AutoTokenizer, Tensor } from "@huggingface/transformers";
import init from "@echogarden/espeak-ng-emscripten";
import { readFile } from "node:fs/promises";

const MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";
const root = new URL("../", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");

const text =
  "El único registro oficial que tenemos de las palabras de los apóstoles y profetas sobre Jesús, su vida y sus obras es la Biblia. Esto nos dice por qué la Biblia debe ser la autoridad definitiva.";

const espeak = new (await init()).eSpeakNGWorker();
espeak.set_voice("es-419");
const ps = espeak.synthesize_ipa(text).ipa.replaceAll("_", "").replace(/\n/g, " ").trim();
const tokenizer = await AutoTokenizer.from_pretrained(MODEL);
const { input_ids } = tokenizer(ps, { truncation: true });
const n = input_ids.dims.at(-1);
const buf = await readFile(`${root}.cache/kokoro/ef_dora.bin`);
const voice = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
const off = 256 * Math.min(Math.max(n - 2, 0), 509);

const configs = [
  { label: "q8 default", dtype: "q8" },
  { label: "q8 intra=8", dtype: "q8", session_options: { intraOpNumThreads: 8 } },
  { label: "fp32 default", dtype: "fp32" },
  { label: "fp32 intra=8", dtype: "fp32", session_options: { intraOpNumThreads: 8 } },
  { label: "fp32 intra=16", dtype: "fp32", session_options: { intraOpNumThreads: 16 } },
];

console.log(`text: ${text.length} chars, ${n} tokens`);
for (const c of configs) {
  const model = await StyleTextToSpeech2Model.from_pretrained(MODEL, { dtype: c.dtype, device: "cpu", session_options: c.session_options });
  const run = async () => {
    const t0 = performance.now();
    const { waveform } = await model({
      input_ids,
      style: new Tensor("float32", voice.slice(off, off + 256), [1, 256]),
      speed: new Tensor("float32", [1], [1]),
    });
    return { sec: (performance.now() - t0) / 1000, audio: waveform.data.length / 24000 };
  };
  await run(); // warm-up
  const a = await run();
  const b = await run();
  const t = (a.sec + b.sec) / 2;
  console.log(`${c.label.padEnd(14)} ${t.toFixed(2)} s for ${a.audio.toFixed(1)} s audio -> x${(a.audio / t).toFixed(2)} realtime`);
}
process.exit(0);
