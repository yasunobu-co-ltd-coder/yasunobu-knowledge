import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopackは日本語パスでクラッシュするため無効化
  turbopack: undefined,
};

export default nextConfig;
