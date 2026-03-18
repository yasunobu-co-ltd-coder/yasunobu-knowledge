import type { NextConfig } from "next";
import { execSync } from "child_process";

// ローカル: git rev-parse, Vercel: VERCEL_GIT_COMMIT_SHA
const commitSha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  (() => {
    try {
      return execSync("git rev-parse --short HEAD").toString().trim();
    } catch {
      return "dev";
    }
  })();

const nextConfig: NextConfig = {
  turbopack: undefined,
  env: {
    NEXT_PUBLIC_COMMIT_SHA: commitSha.slice(0, 7),
  },
};

export default nextConfig;
