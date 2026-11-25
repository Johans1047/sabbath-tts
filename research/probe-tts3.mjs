import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { statSync, mkdirSync, renameSync } from "node:fs";

const out = new URL(".", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
mkdirSync(`${out}samples`, { recursive: true });
const text = "Ahora vamos a la sección de preguntas. ¿Qué nos dice esto sobre por qué la Biblia debe ser la autoridad definitiva?";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const voice of ["es-MX-DaliaNeural", "es-MX-JorgeNeural", "es-CO-SalomeNeural"]) {
  await sleep(4000);
  const t = new MsEdgeTTS();
  try {
    await t.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioFilePath } = await t.toFile(`${out}samples`, text);
    const dest = `${out}samples/${voice}.mp3`;
    renameSync(audioFilePath, dest);
    const size = statSync(dest).size;
    console.log(voice, size, "bytes ~", (size / 6000).toFixed(1), "s");
  } catch (e) {
    console.log(voice, "FAILED:", e.message);
  } finally {
    t.close();
  }
}
console.log("done");
