// Static output, prerendered. No server, no runtime data fetching.
export const prerender = true;
export const ssr = true;
// The public directory must work with JavaScript disabled. Pages opt back in
// individually if they ever genuinely need it. See docs/delivery.md.
export const csr = false;
// Emit directory/index.html rather than directory.html, so the site resolves on any
// static host — including a plain file server that does not guess extensions. The host
// is not chosen yet, so portability wins.
export const trailingSlash = 'always';
