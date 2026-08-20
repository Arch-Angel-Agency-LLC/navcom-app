import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests, against the built output.
 *
 * The layer that was missing. Nine shipped things did not do what they said in one session,
 * and every one of them lived in the gap between "the logic is right" and "the rendered HTML
 * says the words" — a control can be fully wired, fully typed, imported by its page, and
 * simply not on screen, while every other test passes.
 *
 * See `docs/verification.md`.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,

  /**
   * **No retries, anywhere.**
   *
   * A retry turns a flaky test into a passing one and hides the flake. If something here is
   * unreliable it is either the test or the app, and both are worth knowing about.
   */
  retries: 0,

  /** `.only` left in a file must not silently narrow CI to one test. */
  forbidOnly: !!process.env['CI'],

  reporter: process.env['CI'] ? [['github'], ['list']] : [['list']],

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure'
  },

  projects: [
    {
      /**
       * A phone, not a desktop.
       *
       * The device floor is a prepaid Android 8 held one-handed in the dark. Testing at
       * 1280px would pass layouts that no operator will ever see, and this project's whole
       * argument is about what actually reaches a person.
       */
      name: 'phone',
      use: { ...devices['Pixel 5'] }
    }
  ],

  webServer: {
    /**
     * Serves `build/` — exactly what deploys.
     *
     * The same discipline the HTML assertions already follow: testing the source would test
     * something nobody runs.
     */
    command: 'npm run preview -- --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000
  }
});
