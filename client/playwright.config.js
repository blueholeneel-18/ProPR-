import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Optional, non-root browser runtime staging.
 *
 * In sandboxed environments where the Chromium system libraries and fontconfig
 * cannot be installed into the system (no root), the required packages can be
 * unpacked into a local staging directory instead. When that directory is
 * present we expose it to the browser subprocesses; when it is absent we fall
 * back to the system's own libraries. This is a no-op on a normal machine.
 *
 * Override the location with `PW_STAGE_DIR`.
 */
function applyLocalBrowserStage() {
  const stageDir = process.env.PW_STAGE_DIR || '/home/node/aptlocal';
  if (!fs.existsSync(stageDir)) return;

  const root = path.join(stageDir, 'root');
  const libDirs = [
    path.join(root, 'usr/lib/x86_64-linux-gnu'),
    path.join(root, 'lib/x86_64-linux-gnu'),
    path.join(root, 'usr/lib/x86_64-linux-gnu/pulseaudio'),
  ].filter((dir) => fs.existsSync(dir));
  if (libDirs.length > 0) {
    const existing = process.env.LD_LIBRARY_PATH || '';
    process.env.LD_LIBRARY_PATH = [...libDirs, existing].filter(Boolean).join(':');
  }

  const fontFile = path.join(stageDir, 'fonts/fonts.conf');
  const fontPath = path.join(root, 'etc/fonts');
  if (fs.existsSync(fontFile) && fs.existsSync(fontPath)) {
    if (!process.env.FONTCONFIG_FILE) process.env.FONTCONFIG_FILE = fontFile;
    if (!process.env.FONTCONFIG_PATH) process.env.FONTCONFIG_PATH = fontPath;
  }
}

applyLocalBrowserStage();

const PORT = Number(process.env.E2E_PORT || 4173);
const baseURL = `http://localhost:${PORT}`;

/**
 * E2E suite configuration.
 *
 * The suite runs against the Vite dev server with every `/api/**` request
 * mocked at the network layer (see `e2e/`), so no backend, database or AI
 * provider is required to execute the scenarios.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list']],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    headless: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
