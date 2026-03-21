import type { Metadata, Viewport } from "next";
import "./globals.css";
import { UserProvider } from "@/lib/user-context";
import LoginGuard from "@/components/LoginGuard";
import HeaderUser from "@/components/HeaderUser";
import BottomNav from "@/components/BottomNav";

const APP_VERSION = "v0.1";

export const metadata: Metadata = {
  title: "yasunobu-knowledge",
  description: "memo / pocket 横断ナレッジ管理",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "yasunobu-knowledge",
  },
  openGraph: {
    title: "yasunobu-knowledge",
    description: "memo / pocket 横断ナレッジ管理",
    siteName: "yasunobu-knowledge",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "yasunobu-knowledge",
    description: "memo / pocket 横断ナレッジ管理",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#15803d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        style={{
          maxWidth: 600,
          margin: "0 auto",
          minHeight: "100dvh",
          fontFamily:
            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          WebkitFontSmoothing: "antialiased",
          background: "#f8fafc",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <UserProvider>
        <LoginGuard>
          {/* ヘッダー */}
          <header
            style={{
              position: "sticky",
              top: 0,
              zIndex: 50,
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderBottom: "1px solid #e2e8f0",
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <a
              href="/"
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "baseline",
                gap: 6,
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 17,
                  color: "#15803d",
                  letterSpacing: "-0.02em",
                }}
              >
                knowledge
              </span>
            </a>
            <HeaderUser />
          </header>

          {/* メインコンテンツ */}
          <main
            style={{
              flex: 1,
              padding: "16px 20px 120px",
            }}
          >
            {children}
          </main>

          {/* ボトムナビ（未読バッジ付き） */}
          <BottomNav />
        </LoginGuard>
        </UserProvider>
      </body>
    </html>
  );
}

