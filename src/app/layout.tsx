import "@fontsource-variable/inter/index.css";
import "@fontsource-variable/inter/wght.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/app/providers";

export const metadata: Metadata = {
  title: { default: "Vitalio — калорії без нудьги", template: "%s · Vitalio" },
  description:
    "Підрахунок калорій і БЖВ, трекер води, AI-розпізнавання їжі та прогрес — у зручному застосунку для щоденних звичок.",
  applicationName: "Vitalio",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon.svg" },
  appleWebApp: { capable: true, title: "Vitalio", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  /** `cover` — потрібно, щоб `env(safe-area-inset-*)` працював на iPhone з «чубчиком». */
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f3ef" },
    { media: "(prefers-color-scheme: dark)", color: "#121416" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uk" className="dark" suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
