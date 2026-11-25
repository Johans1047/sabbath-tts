# sabbath-tts

Audio generator + player for Sabbath School lessons (Adventech API). Goal: generate MP3/WAV per day offline-capable,
copy a folder of audio + `index.json` to any device, play with a PWA (Windows / Linux / Mac / Android).

Status: **research, generator and first PWA UI done**. Verified on lesson 4 / day 2 (the only day with audio). Default voice: `em_alex`.

# Guía de uso

Dos pasos: **(1) generar el audio** del trimestre (una vez, tarda horas) y **(2) abrir la app** para escucharlo.
Todo se ejecuta dentro de la carpeta del proyecto, `C:\Users\jonathan.salazar1\Tools\sabbath-tts`.

## 1. Primera vez

Necesitas Node.js (probado con v24). Desde la carpeta del proyecto:

```
npm install
```

## 2. Generar el audio de un trimestre

El código del trimestre es el final de su dirección en Adventech: en
`https://sabbath-school.adventech.io/es/2026-04-cq` el código es `2026-04-cq`.

```
node src/generate.mjs --quarter 2026-04-cq
```

- Genera **un MP3 por día** (13 lecciones × 7 días) con la voz `em_alex` y los guarda en `output\2026-04-cq\`.
- Con un procesador como el de esta PC va a ~2,2 veces la velocidad real: **unas 2 a 3 horas** el trimestre completo.
  La primera vez además descarga el modelo de voz (unos 300 MB), que queda guardado para las siguientes.
- **Se puede cortar y retomar**: si lo detienes (Ctrl+C) o se apaga la PC, vuelve a correr el mismo comando. Salta los días
  que ya están hechos. Solo se pierde el día que estaba en curso.
- La consola avisa de cada día terminado. Al final se actualizan `output\2026-04-cq\index.json` y `output\catalog.json`.

Variantes útiles:

| Quieres… | Comando |
|---|---|
| Probar con un solo día | `node src/generate.mjs --quarter 2026-04-cq --lesson 4 --day 2` |
| Una semana completa | `node src/generate.mjs --quarter 2026-04-cq --lesson 4` |
| Ver **solo el texto** que se leerá, sin generar audio (rápido) | agregar `--dry-run`; revisa los `.txt` de `output\2026-04-cq\<lección>\` |
| Otra voz (`ef_dora`, `em_alex`, `em_santa`) | agregar `--voice ef_dora` |
| Leer también el texto de los versículos | agregar `--verses text` (por defecto solo dice la referencia) |
| Más lento o más rápido | agregar `--speed 0.9` o `--speed 1.1` |
| Rehacer días que ya existen | agregar `--force` |

Si cambias la voz, la velocidad o los versículos, el comando regenera por sí solo los días que se hicieron con otra
configuración. Si algo suena raro, mira el `.txt` de ese día: es exactamente el texto que se lee. Se corrige en
`src\spoken.mjs` y se regenera ese día con `--force`.

## 3. Abrir la app

```
npm run serve
```

Abre **http://localhost:8787** en el navegador. Para cerrarlo, `Ctrl+C` en esa consola. Si el puerto está ocupado:
`npm run serve -- --port 8800`.

- **En la misma PC:** todo funciona, incluido guardar sin conexión.
- **Desde el celular (misma Wi-Fi):** `npm run serve -- --lan` y abre la dirección `LAN` que imprime la consola. Se puede
  escuchar, pero **no guardar sin conexión**: los navegadores solo permiten eso en `localhost` o con `https`.
- Si tu navegador lo ofrece (Chrome o Edge), puedes **instalarla** como app desde su menú.

## 4. Escuchar

- Al abrir, aparece **el día de hoy** de la semana actual. Pulsa **Escuchar**.
- Arriba, las **pestañas D L M M J V S** cambian de día; el botón **Semanas** (o la lista de la izquierda en pantalla
  grande) cambia de semana. Un día sin audio dice "Sin audio todavía" y aun así se puede **leer**.
- Mientras suena, el texto **resalta el bloque que se está leyendo**. Toca un párrafo para saltar a ese punto.
  Si lo recorres a mano, deja de seguirte unos segundos.
- Barra inferior: velocidad (`1×`, `1,15×`…), retroceder y adelantar 15 s, y la **luna** para el **temporizador de
  apagado** (15, 30, 45, 60 minutos o "al terminar este día").
- **Marcar escuchado** pone el sello del día; también se marca solo al llegar al 95 %. La lista de semanas muestra
  cuántos llevas. La app **recuerda dónde te quedaste** en cada día.
- **Ajustes** (el botón de controles, arriba a la derecha): apariencia (automática, día, noche), tamaño del texto y
  "Párrafos largos" (completos o acortados con "Seguir leyendo").
- Teclado: `Espacio` pausa o sigue, `←` `→` retroceden o adelantan 15 s, y con una pestaña seleccionada `←` `→` cambian de día.

## 5. Guardar una semana para escuchar sin conexión

Con el audio de esa semana ya generado, pulsa **Guardar semana** (debajo de la franja de color). Descarga los MP3 y los
textos al dispositivo, y luego funciona **sin servidor ni internet**, incluso saltando dentro del audio. **Quitar** libera
el espacio. Recuerda: solo en `localhost` o `https`.

## 6. Cuando salga otro trimestre

Repite el paso 2 con el código nuevo (por ejemplo `--quarter 2027-01-cq`; confirma el código en la dirección de
Adventech). La app lo detecta sola y, si hay más de uno, aparece un selector de trimestre en la barra superior.

## 7. Si algo falla

| Síntoma | Qué hacer |
|---|---|
| Dice "Sin audio todavía" en un día | Ese día no se ha generado. Corre el paso 2 (se retoma donde quedó). |
| "No se pudo cargar el trimestre" | El servidor no está encendido o `output\` está vacío. Corre `npm run serve` y revisa que exista `output\catalog.json`. |
| Cambié archivos de la app y no veo el cambio | El navegador guarda una copia para el modo sin conexión: recarga dos veces o sube el número `VERSION` de `app\sw.js`. |
| La generación se corta o la PC se apagó | Vuelve a correr el mismo comando; retoma sola. |
| Una palabra o sigla se lee mal | Corrígela en `src\spoken.mjs` y regenera ese día con `--force`. |
| El resaltado del texto va un poco desfasado | Es normal en el audio generado **antes** de que se guardaran los tiempos exactos (aviso al pie del texto). El audio nuevo lo trae preciso. |

# Notas técnicas

## Run the app

```
npm run serve            # http://localhost:8787  (app + ./output served as /audio/)
npm run serve -- --lan   # also reachable from a phone on the same Wi-Fi
```

`src/serve.mjs` serves `app/` at `/` and the generator output at `/audio/`, with HTTP Range (needed to seek inside MP3s).
**Offline saving needs a secure context**: it works on `localhost` or `https://`, NOT on plain `http://<lan-ip>`
(browsers disable service workers and the Cache API there). To use it from a phone, serve over https.

