---
name: La Guía en audio
description: A day of the Guía de Estudio as a printed page you can also hear, under one saturated week colour.
colors:
  hue-teal: "#0e6a64"
  hue-brick: "#a83f2b"
  hue-plum: "#6a3a5e"
  hue-ink-blue: "#25497c"
  hue-olive: "#566a2c"
  hue-ochre: "#8a5b10"
  hue-pine: "#2e5e44"
  paper: "#f3eee4"
  paper-raised: "#fbf8f1"
  ink: "#1f1c17"
  ink-soft: "#5b544a"
  rule: "#d9d0bf"
  on-band: "#fff7e8"
  cream: "#fbf4e4"
  paper-night: "#17130f"
  paper-raised-night: "#211c16"
  ink-night: "#ece3d0"
  ink-soft-night: "#b4a994"
  rule-night: "#3a322a"
  on-band-night: "#f4ead6"
  cream-night: "#e9dfca"
  band-shade: "#0b0906"
typography:
  display:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3.25rem"
    fontWeight: 780
    lineHeight: 0.96
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 680
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1
  body:
    fontFamily: "Literata, Georgia, Times New Roman, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.72
  label:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.01em"
  caption:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1
rounded:
  sm: "8px"
  md: "14px"
  tab: "12px"
  pill: "999px"
spacing:
  s-1: "4px"
  s-2: "8px"
  s-3: "12px"
  s-4: "16px"
  s-5: "24px"
  s-6: "32px"
  s-7: "48px"
components:
  play-pill:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.pill}"
    height: "56px"
    padding: "0 24px 0 16px"
  play-pill-hover:
    backgroundColor: "#ffffff"
  guide-tab:
    backgroundColor: "{colors.hue-teal}"
    textColor: "{colors.on-band}"
    typography: "{typography.title}"
    rounded: "{rounded.tab}"
    height: "60px"
  guide-tab-selected:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  section-heading:
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
  reading-segment:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "2.4px 8px"
  question-box:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "16px"
  player-bar:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    padding: "8px 16px"
  player-play:
    backgroundColor: "{colors.hue-teal}"
    textColor: "{colors.on-band}"
    rounded: "{rounded.pill}"
    size: "56px"
  speed-chip:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "40px"
  speed-chip-pressed:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  week-number-tile:
    backgroundColor: "{colors.hue-teal}"
    textColor: "{colors.on-band}"
    rounded: "10px"
    size: "52px"
  button-solid:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "44px"
    padding: "0 16px"
---

# Design System: La Guía en audio

## Overview

**Creative North Star: "La Guía de Estudio, a todo color"**

A day of the Guía is a printed page you can also hear. The page is warm printing paper set in Literata; the audio lives inside it, so the player is a quiet bar at the foot and the text itself lights up as it is read. The system refuses the album-art music player: no cover art, no vinyl, no waveform, no dark media chrome.

One saturated week colour floods the title band edge to edge and then recedes into small marks (list squares, the scrubber fill, the highlight tint). Seven day tabs hang from the band like guide dividers; the selected one fuses to the page. A listened day is "stamped", not ticked. Night is the same page on warm dark paper with the week colour dimmed.

Mode is Operate/Read: reading comfort and one obvious action (Escuchar) outrank decoration.

**Key Characteristics:**
- Colour is carried by data (the week), not by chrome: the band changes hue every week, the rest is paper and ink.
- Flat, tonal depth; a hairline rule is the main separator.
- Two faces with strict roles: Bricolage Grotesque names and operates, Literata is the text that is read and heard.
- Pill for actions, soft 8/14px corners for content, 12px-topped tabs for dividers.

## Colors

Restrained-with-one-flood: warm neutral paper and ink everywhere, plus a single saturated week colour at full strength only in the band (and week tiles).

### Primary
- **Week Hue** (`--hue`, one of the seven ring colours below): the band fill, the player play button, scrubber fill, list bullets, active-segment tint and outline, week tiles. Exactly one hue is live per screen, set by `data-hue` on the week.
- **Teal** (hue-teal), **Brick** (hue-brick), **Plum** (hue-plum), **Ink Blue** (hue-ink-blue), **Olive** (hue-olive), **Ochre** (hue-ochre), **Pine** (hue-pine): the ring of seven, indexed 0 to 6. Teal is the default.

