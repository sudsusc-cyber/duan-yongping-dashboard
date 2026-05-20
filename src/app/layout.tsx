import type { Metadata, Viewport } from "next";
import "./globals.css";

const TITLE = "段永平 · 实时持仓 / Duan Yongping — Real-Time Holdings";
const DESC =
  "Duan Yongping · H&H International Investment, LLC · SEC 13F mirror with real-time quotes from Tencent qt.gtimg.cn. Auto-updates daily.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: TITLE,
    description: DESC,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESC,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0c0d10",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500&family=Noto+Sans+SC:wght@300;400;500;600&display=swap"
        />
      </head>
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
