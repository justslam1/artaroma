1:"$Sreact.fragment"
2:I[47257,["/_next/static/chunks/3o-3s29imyjs5.js"],"ClientPageRoot"]
3:I[35658,["/_next/static/chunks/3o-3s29imyjs5.js","/_next/static/chunks/3s95_42586aif.js","/_next/static/chunks/2s360-taww0o5.js"],"default"]
6:I[97367,["/_next/static/chunks/3o-3s29imyjs5.js"],"OutletBoundary"]
7:"$Sreact.suspense"
b:I[97367,["/_next/static/chunks/3o-3s29imyjs5.js"],"ViewportBoundary"]
c:I[97367,["/_next/static/chunks/3o-3s29imyjs5.js"],"MetadataBoundary"]
d:I[27201,["/_next/static/chunks/3o-3s29imyjs5.js"],"IconMark"]
f:I[39756,["/_next/static/chunks/3o-3s29imyjs5.js"],"default"]
10:I[37457,["/_next/static/chunks/3o-3s29imyjs5.js"],"default"]
:HL["/_next/static/chunks/233p45nuh4m5b.css","style"]
:HL["/_next/static/chunks/33t9co5d5neak.css","style"]
a:X
12:X
12:C
14:Tb58,
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
            0:{"buildId":"zIH3qf2i11JojMMh7GfGl","data":[{"rsc":["$","$1","c",{"children":[["$","$L2",null,{"Component":"$3","serverProvidedParams":{"searchParams":{},"params":{},"promises":["$@4","$@5"]}}],[["$","script","script-0",{"src":"/_next/static/chunks/3s95_42586aif.js","async":true}],["$","script","script-1",{"src":"/_next/static/chunks/2s360-taww0o5.js","async":true}]],["$","$L6",null,{"children":["$","$7",null,{"name":"Next.MetadataOutlet","children":"$@8"}]}]]}],"isPartial":"$@9","staleTime":"$a","varyParams":null},{"rsc":["$","$1","h",{"children":[null,["$","$Lb",null,{"children":[["$","meta","0",{"charSet":"utf-8"}],["$","meta","1",{"name":"viewport","content":"width=device-width, initial-scale=1"}]]}],["$","div",null,{"hidden":true,"children":["$","$Lc",null,{"children":["$","$7",null,{"name":"Next.Metadata","children":[["$","title","0",{"children":"Artaroma"}],["$","meta","1",{"name":"description","content":"Sistem Manajemen Grosir Bibit Parfum B2B — FEFO Batch Inventory, Precision Kg Order, Credit Limit Lock & Digital Proof of Delivery"}],["$","link","2",{"rel":"icon","href":"/favicon.ico","sizes":"32x32","type":"image/x-icon"}],["$","link","3",{"rel":"icon","href":"/favicon-32x32.png","sizes":"32x32","type":"image/png"}],["$","link","4",{"rel":"icon","href":"/favicon-16x16.png","sizes":"16x16","type":"image/png"}],["$","link","5",{"rel":"apple-touch-icon","href":"/apple-touch-icon.png","sizes":"180x180","type":"image/png"}],["$","$Ld","6",{}]]}]}]}],["$","meta",null,{"name":"next-size-adjust","content":""}]]}],"isPartial":"$@e","staleTime":"$a","varyParams":null},{"rsc":["$","$1","c",{"children":[null,["$","$Lf",null,{"parallelRouterKey":"children","template":["$","$L10",null,{}]}]]}],"isPartial":"$@11","staleTime":"$a","varyParams":"$12"},{"rsc":["$","$1","c",{"children":[null,["$","$Lf",null,{"parallelRouterKey":"children","template":["$","$L10",null,{}]}]]}],"isPartial":"$@13","staleTime":"$a","varyParams":"$12"},{"rsc":["$","$1","c",{"children":[[["$","link","0",{"rel":"stylesheet","href":"/_next/static/chunks/233p45nuh4m5b.css","precedence":"next"}],["$","link","1",{"rel":"stylesheet","href":"/_next/static/chunks/33t9co5d5neak.css","precedence":"next"}],["$","script","script-0",{"src":"/_next/static/chunks/3o-3s29imyjs5.js","async":true}]],["$","html",null,{"lang":"id","suppressHydrationWarning":true,"className":"geist_a71539c9-module__T19VSG__variable geist_mono_8d43a2aa-module__8Li5zG__variable h-full antialiased","children":[["$","head",null,{"children":["$","script",null,{"dangerouslySetInnerHTML":{"__html":"$14"}}]}],"$L15"]}]]}],"isPartial":"$@16","staleTime":"$a","varyParams":null}],"isUpgradeableISRFallback":false,"a":"$@17","rootVaryParams":null,"needsRuntimeRequest":"$@18"}
19:I[43040,["/_next/static/chunks/3o-3s29imyjs5.js"],"ThemeInit"]
1a:I[58298,["/_next/static/chunks/3o-3s29imyjs5.js","/_next/static/chunks/3fo998uykftg9.js"],"default"]
4:{}
5:"$0:data:0:rsc:props:children:0:props:serverProvidedParams:params"
8:null
15:["$","body",null,{"suppressHydrationWarning":true,"className":"min-h-full flex flex-col bg-[#f5f7fa] text-slate-800","children":[["$","$L19",null,{}],["$","$Lf",null,{"parallelRouterKey":"children","error":"$1a","errorStyles":[],"errorScripts":[["$","script","script-0",{"src":"/_next/static/chunks/3fo998uykftg9.js","async":true}]],"template":["$","$L10",null,{}],"notFound":[[["$","title",null,{"children":"404: This page could not be found."}],["$","div",null,{"style":{"fontFamily":"system-ui,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\"","height":"100vh","textAlign":"center","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center"},"children":["$","div",null,{"children":[["$","style",null,{"dangerouslySetInnerHTML":{"__html":"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}"}}],["$","h1",null,{"className":"next-error-h1","style":{"display":"inline-block","margin":"0 20px 0 0","padding":"0 23px 0 0","fontSize":24,"fontWeight":500,"verticalAlign":"top","lineHeight":"49px"},"children":404}],["$","div",null,{"style":{"display":"inline-block"},"children":["$","h2",null,{"style":{"fontSize":14,"fontWeight":400,"lineHeight":"49px","margin":0},"children":"This page could not be found."}]}]]}]}]],[]]}]]}]
a:300
18:true
a:C
17:0
e:"$undefined"
11:"$undefined"
13:"$undefined"
9:"$undefined"
16:"$undefined"
