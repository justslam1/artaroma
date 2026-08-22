1:"$Sreact.fragment"
9:I[63491,["/_next/static/chunks/3o-3s29imyjs5.js","/_next/static/chunks/0-leeu10hla47.js"],"default"]
:HL["/_next/static/chunks/233p45nuh4m5b.css","style"]
:HL["/_next/static/chunks/0p0rwxuap824r.css","style"]
:HL["/_next/static/media/797e433ab948586e-s.p.0r6juujl39pe6.woff2","font",{"crossOrigin":"","type":"font/woff2"}]
:HL["/_next/static/media/caa3a2e1cccd8315-s.p.0wgildi0cnwt9.woff2","font",{"crossOrigin":"","type":"font/woff2"}]
2:Tb58,
              (function() {
                // Apply saved theme settings immediately to prevent FOUC
                try {
                  var raw = localStorage.getItem('artaroma_theme_settings_v1');
                  if (raw) {
                    var t = JSON.parse(raw);
                    var root = document.documentElement;
                    if (t.fontSize) root.setAttribute('data-font-size', t.fontSize);
                    if (t.tableDensity) root.setAttribute('data-density', t.tableDensity);
                    if (t.borderRadius) root.setAttribute('data-radius', t.borderRadius);
                    if (t.backgroundTone) root.setAttribute('data-bg-tone', t.backgroundTone);
                    if (t.primaryColor) root.style.setProperty('--artaroma-primary', t.primaryColor);
                    if (t.primaryHover) root.style.setProperty('--artaroma-primary-hover', t.primaryHover);
                    if (t.primaryLight) root.style.setProperty('--artaroma-primary-light', t.primaryLight);
                    if (t.primaryText) root.style.setProperty('--artaroma-primary-text', t.primaryText);
                    if (t.highContrast) root.classList.add('artaroma-high-contrast');
                  }
                } catch(e) {}

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
            7:X
0:{"P":null,"c":["","admin","sales-orders"],"q":"","i":false,"f":[[["",{"children":["admin",{"children":["sales-orders",{"children":["__PAGE__",{},"$undefined","$undefined",4608]},"$undefined","$undefined",4608]},"$undefined","$undefined",4608]},"$undefined","$undefined",4624],[["$","$1","c",{"children":[[["$","link","0",{"rel":"stylesheet","href":"/_next/static/chunks/233p45nuh4m5b.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}],["$","link","1",{"rel":"stylesheet","href":"/_next/static/chunks/0p0rwxuap824r.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}],["$","script","script-0",{"src":"/_next/static/chunks/3o-3s29imyjs5.js","async":true,"nonce":"$undefined"}]],["$","html",null,{"lang":"id","suppressHydrationWarning":true,"className":"geist_a71539c9-module__T19VSG__variable geist_mono_8d43a2aa-module__8Li5zG__variable h-full antialiased","children":[["$","head",null,{"children":["$","script",null,{"dangerouslySetInnerHTML":{"__html":"$2"}}]}],"$L3"]}]]}],{"children":["$L4",{"children":["$L5",{"children":["$L6",{},null,false,null]},null,false,"$7"]},null,false,"$7"]},null,false,null],"$L8",false]],"m":"$undefined","G":["$9",["$La","$Lb"]],"S":true,"h":null,"r":"$undefined","s":"$undefined","a":"$undefined","l":"$undefined","p":"$undefined","d":"$undefined","b":"J9aZ6ZGNMG5Z3nwLQA7kA"}
c:I[43040,["/_next/static/chunks/3o-3s29imyjs5.js"],"ThemeInit"]
d:I[39756,["/_next/static/chunks/3o-3s29imyjs5.js"],"default"]
e:I[58298,["/_next/static/chunks/3o-3s29imyjs5.js","/_next/static/chunks/3fo998uykftg9.js"],"default"]
f:I[37457,["/_next/static/chunks/3o-3s29imyjs5.js"],"default"]
10:I[47257,["/_next/static/chunks/3o-3s29imyjs5.js"],"ClientPageRoot"]
11:I[63955,["/_next/static/chunks/3o-3s29imyjs5.js","/_next/static/chunks/0agxifuzyzlsu.js","/_next/static/chunks/276yyx-azxfvi.js","/_next/static/chunks/3-84ymsjwqpn4.js"],"default"]
14:I[97367,["/_next/static/chunks/3o-3s29imyjs5.js"],"OutletBoundary"]
15:"$Sreact.suspense"
17:I[97367,["/_next/static/chunks/3o-3s29imyjs5.js"],"ViewportBoundary"]
19:I[97367,["/_next/static/chunks/3o-3s29imyjs5.js"],"MetadataBoundary"]
3:["$","body",null,{"suppressHydrationWarning":true,"className":"min-h-full flex flex-col bg-[#f5f7fa] text-slate-800","children":[["$","$Lc",null,{}],["$","$Ld",null,{"parallelRouterKey":"children","error":"$e","errorStyles":[],"errorScripts":[["$","script","script-0",{"src":"/_next/static/chunks/3fo998uykftg9.js","async":true}]],"template":["$","$Lf",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":[[["$","title",null,{"children":"404: This page could not be found."}],["$","div",null,{"style":{"fontFamily":"system-ui,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\"","height":"100vh","textAlign":"center","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center"},"children":["$","div",null,{"children":[["$","style",null,{"dangerouslySetInnerHTML":{"__html":"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}"}}],["$","h1",null,{"className":"next-error-h1","style":{"display":"inline-block","margin":"0 20px 0 0","padding":"0 23px 0 0","fontSize":24,"fontWeight":500,"verticalAlign":"top","lineHeight":"49px"},"children":404}],["$","div",null,{"style":{"display":"inline-block"},"children":["$","h2",null,{"style":{"fontSize":14,"fontWeight":400,"lineHeight":"49px","margin":0},"children":"This page could not be found."}]}]]}]}]],[]],"forbidden":"$undefined","unauthorized":"$undefined"}]]}]
4:["$","$1","c",{"children":[null,["$","$Ld",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$Lf",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":"$undefined","forbidden":"$undefined","unauthorized":"$undefined"}]]}]
5:["$","$1","c",{"children":[null,["$","$Ld",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$Lf",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":"$undefined","forbidden":"$undefined","unauthorized":"$undefined"}]]}]
6:["$","$1","c",{"children":[["$","$L10",null,{"Component":"$11","serverProvidedParams":{"searchParams":{},"params":{},"promises":["$@12","$@13"]}}],[["$","script","script-0",{"src":"/_next/static/chunks/0agxifuzyzlsu.js","async":true,"nonce":"$undefined"}],["$","script","script-1",{"src":"/_next/static/chunks/276yyx-azxfvi.js","async":true,"nonce":"$undefined"}],["$","script","script-2",{"src":"/_next/static/chunks/3-84ymsjwqpn4.js","async":true,"nonce":"$undefined"}]],["$","$L14",null,{"children":["$","$15",null,{"name":"Next.MetadataOutlet","children":"$@16"}]}]]}]
8:["$","$1","h",{"children":[null,["$","$L17",null,{"children":"$L18"}],["$","div",null,{"hidden":true,"children":["$","$L19",null,{"children":["$","$15",null,{"name":"Next.Metadata","children":"$L1a"}]}]}],["$","meta",null,{"name":"next-size-adjust","content":""}]]}]
a:["$","link","0",{"rel":"stylesheet","href":"/_next/static/chunks/233p45nuh4m5b.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}]
b:["$","link","1",{"rel":"stylesheet","href":"/_next/static/chunks/0p0rwxuap824r.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}]
7:C
12:{}
13:"$6:props:children:0:props:serverProvidedParams:params"
18:[["$","meta","0",{"charSet":"utf-8"}],["$","meta","1",{"name":"viewport","content":"width=device-width, initial-scale=1"}]]
1b:I[27201,["/_next/static/chunks/3o-3s29imyjs5.js"],"IconMark"]
16:null
1a:[["$","title","0",{"children":"Artaroma"}],["$","meta","1",{"name":"description","content":"Sistem Manajemen Grosir Bibit Parfum B2B — FEFO Batch Inventory, Precision Kg Order, Credit Limit Lock & Digital Proof of Delivery"}],["$","link","2",{"rel":"icon","href":"/favicon.ico","sizes":"32x32","type":"image/x-icon"}],["$","link","3",{"rel":"icon","href":"/favicon-32x32.png","sizes":"32x32","type":"image/png"}],["$","link","4",{"rel":"icon","href":"/favicon-16x16.png","sizes":"16x16","type":"image/png"}],["$","link","5",{"rel":"apple-touch-icon","href":"/apple-touch-icon.png","sizes":"180x180","type":"image/png"}],["$","$L1b","6",{}]]
