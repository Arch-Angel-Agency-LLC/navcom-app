import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    // The directory CSV and the docs live in the repo root, above web/.
    fs: { allow: ['..'] }
  },
  test: {
    include: ['src/**/*.test.ts']
  }
});
