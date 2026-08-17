// Static output, prerendered. No server, no runtime data fetching.
export const prerender = true;
export const ssr = true;
// The public directory must work with JavaScript disabled. Pages opt back in
// individually if they ever genuinely need it. See docs/delivery.md.
export const csr = false;
