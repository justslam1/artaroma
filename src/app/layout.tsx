import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeInit } from "@/components/common/theme-init";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Artaroma",
  description: "Sistem Manajemen Grosir Bibit Parfum B2B — FEFO Batch Inventory, Precision Kg Order, Credit Limit Lock & Digital Proof of Delivery",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
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
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-[#f5f7fa] text-slate-800"
      >
        <ThemeInit />
        {children}
      </body>
    </html>
  );
}
