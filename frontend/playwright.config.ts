import { defineConfig, devices } from "@playwright/test";

const MOCK_BACKEND_PORT = 4010;
const APP_PORT = 3100;

/**
 * Pruebas E2E a 320 px (Principio VII) contra la aplicación compilada y un backend simulado,
 * sin red ni proveedor real (Principio II).
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${APP_PORT}`,
    viewport: { width: 320, height: 640 },
    hasTouch: true,
  },
  webServer: [
    {
      command: `node tests/e2e/mock-backend.mts ${MOCK_BACKEND_PORT}`,
      url: `http://127.0.0.1:${MOCK_BACKEND_PORT}/health`,
      reuseExistingServer: !process.env.CI,
    },
    {
      // El mismo servidor standalone que ejecuta la imagen Docker.
      command: "npm run build && cp -r .next/static .next/standalone/.next/ && node .next/standalone/server.js",
      url: `http://127.0.0.1:${APP_PORT}`,
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      env: {
        BACKEND_URL: `http://127.0.0.1:${MOCK_BACKEND_PORT}`,
        PORT: String(APP_PORT),
        HOSTNAME: "127.0.0.1",
      },
    },
  ],
});
