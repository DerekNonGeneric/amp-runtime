(function(){self.addEventListener("install",function(a){a.waitUntil(self.skipWaiting())});self.addEventListener("activate",function(a){var b=clients.claim().then(function(){return caches.delete("cdn-js")}).then(function(){return new Promise(function(a,b){var c=indexedDB.deleteDatabase("cdn-js");c.onsuccess=a;c.onerror=b})});a.waitUntil(b)});})();
//# sourceMappingURL=sw-kill.js.map

