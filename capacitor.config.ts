import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor підхоплює статичний експорт Next.js (`npm run build:mobile` → `out/`).
 * Нативні проєкти створюються командами `npx cap add ios` / `npx cap add android`.
 */
const config: CapacitorConfig = {
  appId: "app.vitalio.mobile",
  appName: "Vitalio",
  webDir: "out",
  backgroundColor: "#121416",
  ios: {
    contentInset: "never", // Safe Area віддаємо CSS (env(safe-area-inset-*))
    scheme: "Vitalio",
  },
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
