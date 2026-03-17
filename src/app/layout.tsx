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
  title: "ナレッジDB - 安信工業",
  description: "memo / pocket 横断ナレッジ管理",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <header className="border-b border-green-200 bg-green-700">
          <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
            <a href="/" className="text-lg font-bold text-white">
              ナレッジDB
            </a>
            <a
              href="/timeline"
              className="text-sm text-green-100 hover:text-white"
            >
              タイムライン
            </a>
            <a
              href="/clients"
              className="text-sm text-green-100 hover:text-white"
            >
              顧客一覧
            </a>
            <a
              href="/todos"
              className="text-sm text-green-100 hover:text-white"
            >
              TODO
            </a>
            <a
              href="/decisions"
              className="text-sm text-green-100 hover:text-white"
            >
              決定事項
            </a>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
