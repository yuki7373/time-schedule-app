// ========= Time-Schedule App PWA Service Worker =========
// キャッシュのバージョン
const CACHE_VERSION = "v8";   // ← バージョンを変えると確実に更新される
const CACHE_NAME = `schedule-cache-${CACHE_VERSION}`;

const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon.png"
];

// インストール（新キャッシュ作成）
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES))
  );
  self.skipWaiting(); // 即時反映
});

// アクティベート（古いキャッシュ削除）
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// フェッチ（更新優先 → キャッシュフォールバック）
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 最新ファイルをキャッシュに入れ直す
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