### Neutral
- **Day Paper** (paper) and **Raised Paper** (paper-raised): page ground, and the lifted surface for the player, question box and popover.
- **Ink** (ink) and **Soft Ink** (ink-soft): text, the heavy section rule, selected-tab text; Soft Ink for verses, notes, meta.
- **Paper Rule** (rule): hairlines, ruled answer lines, scrubber track.
- **Cream** (cream) and **On-band cream** (on-band): the Escuchar pill, and all text and marks sitting on the band.
- **Night set** (paper-night, paper-raised-night, ink-night, ink-soft-night, rule-night, on-band-night, cream-night): the dark-paper counterparts, same roles. Band shade (band-shade) is the near-black the week hue is mixed toward.

### Named Rules
**The One Flood Rule.** One week colour fills the band edge to edge and nowhere else at full strength; below the band it appears only as small marks or as a tint of paper.

**The Night Dimming Rule.** In dark mode the band is the week hue mixed 66% toward band-shade (`--band-mix`); light mode is 100%. Marks that sit on dark paper (play-pill icon, done mark, list bullets, done progress) are lightened with a mix toward ink instead of using the raw hue.

**The Hue-By-Lesson Rule.** Week colour is a data rule: lesson number modulo 7 selects the hue. It is not a design choice per screen; do not hand-pick a hue for a surface.

**The Contrast-Audited Ring Rule.** Every ring hue was audited numerically against on-band cream at 4.5:1 or better (research/contrast.mjs); the dark 66% band mix was audited the same way. A new hue or a changed mix must pass the same script.

Build carry (not a rule): in light mode this week's hue is ink blue, so the active-segment fill reads as a cool tint; that follows from the data, not from a decision.

## Typography

**Display Font:** Bricolage Grotesque (with ui-sans-serif, system-ui)
**Body Font:** Literata (with Georgia, Times New Roman)
**Label Font:** Bricolage Grotesque

**Character:** A characterful grotesque for titles and operations set against a sturdy text serif for the page being read. Both are variable fonts, self-hosted as woff2, `font-display: swap`.

### Hierarchy
- **Display** (780, 3.25rem/52px mobile, 4.75rem at 960px+, 0.96, -0.03em): the day title in the band only, balanced wrap.
- **Headline** (680, 1.5rem, 1.15, -0.015em): section headings in the text; weeks-list title and state headings use 700 at the same size.
- **Title** (700, 1.25rem, 1): tab letters and the Escuchar pill label.
- **Body** (Literata 400, 1.0625rem times `--read-scale`, 1.72): reading text, list items, verses (italic, Soft Ink); questions at weight 500 and 1.6. Column max 42 to 44rem.
- **Label** (600, 0.9375rem, 0.01em): top bar, buttons, chips, field labels, menu items.
- **Caption** (500 to 600, 0.8125rem): tab dates, meta, notes, footnote.

Scale is fixed rem steps (xs 0.8125, sm 0.9375, md 1.0625, lg 1.25, xl 1.5, display 3.25), ratio about 1.2; only display changes at the desktop breakpoint. Body size is user-scalable through `--read-scale`.

### Named Rules
**The Two Voices Rule.** Literata is only for text that is read and heard (and highlighted); Bricolage is for everything that names or operates. Never set interface labels in the serif or lesson text in the grotesque.

**The No-Uppercase Rule.** Labels are sentence case at normal tracking; hierarchy comes from weight and size, not caps or letterspacing.

## Layout

Mobile first at 390px: one column. Top to bottom: the band (top bar 56px, display title, lesson and date lines, 56px Escuchar pill), seven guide tabs fused to the band's bottom edge, a hairline tools row, then the page (max 44rem, 16px gutters), with the fixed player reserving `--player-h` (7.25rem) at the bottom. The band is cut to about 41% of the first viewport so the text starts early.

At 960px and up: a 22rem sticky weeks list on the left (right hairline), the column on the right; band and tabs capped at 60rem, text at 42rem, left-aligned with a 32px inset; player offset by the sidebar. The undone state on desktop has no counterweight to the band on the right (open item).

Spacing is a 4/8/12/16/24/32/48px scale (s-1 to s-7). Section headings open with 32px above and 16px below. Touch targets are at least 44px (icon buttons 44px, player icons 46px, play 56px). The mobile tools row has almost no slack at 390px (build carry).

