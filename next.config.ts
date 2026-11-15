import type { NextConfig } from "next";

/**
 * BUILD_TARGET=mobile  → статичний експорт (`out/`) для Capacitor (iOS / Android WebView).
 * (за замовчуванням)   → стандартна збірка для Web/PWA (Vercel, Node, Docker).
 */
const isMobileBuild = process.env.BUILD_TARGET === "mobile";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    root: process.cwd(),
  },
  output: "export",
};

export default nextConfig;
