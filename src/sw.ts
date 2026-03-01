/// <reference lib="WebWorker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute((self as any).__WB_MANIFEST ?? []);

// ── Persistance du dernier repas via CacheStorage ─────────────────────────────
const META_CACHE = 'carbtracker-meta-v1';
const LAST_MEAL_KEY = '/carbtracker/last-meal-time';

async function getLastMealTime(): Promise<number> {
  const cache = await caches.open(META_CACHE);
  const res = await cache.match(LAST_MEAL_KEY);
  if (!res) return 0;
  return parseInt(await res.text(), 10) || 0;
}

async function setLastMealTime(timestamp: number): Promise<void> {
  const cache = await caches.open(META_CACHE);
  await cache.put(LAST_MEAL_KEY, new Response(String(timestamp)));
}

// ── Messages depuis l'app ─────────────────────────────────────────────────────
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'MEAL_SAVED') {
    event.waitUntil(setLastMealTime(event.data.timestamp as number));
  }
});

// ── Periodic Background Sync (Chrome Android installé) ───────────────────────
self.addEventListener('periodicsync', (event: Event) => {
  const e = event as Event & { tag: string; waitUntil: (p: Promise<unknown>) => void };
  if (e.tag === 'meal-reminder') {
    e.waitUntil(
      getLastMealTime().then(last => {
        const elapsed = Date.now() - last;
        const fourHours = 4 * 60 * 60 * 1000;
        if (last > 0 && elapsed > fourHours) {
          return self.registration.showNotification('CarbTracker', {
            body: '⏰ Pas de repas enregistré depuis 4h. Pensez à noter votre prochain repas !',
            icon: '/icon.svg',
            badge: '/icon.svg',
            tag: 'meal-reminder',
          });
        }
      }),
    );
  }
});

// ── Clic sur notification → ouvre l'app ──────────────────────────────────────
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  event.waitUntil(
    (self as any).clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList: WindowClient[]) => {
        if (clientList.length > 0) return clientList[0].focus();
        return (self as any).clients.openWindow('/');
      }),
  );
});
