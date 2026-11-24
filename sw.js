/* Finanças — service worker
   Página e arquivos do app: tenta a rede primeiro (para pegar atualizações) e usa o cache sem internet.
   Fontes e biblioteca do Firebase: usa o cache e atualiza em segundo plano.
   A sincronização com o Firestore nunca passa pelo cache. */
const CACHE='financas-v24';
const APP=['./','index.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
const LIBS=['fonts.googleapis.com','fonts.gstatic.com','www.gstatic.com'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin===location.origin){
    e.respondWith(
      fetch(req).then(res=>{
        if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}
        return res;
      }).catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>r||(req.mode==='navigate'?caches.match('index.html'):Response.error())))
    );
    return;
  }
  if(LIBS.includes(url.hostname)&&(url.hostname!=='www.gstatic.com'||url.pathname.startsWith('/firebasejs/'))){
    e.respondWith(caches.open(CACHE).then(async c=>{
      const hit=await c.match(req);
      const net=fetch(req).then(res=>{if(res.ok||res.type==='opaque')c.put(req,res.clone());return res;}).catch(()=>hit);
      return hit||net;
    }));
  }
});
