self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('schedule-cache-v1').then(cache => {
            return cache.addAll([
                './',
                './index.html',
                './style.css',
                './app.js',
                './manifest.json',
                './icon.png'
            ]);
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(res => {
            return res || fetch(event.request);
        })
    );
});
