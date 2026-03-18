import type { Metadata, Viewport } from "next";
import "./globals.css";

const APP_VERSION = "v0.1";

export const metadata: Metadata = {
  title: "ナレッジDB - 安信工業",
  description: "memo / pocket 横断ナレッジ管理",
  openGraph: {
    title: "ナレッジDB - 安信工業",
    description: "memo / pocket 横断ナレッジ管理",
    siteName: "ナレッジDB",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "ナレッジDB - 安信工業",
    description: "memo / pocket 横断ナレッジ管理",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
            padding: "12px 20px",
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
              ナレッジDB
            </span>
            <span
              style={{
                fontSize: 10,
                color: "#15803d",
                opacity: 0.6,
              }}
            >
              {APP_VERSION}
            </span>
            <span
              style={{
                fontSize: 9,
                color: "#94a3b8",
                opacity: 0.7,
              }}
            >
              ({process.env.NEXT_PUBLIC_COMMIT_SHA ?? "dev"})
            </span>
          </a>
        </header>

        {/* メインコンテンツ */}
        <main
          style={{
            flex: 1,
            padding: "16px 20px 100px",
          }}
        >
          {children}
        </main>

        {/* ボトムナビ */}
        <nav
          style={{
            position: "fixed",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: 600,
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            padding: "8px 0",
            paddingBottom: "calc(8px + env(safe-area-inset-bottom))",
            zIndex: 50,
          }}
        >
          <NavItem href="/" label="ホーム" icon="&#127968;" />
          <NavItem href="/timeline" label="タイムライン" icon="&#128209;" />
          <NavItem href="/clients" label="顧客" icon="&#128101;" />
          <NavItem href="/todos" label="TODO" icon="&#9745;" />
          <NavItem href="/decisions" label="決定事項" icon="&#128221;" />
        </nav>
      </body>
    </html>
  );
}

function NavItem({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  return (
    <a
      href={href}
      style={{
        textDecoration: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        fontSize: 10,
        color: "#64748b",
        padding: "4px 8px",
      }}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span>{label}</span>
    </a>
  );
}
