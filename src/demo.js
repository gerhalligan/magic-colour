// Demo mode: off by default. Built only with MC_DEMO=1 (npm run build:demo) for the free demo on games.mikai.ai.
/* global __MC_DEMO__ */
export const DEMO = typeof __MC_DEMO__ !== 'undefined' && __MC_DEMO__ === true;
// two pictures from each picture type: Shapes and Grid
export const DEMO_IDS = ['happy-fish', 'unicorn-pal', 'grid-butterfly', 'grid-heart'];
export const PLAY_URL = 'https://play.google.com/store/apps/details?id=ai.mikai.games.magiccolour';
export function demoBlock() {
  return '<div class="demo-cta" style="margin:12px 0 4px;padding:14px;border-radius:18px;background:#eefaf4;text-align:center">'
    + '<p style="margin:0 0 10px;font-weight:600">This is the free demo. Get the full app for over 100 pictures, no ads.</p>'
    + '<a class="demo-play" target="_blank" rel="noopener" style="display:inline-block;background:#01875f;color:#fff;text-decoration:none;font-weight:700;border-radius:999px;padding:12px 18px">Get the full app on Google Play</a></div>';
}
export function wireDemo(el) { for (const a of el.querySelectorAll('a.demo-play')) a.href = PLAY_URL; }
