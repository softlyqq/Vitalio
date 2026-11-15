import type { NextConfig } from "next";

/**
 * Статичний експорт (`out/`) для Cloudflare Pages/Workers Static Assets та Capacitor (iOS / Android).
 */
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
