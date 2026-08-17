import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // Static output only. No server, so no server that knows anything about anyone.
    adapter: adapter({ fallback: undefined, strict: true }),
    prerender: { entries: ['*'] }
  }
};

export default config;
