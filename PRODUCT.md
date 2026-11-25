# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS, no build step (user's choice). A service worker provides offline use. May later be wrapped with
Capacitor (Android) or Tauri (desktop); that is not decided and is not in scope now.

## Users

The owner (a Spanish speaker) who wants to listen to the weekly Sabbath School lesson instead of reading it. Devices
named: Windows, Linux, Mac and Android. No other audience has been confirmed.

## Product Purpose

Play pre-generated audio of the Sabbath School lessons (Adventech API text, read by a local Kokoro voice) for any
quarter. Success is opening the app and hearing today's lesson with as little friction as possible, including offline.

## Positioning

A personal, offline-capable listener for a specific lesson corpus, with a spoken cue before the questions section. It is
not a general podcast or audiobook player.

## Operating Context

- Content is a quarter of 13 weekly lessons; each lesson has 7 days (Sunday to Saturday); each day is one MP3 of about
  3-6 minutes. The day names are fixed wordplay titles (e.g. InTro, inTerioriza, inTerpreta, inVestiga, inVita,
  imPlícate, inQuiere).
- Audio and `index.json` are produced by the owner with `src/generate.mjs` once per quarter; the app only plays them.
- Delivery (confirmed): the app and the audio folder are served from the same place (this PC, the Raspberry Pi, or a
  static host) and each device downloads lessons into its cache for offline playback. No folder-picker flow.
- The owner uses the app for listening, including at night.

## Capabilities and Constraints

Confirmed features:
- Play, pause, seek, playback speed.
- Show the lesson text while it plays, with the current section highlighted.
- Mark days as listened, with progress per week and per quarter.
- Sleep timer.
- Works for any quarter code (`2026-04-cq` style), not only the current one; picks today's lesson by date.

Constraints and open facts:
- `index.json` today holds per-day file, date, duration and settings only. Showing synced text needs per-segment
  timestamps, which the generator does not emit yet; the existing sample audio has none. Open: regenerate with timings
  versus estimating position from character counts. Do not regenerate audio without the owner's go-ahead.
- Text for each day exists as `NN.txt` with typed segments (`[intro]`, `[heading]`, `[text]`, `[list]`, `[question]`,
  `[cue]`, `[verse]`).
- Voice in use: Kokoro `em_alex` (Latin American Spanish, male). Interface language: Spanish.
- No accounts, no backend, no network dependency once lessons are cached.

## Evidence on Hand

- Real data: `output/2026-04-cq/index.json` plus `output/2026-04-cq/04/02.mp3` and the seven `04/NN.txt` scripts
  (lesson 4, "Profetas del Nuevo Testamento"; the quarter is "El don de profecía", 2026-09-27 to 2026-12-26).
- Only lesson 4 / day 2 has audio. Other days have scripts or nothing; do not invent durations, covers or progress.
- Lesson cover images exist at the Adventech API (`.../images/global/2026-04-cq/NN/cover.png`); use is not confirmed.

## Product Principles

1. Today first: opening the app should put today's lesson one tap from playing.
2. Offline is the normal case, not an edge case; state of each lesson (not downloaded, downloading, ready) is always
   visible.
3. The audio and the text are the product; the interface should recede while listening.
4. Honest about what exists: a lesson without audio says so instead of faking a player.
