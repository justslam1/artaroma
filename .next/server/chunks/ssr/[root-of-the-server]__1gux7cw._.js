module.exports=[89578,a=>{a.v({className:"geist_a71539c9-module__T19VSG__className",variable:"geist_a71539c9-module__T19VSG__variable"})},35214,a=>{a.v({className:"geist_mono_8d43a2aa-module__8Li5zG__className",variable:"geist_mono_8d43a2aa-module__8Li5zG__variable"})},27572,a=>{"use strict";var b=a.i(7997),c=a.i(89578);let d={className:c.default.className,style:{fontFamily:"'Geist', 'Geist Fallback'",fontStyle:"normal"}};null!=c.default.variable&&(d.variable=c.default.variable);var e=a.i(35214);let f={className:e.default.className,style:{fontFamily:"'Geist Mono', 'Geist Mono Fallback'",fontStyle:"normal"}};null!=e.default.variable&&(f.variable=e.default.variable),a.s(["default",0,function({children:a}){return(0,b.jsxs)("html",{lang:"id",className:`${d.variable} ${f.variable} h-full antialiased`,children:[(0,b.jsx)("head",{children:(0,b.jsx)("script",{dangerouslySetInnerHTML:{__html:`
              (function() {
                var isNavigating = false;
                window.__targetHref = '';

                document.addEventListener('click', function(e) {
                  var el = e.target;
                  while (el && el.tagName !== 'A') {
                    el = el.parentElement;
                  }
                  if (el && el.tagName === 'A' && el.href) {
                    try {
                      var url = new URL(el.href, window.location.origin);
                      if (url.origin === window.location.origin && !el.target && !el.hasAttribute('download')) {
                        window.__targetHref = url.href;
                      }
                    } catch(err) {}
                  }
                }, true);

                function recover(msg) {
                  if (isNavigating) return;
                  if (/ChunkLoadError|Loading chunk|Failed to load chunk|Failed to fetch|NetworkError|404/i.test(msg || '')) {
                    isNavigating = true;
                    console.warn('[Artaroma] Chunk failure detected. Navigating directly to fresh page...');
                    var dest = window.__targetHref || window.location.href;
                    window.location.href = dest;
                  }
                }

                window.addEventListener('error', function(e) {
                  recover(e.message || (e.error && e.error.message));
                });
                window.addEventListener('unhandledrejection', function(e) {
                  var r = e.reason;
                  recover(r ? (r.message || r.toString()) : '');
                });
              })();
            `}})}),(0,b.jsx)("body",{className:"min-h-full flex flex-col bg-[#f5f7fa] text-slate-800",children:a})]})},"metadata",0,{title:"Artaroma",description:"Sistem Manajemen Grosir Bibit Parfum B2B — FEFO Batch Inventory, Precision Kg Order, Credit Limit Lock & Digital Proof of Delivery",icons:{icon:[{url:"/favicon.ico",sizes:"32x32",type:"image/x-icon"},{url:"/favicon-32x32.png",sizes:"32x32",type:"image/png"},{url:"/favicon-16x16.png",sizes:"16x16",type:"image/png"}],apple:[{url:"/apple-touch-icon.png",sizes:"180x180",type:"image/png"}]}}],27572)},50645,function(a){a.n(a.i(27572))}];

//# sourceMappingURL=%5Broot-of-the-server%5D__1gux7cw._.js.map