## Elevation & Depth

Tonal and flat. Depth comes from paper versus raised paper, 1px rules, and the band's flood; shadows are rare and structural.

### Shadow Vocabulary
- **Pill lift** (`box-shadow: 0 2px 0 rgb(0 0 0 / 0.18), 0 6px 14px rgb(0 0 0 / 0.16)`): the cream Escuchar pill only, pressed state drops to a 1px edge.
- **Player lift** (`box-shadow: 0 -8px 24px rgb(0 0 0 / 0.06)`): faint, on the fixed player.
- **Popover** (`box-shadow: 0 14px 40px rgb(0 0 0 / 0.22)`): settings and speed popovers.

### Named Rules
**The Paper Stays Flat Rule.** Reading content (segments, headings, the question box) has no shadow; "you are here" is shown by tint plus a 1.5px inset outline, never a side stripe or a lift.

## Shapes

Three radii and a pill. 8px (`rounded.sm`) for text segments and menu rows; 14px (`rounded.md`) for the question box, popovers, toast and week rows; 12px top corners only for guide tabs (bottom square, so they fuse to the page); 999px for every action (pills, chips, icon buttons, segmented control); 10px week-number tiles. Section headings stay square with a 3px ink rule above them, flat with square ends. Week-without-audio tiles keep their colour as a 2px outline; empty tabs use a dashed border.

The "escuchado" mark is an ink stamp: a double-ruled rectangle with the word, rotated -6 degrees, set beside the Escuchar pill (a flat SVG with a turbulence filter, accepted as a build detail, not a material system). In a tab it shrinks to a ring with a check.

## Components

### Escuchar pill
Cream pill, 56px, Title type, week-hue play icon (lightened in night), with a small duration or "desde" resume time. Hover goes to white; disabled becomes transparent with a 1.5px dashed cream outline and "Sin audio todavía".

### Guide tabs
Seven equal columns, 3px gap, 60px tall (68px desktop), 12px top corners. Letter in Title type over a caption date; unselected tabs are cream on the band with a 14% cream wash on hover; selected is paper-coloured with ink text and a faint cream border. A dot marks today, the stamp ring marks listened, a three-bar equaliser marks now playing.

### Reading page
Segments are tap-to-seek, with the active one tinted (11% week hue over paper, 34% in night) and outlined at 1.5px. Lists use a small 6px week-colour square bullet. Verses are italic Soft Ink. The question box is raised paper with a 14px corner and ruled answer lines. The "Preguntas" heading and the question box highlight together only in some timings (open item).

### Player
Fixed raised-paper bar with a hairline top: title and time on one row, scrubber (4px track, week-hue fill, 16px ink thumb), then controls with a 56px week-hue round play button and pill speed chips (pressed = ink fill, paper text).

### Weeks list
Rows of a 52px week-colour tile with the lesson number, a name, meta, and a segmented bar of 4px day pips (ready tinted, done full). Hover underlines the name; only the current week gets a filled row.

### Buttons and menus
Solid pill (ink fill, paper text, 44px) for state actions; text buttons are underlined 600 labels with a hover wash; the segmented control and menus use the ink-filled pressed state.

## Do's and Don'ts

### Do:
- **Do** let the week colour flood the band edge to edge and appear below it only as small marks or a paper tint.
- **Do** set lesson text in Literata and everything operable in Bricolage Grotesque.
- **Do** keep reading surfaces flat; show the spoken position with the tinted, outlined segment.
- **Do** use pills for actions, 8/14px corners for content, and a 3px ink rule to open each section.
- **Do** dim the band to the 66% mix in night and lighten dark-paper marks toward ink.
- **Do** run any new hue or band mix through research/contrast.mjs (4.5:1 against on-band).

### Don't:
- **Don't** build an album-art, cover-image, or dark media-player surface; the audio belongs inside the page.
- **Don't** use side-stripe borders or box shadows on reading content to mark state.
- **Don't** show more than one week colour per screen or pick a hue by hand; the lesson number decides.
- **Don't** use uppercase, tracked labels in the interface.
- **Don't** treat the stamp's turbulence filter or the cool active fill in an ink-blue week as house rules; they are carries of this build.