## The app (`app/`)

Static HTML/CSS/JS, no build, no runtime dependencies. Fonts are self-hosted (OFL): Bricolage Grotesque + Literata.
Direction: "La Guía de Estudio, a todo color" (see `PRODUCT.md` and the contract comment at the top of `app/index.html`).

- Today's day opens first; weeks list (13 lessons, colour per week from a 7-hue ring); seven guide tabs per week.
- Lesson text shown while playing with the current section highlighted; tap a block to seek (once the day is loaded in the player).
- Player: play/pause, +-15 s, speed, sleep timer (timed or end of day), lock-screen controls (Media Session), resume position.
- "Escuchado" marks and progress per week; day/night/auto theme; reading size.
- Paragraph legibility: measure ~69 letters a line (38rem column), `text-wrap: pretty` on body text, `balance` on headings,
  questions and week names, limited hyphenation, `line-clamp: 2` on week names and the lesson subtitle. Optional
  Ajustes > "Párrafos largos > Acortados" folds paragraphs over 8 lines ("Seguir leyendo"); off by default, the paragraph
  being read aloud opens by itself, opened paragraphs survive re-measuring, and height-only resizes (phone address
  bar) are ignored.
- Offline: "Guardar la semana sin conexión" caches that week's MP3s + texts + quarter index; the service worker answers Range
  requests from the cache. Verified end to end: with the server stopped the app opens, plays and seeks.
- Files: `js/app.js` (screens), `js/player.js`, `js/offline.js`, `js/data.js` (data + timing estimate), `js/store.js`, `sw.js`.

Known limits:
- Text highlight is **estimated** from character counts for audio generated before timings existed (a footnote says so).
  New audio from `generate.mjs` writes exact per-segment timings into `NN.json`.
- The independent finish review shipped only four scored fixes (stamp, highlight across themes, section rule, band
  height), not the whole surface; later polish (duration in the date line, band colour transition, touch targets,
  paragraph legibility) was verified by hand, not re-reviewed.
- The design detector ran in degraded mode (missing HTML parser modules), so its "no findings" is an undercount.

## Usage

```
npm install
node src/generate.mjs --quarter 2026-04-cq                 # whole quarter (resumable)
node src/generate.mjs --quarter 2026-04-cq --lesson 4 --day 2
node src/generate.mjs --quarter 2026-04-cq --lesson 4 --dry-run   # only write the spoken scripts (.txt)
```

Options: `--voice ef_dora|em_alex|em_santa`, `--speed`, `--verses ref|text`, `--kbps`, `--force`, `--out`, `--lang`.
Output: `output/<quarter>/<lesson>/<day>.mp3` + `.txt` (exact text that is read; review it) and `output/<quarter>/index.json`.
Reruns skip days whose mp3 exists with the same settings; `--force` regenerates.

Code: `src/api.mjs` (API + disk cache), `src/clean.mjs` (HTML -> segments, question cue), `src/spoken.mjs` (Bible
references and abbreviations -> spoken Spanish), `src/kokoro.mjs` (engine + sentence chunking), `src/audio.mjs`
(concat, normalize, MP3), `src/generate.mjs` (CLI).

