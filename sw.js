/* 手順帳 Service Worker：アプリシェルをキャッシュして完全オフライン動作。
   ※ユーザーデータはIndexedDB（SWキャッシュとは別領域）に保存され、ここでは一切扱わない。
   更新時はCACHEのバージョンを上げる。 */
const CACHE = "tejun-cho-v6";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./fonts/roboto-mono-latin.woff2",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon-180.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))  // 1つ失敗しても他は入れる
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))) // 旧キャッシュ削除
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;                 // 書き込み系は素通し
  // ページ遷移は常にindex.htmlを返す（SPA的フォールバック・オフライン対応）
  if (req.mode === "navigate") {
    e.respondWith(
      caches.match("./index.html").then(r => r || fetch(req).catch(() => caches.match("./index.html")))
    );
    return;
  }
  // それ以外（アセット）はキャッシュ優先→無ければネット→取得できたらキャッシュ
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
