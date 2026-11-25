// One icon family: 24px grid, 1.75 stroke, round caps. Filled shapes only for play/pause.
const svg = (body, extra = "") =>
  `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${body}</svg>`;

export const icons = {
  play: svg('<path d="M8 5.2v13.6a.6.6 0 0 0 .92.5l10.6-6.8a.6.6 0 0 0 0-1L8.92 4.7A.6.6 0 0 0 8 5.2z" fill="currentColor"/>'),
  pause: svg('<rect x="6.5" y="5" width="3.8" height="14" rx="1" fill="currentColor"/><rect x="13.7" y="5" width="3.8" height="14" rx="1" fill="currentColor"/>'),
  back15: svg('<path d="M4.5 5.5v4h4"/><path d="M5 9.2A8 8 0 1 1 4.2 13"/><text x="12" y="15.2" text-anchor="middle" font-size="7.4" font-weight="700" fill="currentColor" stroke="none" font-family="Bricolage Grotesque, system-ui, sans-serif">15</text>'),
  fwd15: svg('<path d="M19.5 5.5v4h-4"/><path d="M19 9.2A8 8 0 1 0 19.8 13"/><text x="12" y="15.2" text-anchor="middle" font-size="7.4" font-weight="700" fill="currentColor" stroke="none" font-family="Bricolage Grotesque, system-ui, sans-serif">15</text>'),
  moon: svg('<path d="M20 14.2A8 8 0 1 1 9.8 4a6.4 6.4 0 0 0 10.2 10.2z"/>'),
  check: svg('<path d="M5 12.8l4.4 4.4L19 7.4"/>'),
  download: svg('<path d="M12 4v11"/><path d="M7.5 10.8L12 15.3l4.5-4.5"/><path d="M5 19.5h14"/>'),
  saved: svg('<circle cx="12" cy="12" r="8.2"/><path d="M8.4 12.3l2.5 2.5 4.7-5"/>'),
  sliders: svg('<path d="M4 7h9"/><path d="M17 7h3"/><circle cx="15" cy="7" r="2"/><path d="M4 17h3"/><path d="M11 17h9"/><circle cx="9" cy="17" r="2"/>'),
  weeks: svg('<rect x="4" y="4.5" width="16" height="4" rx="1.2"/><rect x="4" y="10" width="16" height="4" rx="1.2"/><rect x="4" y="15.5" width="16" height="4" rx="1.2"/>'),
  close: svg('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
  alert: svg('<path d="M12 4.5l8.3 14.5H3.7L12 4.5z"/><path d="M12 10v4"/><path d="M12 16.8v.01"/>'),
};

/** Small stamp in a day tab: a ring with a check. */
export const stampMark = () =>
  `<svg class="tab__mark tab__mark--done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M7.8 12.4l3 3 5.4-6"/></svg>`;

/**
 * The page-scale ink stamp: a double-ruled rectangle with the word, set beside the play button.
 * A small turbulence filter roughens the edges so it reads as pressed ink, not clean vector.
 */
export const bigStamp = (fresh) =>
  `<svg class="hero__stamp${fresh ? " stamp-in" : ""}" viewBox="0 0 120 64" fill="none" stroke="currentColor" role="img" aria-label="Escuchado"><defs><filter id="ink" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.6"/></filter></defs><g filter="url(#ink)"><rect x="3" y="3" width="114" height="58" rx="5" stroke-width="3"/><rect x="9" y="9" width="102" height="46" rx="2" stroke-width="1.2"/><text x="60" y="39.5" text-anchor="middle" font-size="17" font-weight="800" letter-spacing="1" fill="currentColor" stroke="none" font-family="Bricolage Grotesque, system-ui, sans-serif">ESCUCHADO</text></g></svg>`;
