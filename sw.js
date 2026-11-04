// Retired: clear old Magic Colour caches and unregister, so returning visitors get the redirect page.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))).then(() => self.registration.unregister()).then(() => self.clients.matchAll()).then((cs) => cs.forEach((c) => c.navigate('https://games.mikai.ai/magic-colour/?from=web')))));
