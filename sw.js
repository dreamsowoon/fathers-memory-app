/* 오늘의 추억 — 서비스워커 (오프라인에서도 앱이 열리도록 캐시) */
const CACHE = 'todays-memory-v1';
const ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', (e)=>{
  const req = e.request;
  // 지도/주소 변환 같은 외부 요청은 항상 네트워크로
  if(req.url.includes('nominatim')) return;
  // 앱 파일은 캐시 우선, 없으면 네트워크
  e.respondWith(
    caches.match(req).then(hit=> hit || fetch(req).then(res=>{
      if(req.method==='GET' && res.ok && req.url.startsWith(self.location.origin)){
        const copy = res.clone();
        caches.open(CACHE).then(c=>c.put(req, copy));
      }
      return res;
    }).catch(()=> caches.match('./index.html')))
  );
});
