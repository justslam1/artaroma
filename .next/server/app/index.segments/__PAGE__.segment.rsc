1:"$Sreact.fragment"
3:I[97367,["/_next/static/chunks/3kzd6dsw_2_0a.js"],"OutletBoundary"]
4:"$Sreact.suspense"
8:I[97367,["/_next/static/chunks/3kzd6dsw_2_0a.js"],"ViewportBoundary"]
9:I[97367,["/_next/static/chunks/3kzd6dsw_2_0a.js"],"MetadataBoundary"]
a:I[27201,["/_next/static/chunks/3kzd6dsw_2_0a.js"],"IconMark"]
:HL["/_next/static/chunks/233p45nuh4m5b.css","style"]
:HL["/_next/static/chunks/3qeg04rmkbk0j.css","style"]
7:X
c:Tb58,
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
            0:{"buildId":"2mzpPKgwrJiQGgrdpuegJ","data":[{"rsc":["$","$1","c",{"children":["$L2",null,["$","$L3",null,{"children":["$","$4",null,{"name":"Next.MetadataOutlet","children":"$@5"}]}]]}],"isPartial":"$@6","staleTime":"$7","varyParams":null},{"rsc":["$","$1","h",{"children":[null,["$","$L8",null,{"children":[["$","meta","0",{"charSet":"utf-8"}],["$","meta","1",{"name":"viewport","content":"width=device-width, initial-scale=1"}]]}],["$","div",null,{"hidden":true,"children":["$","$L9",null,{"children":["$","$4",null,{"name":"Next.Metadata","children":[["$","title","0",{"children":"Artaroma"}],["$","meta","1",{"name":"description","content":"Sistem Manajemen Grosir Bibit Parfum B2B — FEFO Batch Inventory, Precision Kg Order, Credit Limit Lock & Digital Proof of Delivery"}],["$","link","2",{"rel":"icon","href":"/favicon.ico","sizes":"32x32","type":"image/x-icon"}],["$","link","3",{"rel":"icon","href":"/favicon-32x32.png","sizes":"32x32","type":"image/png"}],["$","link","4",{"rel":"icon","href":"/favicon-16x16.png","sizes":"16x16","type":"image/png"}],["$","link","5",{"rel":"apple-touch-icon","href":"/apple-touch-icon.png","sizes":"180x180","type":"image/png"}],["$","$La","6",{}]]}]}]}],["$","meta",null,{"name":"next-size-adjust","content":""}]]}],"isPartial":"$@b","staleTime":"$7","varyParams":null},{"rsc":["$","$1","c",{"children":[[["$","link","0",{"rel":"stylesheet","href":"/_next/static/chunks/233p45nuh4m5b.css","precedence":"next"}],["$","link","1",{"rel":"stylesheet","href":"/_next/static/chunks/3qeg04rmkbk0j.css","precedence":"next"}],["$","script","script-0",{"src":"/_next/static/chunks/3kzd6dsw_2_0a.js","async":true}]],["$","html",null,{"lang":"id","className":"geist_a71539c9-module__T19VSG__variable geist_mono_8d43a2aa-module__8Li5zG__variable h-full antialiased","children":[["$","head",null,{"children":["$","script",null,{"dangerouslySetInnerHTML":{"__html":"$c"}}]}],"$Ld"]}]]}],"isPartial":"$@e","staleTime":"$7","varyParams":null}],"isUpgradeableISRFallback":false,"a":"$@f","rootVaryParams":null,"needsRuntimeRequest":"$@10"}
2:E{"digest":"NEXT_REDIRECT;replace;/login;307;"}
11:I[43040,["/_next/static/chunks/3kzd6dsw_2_0a.js"],"ThemeInit"]
12:I[39756,["/_next/static/chunks/3kzd6dsw_2_0a.js"],"default"]
13:I[58298,["/_next/static/chunks/3kzd6dsw_2_0a.js","/_next/static/chunks/3fo998uykftg9.js"],"default"]
14:I[37457,["/_next/static/chunks/3kzd6dsw_2_0a.js"],"default"]
5:null
d:["$","body",null,{"className":"min-h-full flex flex-col bg-[#f5f7fa] text-slate-800","children":[["$","$L11",null,{}],["$","$L12",null,{"parallelRouterKey":"children","error":"$13","errorStyles":[],"errorScripts":[["$","script","script-0",{"src":"/_next/static/chunks/3fo998uykftg9.js","async":true}]],"template":["$","$L14",null,{}],"notFound":[[["$","title",null,{"children":"404: This page could not be found."}],["$","div",null,{"style":{"fontFamily":"system-ui,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\"","height":"100vh","textAlign":"center","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center"},"children":["$","div",null,{"children":[["$","style",null,{"dangerouslySetInnerHTML":{"__html":"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}"}}],["$","h1",null,{"className":"next-error-h1","style":{"display":"inline-block","margin":"0 20px 0 0","padding":"0 23px 0 0","fontSize":24,"fontWeight":500,"verticalAlign":"top","lineHeight":"49px"},"children":404}],["$","div",null,{"style":{"display":"inline-block"},"children":["$","h2",null,{"style":{"fontSize":14,"fontWeight":400,"lineHeight":"49px","margin":0},"children":"This page could not be found."}]}]]}]}]],[]]}]]}]
7:300
10:true
7:C
f:0
b:"$undefined"
6:"$undefined"
e:"$undefined"
