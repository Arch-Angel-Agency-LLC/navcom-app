/**
 * The Field Terminal is an application, not a page — so client rendering is on here and
 * only here. Everything outside /terminal stays at zero JavaScript, and the budget check
 * enforces that split rather than trusting it.
 */
export const prerender = true;
export const ssr = true;
export const csr = true;
export const trailingSlash = 'always';
