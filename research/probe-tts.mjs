import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { statSync, mkdirSync } from "node:fs";

const out = new URL(".", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const tts = new MsEdgeTTS();
const voices = await tts.getVoices();
const es = voices.filter((v) => v.Locale.startsWith("es-"));
console.log("es voices:", es.length);
for (const v of es.filter((v) => ["es-MX", "es-CO", "es-US", "es-AR", "es-ES"].includes(v.Locale)))
  console.log(" ", v.ShortName, v.Gender);

const text = "Ahora vamos a la sección de preguntas. ¿Qué nos dice esto sobre por qué la Biblia debe ser la autoridad definitiva?";
mkdirSync(`${out}samples`, { recursive: true });
for (const voice of ["es-MX-DaliaNeural", "es-MX-JorgeNeural", "es-CO-SalomeNeural"]) {
  const t = new MsEdgeTTS();
  await t.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioFilePath } = await t.toFile(`${out}samples`, text);
  console.log(voice, "->", audioFilePath, statSync(audioFilePath).size, "bytes");
}