Measured: Kokoro fp32 on an i7-14700 = ~2.2x realtime (day 2: 218 s of audio in 100 s). Expect ~2-3 h for a quarter.
**Kokoro q8 is ~4x slower than fp32 on this CPU** (0.56x realtime) - do not use it. More threads did not help.

Text QA: `node research/scan-scripts.mjs` scans all 91 generated day scripts for leftovers (brackets, double punctuation,
raw abbreviations, ALL-CAPS). It found and drove fixes for Bible-version acronyms (NBLA, NTV, NVI, RVC, PDT...), "d. C.",
"eds.", and a stray full stop after titles ending in "!" (lesson 7). Remaining ALL-CAPS is mostly "ACES" (pronounceable).
`--dry-run` never rewrites the text/timings of a day that already has audio (they must stay paired).

Defaults: voice `em_alex` (chosen by the user), verses = reference only (`--verses text` reads the text too; not confirmed
by the user yet).

## Decisions

- Generation is done only by the owner (a script run once per quarter). No backend.
- Distribution = option B: a folder of audio + `index.json` copied to each device; the PWA reads it.
- Whole lesson is read, with a spoken cue between sections (e.g. "Ahora vamos a la sección de preguntas").
- Any quarter (`2026-04-cq` style code). Neutral Latin American accent.
- TTS engine: **Kokoro, local** (no internet, no rate limit). Edge TTS kept only as a fallback/comparison.

## Findings

### Adventech API (public, CORS `*`)
- `https://sabbath-school.adventech.io/api/v2/es/quarterlies/{quarter}/index.json` -> `{quarterly, lessons[]}`
- `.../lessons/{NN}/index.json` -> `{lesson, days[], pdfs}`
- `.../lessons/{NN}/days/{NN}/read/index.json` -> `{id, date, title, bible, content}` (`content` is HTML)
- `bible[0].verses` maps every `verse="..."` attribute in `content` to RVR1960 text, but it is **incomplete for
  ranges**: `Efesios 2:19-3:7` only has 2:19-22 and `Mateo 24:11, 23-25` only has 24:11. `--verses text` reads what exists.
- The quarterly `description` field is French boilerplate unrelated to the quarter; it is not used.
- Source typos exist (e.g. day 7 starts "Amedida"); `SOURCE_TYPOS` in `src/spoken.mjs` patches known ones.
- Questions are wrapped in `<code>`; some `<code>` are empty. Day 6 has no questions (Ellen G. White reading).
- Noise to strip: `<sup>` footnote markers, `<hr>` + footnotes with `{&quot;style&quot;...}` junk, URLs, empty `<code>`.
- Day titles are fixed names: InTro, inTerioriza, inTerpreta, inVestiga, inVita, imPlicate, inQuiere.
- Samples of real responses: `research/api-samples/`.

### TTS
- **Kokoro in Spanish works**, but `kokoro-js` cannot do it out of the box: it only exposes English voices and its
  bundled `phonemizer` package ships English-only espeak data.
- Workaround (works): phonemize with `@echogarden/espeak-ng-emscripten` (full espeak-ng, 140 voices) using
  `es-419` (Latin American; `es` gives Castilian `θ`), then call the Kokoro model directly with the Spanish voices
  `ef_dora` (F), `em_alex` (M), `em_santa` (M). See `research/kokoro-es.mjs`.
  - Strip `_` from espeak IPA output; remove `¿`/`¡` (not in Kokoro vocab).
  - Voice `.bin` files come from HF `onnx-community/Kokoro-82M-v1.0-ONNX/voices/` (cached in `.cache/`, gitignored).
- Only 3 Spanish voices exist in Kokoro. Audio quality is NOT yet judged by ear (samples in `samples/`).
- Edge TTS (`msedge-tts`) works but hits `429` quickly; needs throttling + backoff, and `close()` on the client or the
  process never exits. It is a cloud service (`speech.platform.bing.com`), not local.
- No real Python on this machine (only the Store stub). Plan A (Python `kokoro-onnx`) was not needed.

## Layout

- `app/` - the PWA (see above). `src/serve.mjs` - dev server. `scripts/make-icons.mjs` - renders the PNG icons (geometry only).
- `PRODUCT.md` - product truth; `DESIGN.md` (+ `.impeccable/design.json`) - the visual system recorded from the built UI;
  `.impeccable/review/` - review screenshots. If you re-run `npm run icons`, the PNG origin note is lost; re-embed it with
  the Impeccable `embed-prompt.mjs` tool (origin: scripts/make-icons.mjs, geometry only).
- `research/` - throwaway probes (API, Edge, Kokoro, palette contrast audit). Not production code.
- `samples/` - audio samples for A/B listening (Edge vs Kokoro voices).

## Next

1. Generate the rest of the quarter with `em_alex` (long run; resumable). Not started: the owner asked to wait.
2. Decide where to host (https needed for offline saving on phones).
3. Confirm verse mode (reference only vs reference + text).
4. Optional: wrap with Capacitor (Android) / Tauri (desktop); not started.
