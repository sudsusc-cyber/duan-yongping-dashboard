import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "段永平 · H&H 实时持仓看板 / Duan Yongping — H&H Holdings Atlas",
  description:
    "Duan Yongping · H&H International Investment, LLC · SEC EDGAR 13F-HR mirror with real-time quotes, quarterly deltas, and Xueqiu statements.",
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
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&family=Cormorant+SC:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;1,6..72,300;1,6..72,400&family=Noto+Serif+SC:wght@300;400;500;600;700&family=Noto+Sans+SC:wght@300;400;500&family=JetBrains+Mono:wght@300;400;500&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap"
        />
      </head>
      <body className="bg-ink-0 text-bone-100 font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
