/* 오늘의 추억 — 서비스워커
   화면(HTML)은 항상 최신을 먼저 받고(network-first),
   인터넷이 없을 때만 저장해둔 화면을 보여줌. 사진/아이콘 등은 캐시 우선. */
const CACHE = 'todays-memory-v3';
const ASSETS = ['./', './index.html', './manifest.json',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))   // 옛 캐시(v1) 삭제
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', (e)=>{
  const req = e.request;
  if(req.method !== 'GET') return;
  // 지도/주소 변환 등 외부 요청은 항상 네트워크로
  if(!req.url.startsWith(self.location.origin)) return;

  const isHTML = req.mode === 'navigate' ||
                 req.destination === 'document' ||
                 req.url.endsWith('.html') || req.url.endsWith('/');

  if(isHTML){
    // network-first: 최신 화면을 먼저, 실패하면 저장본
    e.respondWith(
      fetch(req).then(res=>{
        const copy = res.clone();
        caches.open(CACHE).then(c=>c.put(req, copy));
        return res;
      }).catch(()=> caches.match(req).then(h=> h || caches.match('./index.html')))
    );
  }else{
    // 그 외(아이콘 등): 캐시 우선 + 백그라운드 갱신
    e.respondWith(
      caches.match(req).then(hit=>{
        const net = fetch(req).then(res=>{
          if(res.ok){ const copy=res.clone(); caches.open(CACHE).then(c=>c.put(req,copy)); }
          return res;
        }).catch(()=>hit);
        return hit || net;
      })
    );
  }
});
