import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var isReloading = false;
                function handleChunkError(msg) {
                  if (isReloading) return;
                  if (/ChunkLoadError|Loading chunk|Failed to load chunk|Failed to fetch/i.test(msg || '')) {
                    isReloading = true;
                    console.warn('[Artaroma] Outdated bundle chunk detected. Auto-reloading fresh assets...');
                    try {
                      sessionStorage.setItem('artaroma_chunk_reload', Date.now().toString());
                    } catch(e) {}
                    window.location.reload();
                  }
                }
                window.addEventListener('error', function(e) {
                  handleChunkError(e.message || (e.error && e.error.message));
                });
                window.addEventListener('unhandledrejection', function(e) {
                  var reason = e.reason;
                  var msg = reason ? (reason.message || reason.toString()) : '';
                  handleChunkError(msg);
                });
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#f5f7fa] text-slate-800">
        {children}
      </body>
    </html>
  );
}
