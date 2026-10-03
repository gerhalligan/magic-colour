const s = (body, vb = '0 0 48 48') => `<svg viewBox="${vb}" width="1em" height="1em" aria-hidden="true" focusable="false">${body}</svg>`;
const st = 'fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"';
export const I = {
  home: s(`<path ${st} d="M8 24 24 9l16 15M13 21v18h22V21"/><path ${st} d="M20 39V28h8v11"/>`),
  wand: s(`<path ${st} d="M10 38 30 18"/><path fill="currentColor" d="M33 6l2.4 5.6L41 14l-5.6 2.4L33 22l-2.4-5.6L25 14l5.6-2.4z"/><path fill="currentColor" d="M14 8l1.3 3 3 1.3-3 1.3L14 16.6l-1.3-3-3-1.3 3-1.3zM38 28l1.1 2.5 2.5 1.1-2.5 1.1L38 35.2l-1.1-2.5-2.5-1.1 2.5-1.1z"/>`),
  finger: s(`<path ${st} d="M19 24V11a3.5 3.5 0 0 1 7 0v12l9 2.2c2.4.6 3.9 2.8 3.5 5.2L37 40H21L12 30.5c-1.2-1.3-1-3.2.4-4.2 1.3-1 3-.8 4.2.4L19 29"/><path ${st} d="M10 9a10 10 0 0 1 4-4M38 9a10 10 0 0 0-4-4"/>`),
  undo: s(`<path ${st} d="M16 14 8 22l8 8"/><path ${st} d="M9 22h19a9 9 0 0 1 0 18h-8"/>`),
  bulb: s(`<path ${st} d="M17 33c0-4-5-6-5-12a12 12 0 0 1 24 0c0 6-5 8-5 12z"/><path ${st} d="M18 40h12M20 44h8"/>`),
  sound: s(`<path fill="currentColor" d="M6 18h8l10-8v28l-10-8H6z"/><path ${st} d="M30 16a11 11 0 0 1 0 16M35 11a18 18 0 0 1 0 26"/>`),
  mute: s(`<path fill="currentColor" d="M6 18h8l10-8v28l-10-8H6z"/><path ${st} d="m31 18 10 12M41 18 31 30"/>`),
  plus: s(`<path ${st} d="M24 10v28M10 24h28"/>`),
  minus: s(`<path ${st} d="M10 24h28"/>`),
  fit: s(`<path ${st} d="M8 17V8h9M31 8h9v9M40 31v9h-9M17 40H8v-9"/>`),
  gallery: s(`<rect ${st} x="7" y="9" width="34" height="30" rx="5"/><path fill="currentColor" d="m24 15 2.7 5.6 6 .8-4.4 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6-4.4-4.2 6-.8z"/>`),
  tick: s(`<path ${st} stroke-width="6" d="m10 25 9 9 19-20"/>`),
  save: s(`<path ${st} d="M24 8v22M14 22l10 10 10-10M9 38h30"/>`),
  share: s(`<circle cx="12" cy="24" r="5" fill="currentColor"/><circle cx="35" cy="12" r="5" fill="currentColor"/><circle cx="35" cy="36" r="5" fill="currentColor"/><path ${st} stroke-width="3" d="m16 22 15-8M16 26l15 8"/>`),
  next: s(`<path ${st} d="M10 24h26M26 13l11 11-11 11"/>`),
  dice: s(`<rect ${st} x="8" y="8" width="32" height="32" rx="7"/><circle cx="17" cy="17" r="3" fill="currentColor"/><circle cx="31" cy="17" r="3" fill="currentColor"/><circle cx="24" cy="24" r="3" fill="currentColor"/><circle cx="17" cy="31" r="3" fill="currentColor"/><circle cx="31" cy="31" r="3" fill="currentColor"/>`),
  again: s(`<path ${st} d="M38 24a14 14 0 1 1-4.5-10.3"/><path ${st} d="M36 7v8h-8"/>`),
  close: s(`<path ${st} d="m12 12 24 24M36 12 12 36"/>`),
  star: s(`<path fill="currentColor" d="m24 5 5.8 12 13.2 1.8-9.6 9.2 2.3 13L24 34.8 12.3 41l2.3-13L5 18.8 18.2 17z"/>`),
};
export const CAT = { all: ['\u{1F308}', 'All'], animals: ['\u{1F43E}', 'Animals'], unicorns: ['\u{1F984}', 'Unicorns'], dinosaurs: ['\u{1F995}', 'Dinosaurs'], vehicles: ['\u{1F697}', 'Vehicles'], space: ['\u{1F680}', 'Space'], fantasy: ['\u{1F3F0}', 'Fantasy'], food: ['\u{1F370}', 'Food'], nature: ['\u{1F338}', 'Nature'] };
export const DIFF = { easy: 1, medium: 2, hard: 3 };
