// Play-app gate (see README "Play-app gate"). The full game on its live host only runs inside the Google Play app (a TWA).
// Browser visitors are sent to the free demo page on games.mikai.ai. FAIL-OPEN: any doubt or any error = run the game.
// Only active on the public hosts, so local tests, file:// and the share copy are never affected.
(function () {
  try {
    var PKG = 'ai.mikai.games.magiccolour', KEY = 'mg_app_mc', DEV = 'hyz8xHOmjlQ_MgRbaamwI21l';
    var SEND = 'https://games.mikai.ai/magic-colour/?from=web';
    var h = location.hostname;
    if (!/(^|\.)games\.mikai\.ai$/.test(h) || h === 'games.mikai.ai') return;
    var ok = false, ref = document.referrer || '', q = '';
    try { q = new URLSearchParams(location.search).get('dev') || ''; } catch (e) { return; }
    if (ref.indexOf('android-app://') === 0) ok = true; // launched by an Android app (our TWA: android-app://' + PKG)
    if (q === DEV) ok = true; // our own testing bypass
    try { if (localStorage.getItem(KEY) === '1') ok = true; } catch (e) { return; } // storage blocked: fail open
    if (document.cookie.indexOf(KEY + '=1') >= 0) ok = true;
    try { if (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: minimal-ui)').matches) ok = true; } catch (e) { return; }
    if (ok) {
      try { localStorage.setItem(KEY, '1'); } catch (e) { /* ignore */ }
      try { document.cookie = KEY + '=1; Max-Age=315360000; Path=/; Secure; SameSite=Lax'; } catch (e) { /* ignore */ }
      return;
    }
    window.__MG_GATED = true;
    location.replace(SEND);
  } catch (e) { /* fail open */ }
})();
